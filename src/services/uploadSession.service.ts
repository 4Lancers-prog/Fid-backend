import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { signUploadToken, verifyUploadToken } from '../utils/jwt';
import * as documentService from './document.service';

/** Creates a short-lived token the phone uses to upload documents for this user. */
export function createSession(userId: string): { token: string; expiresInMinutes: number } {
  return { token: signUploadToken(userId), expiresInMinutes: 30 };
}

async function resolveUser(token: string) {
  let payload;
  try {
    payload = verifyUploadToken(token);
  } catch {
    throw AppError.unauthorized('This upload link has expired. Please generate a new QR code.', 'UPLOAD_TOKEN_INVALID');
  }
  const user = await User.findById(payload.sub).select('name role');
  if (!user) throw AppError.notFound('Account not found.', 'USER_NOT_FOUND');
  return user;
}

/** Public: what the phone page shows — whose session + which docs are already uploaded. */
export async function sessionInfo(token: string) {
  const user = await resolveUser(token);
  const docs = await documentService.listDocuments(
    { id: user.id, role: user.role, name: user.name },
    { page: 1, limit: 100 },
  );
  return { valid: true as const, userName: user.name, documents: docs.items };
}

/** Public (token-authenticated): upload a document that is mapped to the session's user. */
export async function uploadViaToken(token: string, input: { fileName: string; data: string; category?: string }) {
  const user = await resolveUser(token);
  return documentService.createDocument(input, { id: user.id, role: user.role, name: user.name });
}
