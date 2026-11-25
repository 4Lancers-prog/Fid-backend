import { FilterQuery } from 'mongoose';
import { PaymentSettings, IPaymentSettings } from '../models/PaymentSettings';
import { ManualPayment, IManualPayment, PaymentStatus } from '../models/ManualPayment';
import { AppError } from '../utils/AppError';
import { validateImageDataUrl } from '../utils/file';
import * as walletService from './wallet.service';
import { audit } from '../utils/audit';
import { notify } from './notification.service';

// ---- Admin QR / payment settings (singleton) ----

export async function getSettings(): Promise<IPaymentSettings | null> {
  return PaymentSettings.findOne();
}

/** Public-facing (authenticated) view of the active QR for the recharge screen. */
export async function getActiveSettings() {
  const s = await PaymentSettings.findOne();
  if (!s || !s.active) return { active: false as const };
  return {
    active: true as const,
    qrImage: s.qrImage,
    upiId: s.upiId,
    businessName: s.businessName,
    instructions: s.instructions,
    registrationFeeRupees: s.registrationFeePaise ? s.registrationFeePaise / 100 : undefined,
  };
}

export async function upsertSettings(input: Partial<IPaymentSettings> & { registrationFeeRupees?: number }, adminId: string) {
  const data: Partial<IPaymentSettings> = { ...input };
  if (input.registrationFeeRupees !== undefined) {
    data.registrationFeePaise = Math.round(input.registrationFeeRupees * 100);
    delete (data as { registrationFeeRupees?: number }).registrationFeeRupees;
  }
  if (input.qrImage) {
    const check = validateImageDataUrl(input.qrImage);
    if (!check.ok) throw AppError.badRequest(check.message!, 'INVALID_QR', [{ field: 'qrImage', message: check.message! }]);
  }
  const settings = await PaymentSettings.findOneAndUpdate(
    {},
    { ...data, updatedBy: adminId },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return settings;
}

// ---- Manual payment requests ----

function serialize(p: IManualPayment) {
  return {
    id: p._id.toString(),
    user: p.user,
    amountPaise: p.amount,
    amountRupees: p.amount / 100,
    utr: p.utr,
    proof: p.proof,
    status: p.status,
    remarks: p.remarks,
    reviewedBy: p.reviewedBy,
    reviewedAt: p.reviewedAt,
    createdAt: p.createdAt,
  };
}

export async function createManualPayment(
  userId: string,
  input: { amountRupees: number; utr: string; proof?: string },
) {
  if (input.proof) {
    const check = validateImageDataUrl(input.proof);
    if (!check.ok) throw AppError.badRequest(check.message!, 'INVALID_PROOF', [{ field: 'proof', message: check.message! }]);
  }
  const amount = Math.round(input.amountRupees * 100);

  // Prevent duplicate UTR submissions (unique index is the hard guarantee).
  const existing = await ManualPayment.findOne({ utr: input.utr });
  if (existing) {
    throw AppError.conflict(
      'This transaction reference has already been submitted. Please check the UTR and contact the administrator if you believe this is an error.',
      'DUPLICATE_UTR',
      [{ field: 'utr', message: 'This UTR has already been submitted.' }],
    );
  }

  try {
    const payment = await ManualPayment.create({ user: userId, amount, utr: input.utr, proof: input.proof });
    // IMPORTANT: no wallet credit happens here. Credit occurs only on admin approval.
    return serialize(payment);
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      throw AppError.conflict(
        'This transaction reference has already been submitted.',
        'DUPLICATE_UTR',
        [{ field: 'utr', message: 'This UTR has already been submitted.' }],
      );
    }
    throw err;
  }
}

export async function listMyPayments(userId: string, page = 1, limit = 20) {
  const [docs, total] = await Promise.all([
    ManualPayment.find({ user: userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ManualPayment.countDocuments({ user: userId }),
  ]);
  return { items: docs.map(serialize), total, page, limit };
}

export async function listPayments(opts: { status?: PaymentStatus; page: number; limit: number }) {
  const filter: FilterQuery<IManualPayment> = {};
  if (opts.status) filter.status = opts.status;
  const [docs, total] = await Promise.all([
    ManualPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit)
      .populate('user', 'name email'),
    ManualPayment.countDocuments(filter),
  ]);
  return {
    items: docs.map((d) => ({ ...serialize(d), user: d.user })),
    total,
    page: opts.page,
    limit: opts.limit,
  };
}

/**
 * Approves a pending payment and credits the wallet exactly once. The credit is
 * idempotent (keyed on the payment id) and the status transition guards against
 * double approval.
 */
export async function approvePayment(id: string, adminId: string, remarks?: string) {
  const payment = await ManualPayment.findById(id);
  if (!payment) throw AppError.notFound('Payment request not found.', 'PAYMENT_NOT_FOUND');
  if (payment.status !== 'pending') {
    throw AppError.conflict(`This payment has already been ${payment.status}.`, 'PAYMENT_NOT_PENDING');
  }

  const txn = await walletService.credit(payment.user.toString(), payment.amount, {
    reason: `Wallet recharge approved (UTR ${payment.utr})`,
    reference: payment.utr,
    idempotencyKey: `manualPayment:${payment._id.toString()}`,
    createdBy: adminId,
  });

  payment.status = 'approved';
  payment.remarks = remarks;
  payment.reviewedBy = adminId as unknown as typeof payment.reviewedBy;
  payment.reviewedAt = new Date();
  payment.creditTransaction = txn._id;
  await payment.save();
  await audit({ actorId: adminId, action: 'payment.approve', targetType: 'ManualPayment', targetId: payment._id.toString(), meta: { amountPaise: payment.amount, utr: payment.utr } });
  await notify({ userId: payment.user.toString(), type: 'payment_approved', title: 'Payment verified', message: `Your wallet has been credited ₹${(payment.amount / 100).toFixed(2)}.` });
  return serialize(payment);
}

export async function rejectPayment(id: string, adminId: string, reason: string) {
  const payment = await ManualPayment.findById(id);
  if (!payment) throw AppError.notFound('Payment request not found.', 'PAYMENT_NOT_FOUND');
  if (payment.status !== 'pending') {
    throw AppError.conflict(`This payment has already been ${payment.status}.`, 'PAYMENT_NOT_PENDING');
  }
  payment.status = 'rejected';
  payment.remarks = reason;
  payment.reviewedBy = adminId as unknown as typeof payment.reviewedBy;
  payment.reviewedAt = new Date();
  await payment.save(); // no wallet credit
  await audit({ actorId: adminId, action: 'payment.reject', targetType: 'ManualPayment', targetId: payment._id.toString(), meta: { amountPaise: payment.amount, utr: payment.utr, reason } });
  await notify({ userId: payment.user.toString(), type: 'payment_rejected', title: 'Payment rejected', message: `Your recharge was rejected: ${reason}` });
  return serialize(payment);
}
