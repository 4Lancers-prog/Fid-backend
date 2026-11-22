import { User, hashPassword, UserRole } from '../models/User';
import { AppError } from '../utils/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { getOrCreateWallet } from './wallet.service';
import { validateImageDataUrl } from '../utils/file';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

function issueTokens(user: { id: string; role: UserRole; name: string; tokenVersion: number }): Tokens {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, name: user.name }),
    refreshToken: signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion }),
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}): Promise<{ user: unknown; tokens: Tokens }> {
  const exists = await User.findOne({ email: input.email });
  if (exists) {
    throw AppError.conflict('An account with this email already exists.', 'EMAIL_TAKEN', [
      { field: 'email', message: 'This email is already registered.' },
    ]);
  }
  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role ?? 'operator',
  });
  await getOrCreateWallet(user.id);
  const tokens = issueTokens({ id: user.id, role: user.role, name: user.name, tokenVersion: user.tokenVersion });
  return { user: user.toJSON(), tokens };
}

export async function requestRegistration(input: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  paymentUtr?: string;
  paymentAmountRupees?: number;
  paymentProof?: string;
}): Promise<unknown> {
  const exists = await User.findOne({ email: input.email });
  if (exists) {
    throw AppError.conflict('An account with this email already exists.', 'EMAIL_TAKEN', [
      { field: 'email', message: 'This email is already registered.' },
    ]);
  }
  // Registration-fee payment (optional; required by the form when a QR is published).
  if (input.paymentUtr) {
    const dupUtr = await User.findOne({ registrationPaymentUtr: input.paymentUtr });
    if (dupUtr) {
      throw AppError.conflict(
        'This transaction reference has already been used. Please check the UTR.',
        'DUPLICATE_UTR',
        [{ field: 'paymentUtr', message: 'This UTR has already been submitted.' }],
      );
    }
  }
  if (input.paymentProof) {
    const check = validateImageDataUrl(input.paymentProof);
    if (!check.ok) throw AppError.badRequest(check.message!, 'INVALID_PROOF', [{ field: 'paymentProof', message: check.message! }]);
  }

  const passwordHash = await hashPassword(input.password);
  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      passwordHash,
      role: 'operator',
      isActive: false,
      approvalStatus: 'pending',
      registrationPaymentUtr: input.paymentUtr,
      registrationPaymentAmount: input.paymentAmountRupees ? Math.round(input.paymentAmountRupees * 100) : undefined,
      registrationPaymentProof: input.paymentProof,
    });
    await getOrCreateWallet(user.id);
    return user.toJSON();
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      throw AppError.conflict('This transaction reference has already been used.', 'DUPLICATE_UTR', [
        { field: 'paymentUtr', message: 'This UTR has already been submitted.' },
      ]);
    }
    throw err;
  }
}

/** Public: the active QR shown on the registration page (visitor isn't logged in yet). */
export async function getRegistrationQr() {
  const { getActiveSettings } = await import('./payment.service');
  return getActiveSettings();
}

export async function loginUser(email: string, password: string): Promise<{ user: unknown; tokens: Tokens }> {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw AppError.unauthorized('Invalid email or password. Please check your details and try again.', 'INVALID_CREDENTIALS');
  }
  const ok = await user.comparePassword(password);
  if (!ok) {
    throw AppError.unauthorized('Invalid email or password. Please check your details and try again.', 'INVALID_CREDENTIALS');
  }
  // Only reveal account-state messages after the password is verified.
  if (user.approvalStatus === 'pending') {
    throw new AppError(403, 'PENDING_APPROVAL', 'Your account is awaiting administrator approval. You will be able to sign in once it is approved.');
  }
  if (user.approvalStatus === 'rejected') {
    throw new AppError(403, 'REGISTRATION_REJECTED', 'Your registration was not approved. Please contact the administrator.');
  }
  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled. Please contact your administrator.');
  }
  await getOrCreateWallet(user.id);
  const tokens = issueTokens({ id: user.id, role: user.role, name: user.name, tokenVersion: user.tokenVersion });
  return { user: user.toJSON(), tokens };
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Your session has expired. Please log in again to continue.', 'REFRESH_INVALID');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw AppError.unauthorized('Your session is no longer valid. Please log in again.', 'REFRESH_REVOKED');
  }
  return issueTokens({ id: user.id, role: user.role, name: user.name, tokenVersion: user.tokenVersion });
}

/** Invalidates all existing refresh tokens for a user (logout / force sign-out). */
export async function revokeTokens(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

export async function getCurrentUser(userId: string): Promise<unknown> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
  return user.toJSON();
}
