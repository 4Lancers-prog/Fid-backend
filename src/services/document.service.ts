import { FilterQuery } from 'mongoose';
import { DocumentFile, IDocumentFile } from '../models/DocumentFile';
import { AppError } from '../utils/AppError';
import { validateDocumentDataUrl } from '../utils/documentValidation';
import { audit } from '../utils/audit';
import { UserRole } from '../models/User';

interface Actor {
  id: string;
  role: UserRole;
  name: string;
}

function serialize(d: IDocumentFile, includeData = false) {
  return {
    id: d._id.toString(),
    fileName: d.fileName,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    category: d.category,
    farmer: d.farmer,
    createdBy: d.createdBy,
    createdAt: d.createdAt,
    ...(includeData ? { data: d.data } : {}),
  };
}

export async function createDocument(input: { fileName: string; data: string; category?: string; farmer?: string }, actor: Actor) {
  const check = validateDocumentDataUrl(input.data);
  if (!check.ok) {
    throw AppError.badRequest(check.message!, 'INVALID_DOCUMENT', [{ field: 'data', message: check.message! }]);
  }
  const doc = await DocumentFile.create({
    fileName: input.fileName,
    mimeType: check.mime,
    sizeBytes: check.bytes,
    category: input.category,
    farmer: input.farmer || undefined,
    data: input.data,
    createdBy: actor.id,
  });
  await audit({ actorId: actor.id, actorName: actor.name, action: 'document.upload', targetType: 'DocumentFile', targetId: doc.id, meta: { fileName: doc.fileName, mimeType: doc.mimeType } });
  return serialize(doc);
}

export async function listDocuments(actor: Actor, opts: { farmer?: string; page: number; limit: number }) {
  const filter: FilterQuery<IDocumentFile> = {};
  // Non-admins only see their own uploads.
  if (actor.role !== 'admin' && actor.role !== 'super_admin') filter.createdBy = actor.id;
  if (opts.farmer) filter.farmer = opts.farmer;

  const [docs, total] = await Promise.all([
    DocumentFile.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * opts.limit).limit(opts.limit),
    DocumentFile.countDocuments(filter),
  ]);
  return { items: docs.map((d) => serialize(d)), total, page: opts.page, limit: opts.limit };
}

/** Returns a single document including its file data, enforcing ownership. */
export async function getDocument(id: string, actor: Actor) {
  const doc = await DocumentFile.findById(id).select('+data');
  if (!doc) throw AppError.notFound('Document not found.', 'DOCUMENT_NOT_FOUND');
  const isOwner = doc.createdBy.toString() === actor.id;
  const isAdmin = actor.role === 'admin' || actor.role === 'super_admin';
  if (!isOwner && !isAdmin) throw AppError.forbidden();
  return serialize(doc, true);
}

export async function deleteDocument(id: string, actor: Actor) {
  const doc = await DocumentFile.findById(id).select('createdBy fileName');
  if (!doc) throw AppError.notFound('Document not found.', 'DOCUMENT_NOT_FOUND');
  const isOwner = doc.createdBy.toString() === actor.id;
  const isAdmin = actor.role === 'admin' || actor.role === 'super_admin';
  if (!isOwner && !isAdmin) throw AppError.forbidden();
  await doc.deleteOne();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'document.delete', targetType: 'DocumentFile', targetId: id });
  return { id };
}
