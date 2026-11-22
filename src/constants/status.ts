/** Shared application lifecycle statuses used across all service modules. */
export const APPLICATION_STATUSES = [
  'new',
  'pending',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses counted as "pending-ish" vs terminal, for dashboard aggregation. */
export const OPEN_STATUSES: ApplicationStatus[] = ['new', 'pending', 'in_progress'];
