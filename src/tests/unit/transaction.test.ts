import { describe, it, expect, afterEach } from 'vitest';
import { withTransaction, setTransactionsSupported, transactionsSupported } from '../../utils/transaction';

afterEach(() => setTransactionsSupported(false));

describe('withTransaction (fallback path)', () => {
  it('defaults to unsupported', () => {
    expect(transactionsSupported()).toBe(false);
  });

  it('runs the callback once with no session when transactions are unsupported', async () => {
    setTransactionsSupported(false);
    let calls = 0;
    let receivedSession: unknown = 'unset';
    const result = await withTransaction(async (session) => {
      calls++;
      receivedSession = session;
      return 42;
    });
    expect(result).toBe(42);
    expect(calls).toBe(1);
    expect(receivedSession).toBeUndefined();
  });

  it('propagates errors from the callback', async () => {
    setTransactionsSupported(false);
    await expect(withTransaction(async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');
  });

  it('reflects the support flag', () => {
    setTransactionsSupported(true);
    expect(transactionsSupported()).toBe(true);
    setTransactionsSupported(false);
    expect(transactionsSupported()).toBe(false);
  });
});
