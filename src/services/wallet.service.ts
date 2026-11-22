import { Types, ClientSession } from 'mongoose';
import { Wallet, IWallet } from '../models/Wallet';
import { Transaction, ITransaction } from '../models/Transaction';
import { AppError } from '../utils/AppError';
import { withTransaction } from '../utils/transaction';

interface MovementOptions {
  reason: string;
  reference?: string;
  idempotencyKey?: string;
  createdBy?: string;
}

/** Ensures a wallet document exists for a user and returns it. */
export async function getOrCreateWallet(userId: string): Promise<IWallet> {
  const existing = await Wallet.findOne({ user: userId });
  if (existing) return existing;
  return Wallet.create({ user: userId, balance: 0 });
}

export async function getWalletSummary(userId: string): Promise<{ balance: number; wallet: IWallet }> {
  const wallet = await getOrCreateWallet(userId);
  return { balance: wallet.balance, wallet };
}

export async function listTransactions(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ items: ITransaction[]; total: number; page: number; limit: number }> {
  const wallet = await getOrCreateWallet(userId);
  const [items, total] = await Promise.all([
    Transaction.find({ wallet: wallet._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments({ wallet: wallet._id }),
  ]);
  return { items, total, page, limit };
}

async function findExistingByKey(key?: string): Promise<ITransaction | null> {
  if (!key) return null;
  return Transaction.findOne({ idempotencyKey: key });
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/**
 * Credits a wallet atomically. Amount is in paise and must be positive. The
 * balance update and the ledger entry are grouped in a transaction when the
 * server supports it; otherwise they run with the same atomic document guards
 * as before. Idempotent on `idempotencyKey`.
 */
export async function credit(userId: string, amount: number, opts: MovementOptions): Promise<ITransaction> {
  if (amount <= 0) throw AppError.badRequest('Credit amount must be greater than zero.', 'INVALID_AMOUNT');

  const existing = await findExistingByKey(opts.idempotencyKey);
  if (existing) return existing; // Idempotent: do not double-credit.

  try {
    return await withTransaction(async (session) => {
      const wallet = await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { balance: amount } },
        { new: true, upsert: true, session },
      );
      try {
        const [txn] = await Transaction.create(
          [
            {
              wallet: wallet._id,
              user: userId,
              type: 'credit',
              amount,
              balanceAfter: wallet.balance,
              reason: opts.reason,
              reference: opts.reference,
              idempotencyKey: opts.idempotencyKey,
              createdBy: opts.createdBy ? new Types.ObjectId(opts.createdBy) : undefined,
            },
          ],
          { session: session ?? undefined },
        );
        return txn;
      } catch (err) {
        // Standalone path: no transaction to roll back the increment, so undo it manually.
        if (isDuplicateKey(err) && !session) {
          await Wallet.updateOne({ user: userId }, { $inc: { balance: -amount } });
        }
        throw err; // Transaction path: rethrow aborts and rolls back automatically.
      }
    });
  } catch (err) {
    if (isDuplicateKey(err) && opts.idempotencyKey) {
      const already = await findExistingByKey(opts.idempotencyKey);
      if (already) return already;
    }
    throw err;
  }
}

/**
 * Debits a wallet atomically. The conditional filter guarantees the balance can
 * never go negative and prevents concurrent double-spends at the document level,
 * on both standalone and replica-set deployments.
 */
export async function debit(userId: string, amount: number, opts: MovementOptions): Promise<ITransaction> {
  if (amount <= 0) throw AppError.badRequest('Debit amount must be greater than zero.', 'INVALID_AMOUNT');

  const existing = await findExistingByKey(opts.idempotencyKey);
  if (existing) return existing; // Idempotent: do not double-debit.

  try {
    return await withTransaction(async (session) => {
      const wallet = await Wallet.findOneAndUpdate(
        { user: userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session },
      );

      if (!wallet) {
        const current = await getOrCreateWallet(userId);
        throw new AppError(
          402,
          'INSUFFICIENT_BALANCE',
          `Your wallet balance is ₹${(current.balance / 100).toFixed(2)}, but this service requires ₹${(amount / 100).toFixed(2)}. Please recharge your wallet before continuing.`,
        );
      }

      try {
        const [txn] = await Transaction.create(
          [
            {
              wallet: wallet._id,
              user: userId,
              type: 'debit',
              amount: -amount,
              balanceAfter: wallet.balance,
              reason: opts.reason,
              reference: opts.reference,
              idempotencyKey: opts.idempotencyKey,
            },
          ],
          { session: session ?? undefined },
        );
        return txn;
      } catch (err) {
        if (isDuplicateKey(err) && !session) {
          await Wallet.updateOne({ user: userId }, { $inc: { balance: amount } }); // undo
        }
        throw err;
      }
    });
  } catch (err) {
    if (isDuplicateKey(err) && opts.idempotencyKey) {
      const already = await findExistingByKey(opts.idempotencyKey);
      if (already) return already;
    }
    throw err;
  }
}

// Re-exported for callers that pass a session-bound flow in the future.
export type { ClientSession };
