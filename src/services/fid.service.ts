import { FilterQuery } from 'mongoose';
import { FidRecord, IFidRecord } from '../models/FidRecord';
import { Farmer } from '../models/Farmer';
import { AppError } from '../utils/AppError';
import { maskAadhaar } from '../utils/mask';
import * as walletService from './wallet.service';

/** Price (in paise) charged to generate/print one FID card. ₹5.00. */
export const FID_CARD_FEE_PAISE = 500;

function serialize(r: IFidRecord) {
  return {
    id: r._id.toString(),
    farmer: r.farmer.toString(),
    name: r.name,
    gender: r.gender,
    aadhaarMasked: maskAadhaar(r.aadhaarLast4),
    fid: r.fid,
    address: r.address,
    photo: r.photo,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  };
}

/**
 * Generates an FID card record from an existing farmer profile. Debits the
 * wallet atomically BEFORE creating the record, using a per-generation
 * idempotency key so a retried request can never be charged twice.
 */
export async function generateFid(farmerId: string, userId: string, photoOverride?: string) {
  const farmer = await Farmer.findById(farmerId);
  if (!farmer) {
    throw AppError.notFound(
      'The selected farmer profile could not be found. Please verify the farmer details before generating a card.',
      'FARMER_NOT_FOUND',
    );
  }

  const idempotencyKey = `fid:${farmerId}:${userId}:${Date.now()}`;
  await walletService.debit(userId, FID_CARD_FEE_PAISE, {
    reason: `FID card generation for ${farmer.name} (${farmer.fid})`,
    reference: farmer.fid,
    idempotencyKey,
  });

  const record = await FidRecord.create({
    farmer: farmer._id,
    name: farmer.name,
    gender: farmer.gender,
    aadhaarLast4: farmer.aadhaarLast4,
    fid: farmer.fid,
    address: farmer.address,
    photo: photoOverride ?? farmer.photo,
    createdBy: userId,
  });

  return serialize(record);
}

export async function listFid(opts: { search?: string; page: number; limit: number }) {
  const filter: FilterQuery<IFidRecord> = {};
  if (opts.search) {
    const rx = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { fid: rx }];
  }
  const [docs, total] = await Promise.all([
    FidRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit),
    FidRecord.countDocuments(filter),
  ]);
  return { items: docs.map(serialize), total, page: opts.page, limit: opts.limit };
}

export async function getFid(id: string) {
  const record = await FidRecord.findById(id);
  if (!record) throw AppError.notFound('FID record not found.', 'FID_NOT_FOUND');
  return serialize(record);
}
