import { FilterQuery } from 'mongoose';
import { Farmer, IFarmer } from '../models/Farmer';
import { FarmerHistory } from '../models/FarmerHistory';
import { AppError } from '../utils/AppError';
import { encrypt, blindIndex } from '../utils/crypto';
import { maskAadhaar } from '../utils/mask';
import { audit } from '../utils/audit';
import { CreateFarmerInput, UpdateFarmerInput } from '../validators/farmer.validator';

interface Actor {
  id: string;
  name: string;
}

/** Shapes a farmer for API responses: never includes full Aadhaar. */
export function serializeFarmer(f: IFarmer) {
  return {
    id: f._id.toString(),
    name: f.name,
    gender: f.gender,
    aadhaarMasked: maskAadhaar(f.aadhaarLast4),
    aadhaarLast4: f.aadhaarLast4,
    fid: f.fid,
    mobile: f.mobile,
    address: f.address,
    village: f.village,
    taluk: f.taluk,
    district: f.district,
    photo: f.photo,
    createdBy: f.createdBy,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

const TRACKED_FIELDS = ['name', 'gender', 'fid', 'mobile', 'address', 'village', 'taluk', 'district'] as const;

export async function createFarmer(input: CreateFarmerInput, actor: Actor) {
  const aadhaarHash = blindIndex(input.aadhaarNumber);
  const duplicate = await Farmer.findOne({ aadhaarHash });
  if (duplicate) {
    throw AppError.conflict(
      'This Aadhaar number is already associated with an existing farmer profile. Open the existing profile or verify the details before creating a new record.',
      'FARMER_DUPLICATE',
      [{ field: 'aadhaarNumber', message: 'A farmer with this Aadhaar already exists.' }],
    );
  }

  const farmer = await Farmer.create({
    name: input.name,
    gender: input.gender,
    aadhaarEnc: encrypt(input.aadhaarNumber),
    aadhaarLast4: input.aadhaarNumber.slice(-4),
    aadhaarHash,
    fid: input.fid,
    mobile: input.mobile,
    address: input.address,
    village: input.village,
    taluk: input.taluk,
    district: input.district,
    photo: input.photo,
    createdBy: actor.id,
  });

  await FarmerHistory.create({
    farmer: farmer._id,
    changedBy: actor.id,
    changedByName: actor.name,
    action: 'create',
    changes: [
      { field: 'name', to: farmer.name },
      { field: 'fid', to: farmer.fid },
    ],
  });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'farmer.create', targetType: 'Farmer', targetId: farmer.id });
  return serializeFarmer(farmer);
}

export async function listFarmers(opts: { search?: string; page: number; limit: number }) {
  const filter: FilterQuery<IFarmer> = {};
  if (opts.search) {
    const rx = new RegExp(escapeRegex(opts.search), 'i');
    filter.$or = [{ name: rx }, { fid: rx }, { mobile: rx }, { village: rx }, { district: rx }];
  }
  const [docs, total] = await Promise.all([
    Farmer.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * opts.limit).limit(opts.limit),
    Farmer.countDocuments(filter),
  ]);
  return { items: docs.map(serializeFarmer), total, page: opts.page, limit: opts.limit };
}

export async function getFarmer(id: string) {
  const farmer = await Farmer.findById(id);
  if (!farmer) throw AppError.notFound('Farmer profile not found.', 'FARMER_NOT_FOUND');
  return serializeFarmer(farmer);
}

export async function updateFarmer(id: string, input: UpdateFarmerInput, actor: Actor) {
  const farmer = await Farmer.findById(id);
  if (!farmer) throw AppError.notFound('Farmer profile not found.', 'FARMER_NOT_FOUND');

  const doc = farmer as unknown as Record<string, unknown>;
  const src = input as unknown as Record<string, unknown>;
  const changes: { field: string; from?: string; to?: string }[] = [];

  for (const field of TRACKED_FIELDS) {
    if (src[field] !== undefined && String(src[field] ?? '') !== String(doc[field] ?? '')) {
      changes.push({ field, from: (doc[field] as string) ?? '', to: (src[field] as string) ?? '' });
      doc[field] = src[field];
    }
  }
  if (src.photo !== undefined && src.photo !== doc.photo) {
    doc.photo = src.photo;
    changes.push({ field: 'photo', from: '(image)', to: '(updated image)' });
  }

  doc.updatedBy = actor.id;
  await farmer.save();

  if (changes.length) {
    await FarmerHistory.create({ farmer: farmer._id, changedBy: actor.id, changedByName: actor.name, action: 'update', changes });
    await audit({ actorId: actor.id, actorName: actor.name, action: 'farmer.update', targetType: 'Farmer', targetId: farmer.id, meta: { fields: changes.map((c) => c.field) } });
  }
  return serializeFarmer(farmer);
}

export async function getFarmerHistory(id: string) {
  const farmer = await Farmer.findById(id).select('_id');
  if (!farmer) throw AppError.notFound('Farmer profile not found.', 'FARMER_NOT_FOUND');
  const history = await FarmerHistory.find({ farmer: id }).sort({ createdAt: -1 }).limit(100).populate('changedBy', 'name');
  return history.map((h) => ({
    id: h._id.toString(),
    action: h.action,
    changedByName: h.changedByName ?? (typeof h.changedBy === 'object' && h.changedBy ? (h.changedBy as unknown as { name?: string }).name : undefined),
    changes: h.changes,
    at: h.createdAt,
  }));
}

/**
 * Compliant existence check used by the assisted FRUITS/K-Kisan workflow: given
 * a verified Aadhaar transcribed by the user, report whether a profile already
 * exists (so it can be reused) without exposing the full number anywhere.
 */
export async function lookupByAadhaar(aadhaar: string) {
  const hash = blindIndex(aadhaar);
  const farmer = await Farmer.findOne({ aadhaarHash: hash });
  return { exists: !!farmer, farmer: farmer ? serializeFarmer(farmer) : null };
}

export async function deleteFarmer(id: string) {
  const res = await Farmer.findByIdAndDelete(id);
  if (!res) throw AppError.notFound('Farmer profile not found.', 'FARMER_NOT_FOUND');
  return { id };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
