import { TempUpload } from '../models/TempUpload';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { signUploadToken, verifyUploadToken } from '../utils/jwt';

/** Creates a short-lived token; the QR encodes a link carrying it. */
export function createSession(userId: string): { token: string; expiresInMinutes: number } {
  return { token: signUploadToken(userId), expiresInMinutes: 120 };
}

function resolve(token: string): { sub: string; sid: string } {
  try {
    return verifyUploadToken(token);
  } catch {
    throw AppError.unauthorized('This upload link has expired. Please generate a new QR code.', 'UPLOAD_TOKEN_INVALID');
  }
}

/** Public: the phone page + the website read the session's TEMPORARY uploads. */
export async function sessionInfo(token: string) {
  const { sub, sid } = resolve(token);
  const user = await User.findById(sub).select('name');
  const docs = await TempUpload.find({ sessionId: sid }).sort({ createdAt: 1 });
  return {
    valid: true as const,
    userName: user?.name ?? 'Upload',
    documents: docs.map((d) => ({
      id: d._id.toString(),
      fileName: d.fileName,
      category: d.category,
      data: d.data,
      createdAt: d.createdAt,
    })),
  };
}

/** Public (token-authenticated): store a document TEMPORARILY for printing. */
export async function uploadViaToken(token: string, input: { fileName: string; data: string; category?: string }) {
  const { sid } = resolve(token);
  if (!/^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,/.test(input.data)) {
    throw AppError.badRequest('Unsupported file. Upload a JPG, PNG, WEBP or PDF.', 'INVALID_FILE');
  }
  const doc = await TempUpload.create({ sessionId: sid, fileName: input.fileName, data: input.data, category: input.category });
  return { id: doc._id.toString(), fileName: doc.fileName, category: doc.category };
}

/** Clears all temporary uploads for the session (e.g. after printing). */
export async function clearSession(token: string): Promise<{ removed: number }> {
  const { sid } = resolve(token);
  const res = await TempUpload.deleteMany({ sessionId: sid });
  return { removed: res.deletedCount ?? 0 };
}
