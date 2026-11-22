import { FilterQuery } from 'mongoose';
import { User, IUser, hashPassword, UserRole } from '../models/User';
import { ApprovalStatus } from '../models/User';
import { AppError } from '../utils/AppError';
import { getOrCreateWallet } from './wallet.service';
import { audit } from '../utils/audit';

interface Actor {
  id: string;
  role: UserRole;
  name: string;
}

const isElevated = (role: UserRole) => role === 'admin' || role === 'super_admin';

/** Enforces who may manage whom. Admins cannot touch admin/super_admin accounts. */
function assertCanManage(actor: Actor, targetRole: UserRole, desiredRole?: UserRole): void {
  if (actor.role === 'super_admin') return;
  if (isElevated(targetRole) || (desiredRole && isElevated(desiredRole))) {
    throw AppError.forbidden('Only a Super Admin can manage administrator accounts or assign elevated roles.');
  }
}

export async function listUsers(opts: { search?: string; role?: UserRole; approvalStatus?: ApprovalStatus; page: number; limit: number }) {
  const filter: FilterQuery<IUser> = {};
  if (opts.role) filter.role = opts.role;
  if (opts.approvalStatus) filter.approvalStatus = opts.approvalStatus;
  if (opts.search) {
    const rx = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [docs, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * opts.limit).limit(opts.limit),
    User.countDocuments(filter),
  ]);
  return { items: docs.map((d) => serializeUser(d)), total, page: opts.page, limit: opts.limit };
}

export async function getUser(id: string) {
  const user = await User.findById(id).select('+registrationPaymentProof');
  if (!user) throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
  return serializeUser(user, true);
}

/** Adds a rupee view of the registration payment; includes the proof only when asked. */
function serializeUser(user: IUser, includeProof = false) {
  const json = user.toJSON() as Record<string, unknown>;
  if (user.registrationPaymentAmount != null) {
    json.registrationPaymentAmountRupees = user.registrationPaymentAmount / 100;
  }
  if (includeProof && user.registrationPaymentProof) {
    json.registrationPaymentProof = user.registrationPaymentProof;
  }
  return json;
}

export async function adminCreateUser(actor: Actor, input: { name: string; email: string; password: string; role: UserRole }) {
  assertCanManage(actor, input.role, input.role);
  const exists = await User.findOne({ email: input.email });
  if (exists) {
    throw AppError.conflict('An account with this email already exists.', 'EMAIL_TAKEN', [
      { field: 'email', message: 'This email is already registered.' },
    ]);
  }
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
  });
  await getOrCreateWallet(user.id);
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user.create', targetType: 'User', targetId: user.id, meta: { role: user.role } });
  return user.toJSON();
}

export async function updateUser(actor: Actor, id: string, patch: { name?: string; role?: UserRole; isActive?: boolean }) {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found.', 'USER_NOT_FOUND');

  const changingRoleOrStatus = patch.role !== undefined || patch.isActive !== undefined;
  if (id === actor.id && changingRoleOrStatus) {
    throw AppError.forbidden('You cannot change your own role or active status.');
  }
  assertCanManage(actor, user.role, patch.role);

  // Prevent removing the last active super admin.
  if ((patch.role && patch.role !== 'super_admin' && user.role === 'super_admin') || (patch.isActive === false && user.role === 'super_admin')) {
    const activeSupers = await User.countDocuments({ role: 'super_admin', isActive: true });
    if (activeSupers <= 1) {
      throw AppError.badRequest('At least one active Super Admin must remain.', 'LAST_SUPER_ADMIN');
    }
  }

  if (patch.name !== undefined) user.name = patch.name;
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.isActive !== undefined) user.isActive = patch.isActive;
  // Role/status changes revoke existing sessions for safety.
  if (changingRoleOrStatus) user.tokenVersion += 1;
  await user.save();

  await audit({ actorId: actor.id, actorName: actor.name, action: 'user.update', targetType: 'User', targetId: user.id, meta: patch });
  return user.toJSON();
}

export async function approveUser(actor: Actor, id: string, role?: UserRole) {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
  assertCanManage(actor, user.role, role);
  user.approvalStatus = 'approved';
  user.isActive = true;
  if (role) user.role = role;
  await user.save();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user.approve', targetType: 'User', targetId: user.id, meta: { role: user.role } });
  return user.toJSON();
}

export async function rejectUser(actor: Actor, id: string) {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
  assertCanManage(actor, user.role);
  user.approvalStatus = 'rejected';
  user.isActive = false;
  await user.save();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user.reject', targetType: 'User', targetId: user.id });
  return user.toJSON();
}

export async function resetUserPassword(actor: Actor, id: string, newPassword: string) {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
  assertCanManage(actor, user.role);
  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1; // force re-login everywhere
  await user.save();
  await audit({ actorId: actor.id, actorName: actor.name, action: 'user.reset_password', targetType: 'User', targetId: user.id });
  return { id: user.id };
}
