import { Farmer } from '../models/Farmer';
import { FidRecord } from '../models/FidRecord';
import { DocumentFile } from '../models/DocumentFile';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { ManualPayment } from '../models/ManualPayment';
import { CropApplication } from '../models/CropApplication';
import { VehicleApplication } from '../models/VehicleApplication';
import { TrailerApplication } from '../models/TrailerApplication';
import { LoanLead } from '../models/LoanLead';
import { APPLICATION_STATUSES, ApplicationStatus } from '../constants/status';

const MODULES = [
  { type: 'crop', label: 'Crop Insurance', model: CropApplication },
  { type: 'vehicle', label: 'Vehicle Insurance', model: VehicleApplication },
  { type: 'trailer', label: 'Trailer Certificate', model: TrailerApplication },
  { type: 'loan', label: 'Loan Leads', model: LoanLead },
] as const;

async function statusCountsFor(model: (typeof MODULES)[number]['model']): Promise<Record<string, number>> {
  const rows = await model.aggregate<{ _id: string; c: number }>([{ $group: { _id: '$status', c: { $sum: 1 } } }]);
  const out: Record<string, number> = {};
  rows.forEach((r) => (out[r._id] = r.c));
  return out;
}

export async function getReports() {
  const [
    farmers,
    fidCards,
    documents,
    users,
    perModuleStatus,
    txnByType,
    paymentsByStatus,
    approvedPayments,
  ] = await Promise.all([
    Farmer.countDocuments(),
    FidRecord.countDocuments(),
    DocumentFile.countDocuments(),
    User.countDocuments(),
    Promise.all(MODULES.map((m) => statusCountsFor(m.model))),
    Transaction.aggregate<{ _id: string; total: number }>([{ $group: { _id: '$type', total: { $sum: '$amount' } } }]),
    ManualPayment.aggregate<{ _id: string; c: number }>([{ $group: { _id: '$status', c: { $sum: 1 } } }]),
    ManualPayment.aggregate<{ _id: null; total: number }>([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  // Applications by status (summed across modules) and by type.
  const byStatus: Record<ApplicationStatus, number> = Object.fromEntries(
    APPLICATION_STATUSES.map((s) => [s, 0]),
  ) as Record<ApplicationStatus, number>;
  const byType = MODULES.map((m, i) => {
    const counts = perModuleStatus[i];
    let total = 0;
    APPLICATION_STATUSES.forEach((s) => {
      const c = counts[s] ?? 0;
      byStatus[s] += c;
      total += c;
    });
    return { type: m.type, label: m.label, total };
  });

  // Wallet money movement (paise). Credits are positive, debits negative.
  let credited = 0;
  let debited = 0;
  txnByType.forEach((t) => {
    if (t._id === 'debit') debited += Math.abs(t.total);
    else credited += t.total; // credit + adjustment
  });

  const paymentCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  paymentsByStatus.forEach((p) => (paymentCounts[p._id] = p.c));

  return {
    totals: { farmers, fidCards, documents, users },
    applicationsByStatus: byStatus,
    applicationsByType: byType,
    payments: {
      counts: paymentCounts,
      approvedAmountPaise: approvedPayments[0]?.total ?? 0,
    },
    wallet: {
      creditedPaise: credited,
      debitedPaise: debited,
      netPaise: credited - debited,
    },
  };
}
