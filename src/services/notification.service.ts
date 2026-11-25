import { Notification, INotification } from '../models/Notification';
import { User } from '../models/User';
import { logger } from '../utils/logger';

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
}

/** Creates an in-app notification. Never throws into the caller. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await Notification.create({
      user: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      meta: input.meta,
    });
  } catch (err) {
    logger.error('Failed to create notification', err);
  }
}

/** Notifies every active admin / super admin (e.g. a new application to review). */
export async function notifyAdmins(input: { type: string; title: string; message: string; meta?: Record<string, unknown> }): Promise<void> {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] }, isActive: true }).select('_id');
    await Promise.all(
      admins.map((a) =>
        Notification.create({ user: a._id, type: input.type, title: input.title, message: input.message, meta: input.meta }),
      ),
    );
  } catch (err) {
    logger.error('Failed to notify admins', err);
  }
}

export async function listForUser(userId: string, page = 1, limit = 20) {
  const [items, total, unread] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments({ user: userId }),
    Notification.countDocuments({ user: userId, read: false }),
  ]);
  return { items, total, unread, page, limit };
}

export async function markRead(id: string, userId: string): Promise<INotification | null> {
  return Notification.findOneAndUpdate({ _id: id, user: userId }, { read: true }, { new: true });
}

export async function markAllRead(userId: string): Promise<{ updated: number }> {
  const res = await Notification.updateMany({ user: userId, read: false }, { read: true });
  return { updated: res.modifiedCount ?? 0 };
}
