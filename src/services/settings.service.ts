import { ServiceSettings, IServiceSettings } from '../models/Settings';

const DEFAULTS = { crop: true, vehicle: true, trailer: true, loan: true };

export async function getServiceSettings(): Promise<{ enabledServices: Record<string, boolean> }> {
  const s = await ServiceSettings.findOne();
  return { enabledServices: { ...DEFAULTS, ...(s?.enabledServices ?? {}) } };
}

export async function updateServiceSettings(
  enabled: Partial<IServiceSettings['enabledServices']>,
  adminId: string,
): Promise<{ enabledServices: Record<string, boolean> }> {
  const current = await ServiceSettings.findOne();
  const merged = { ...DEFAULTS, ...(current?.enabledServices ?? {}), ...enabled };
  const s = await ServiceSettings.findOneAndUpdate(
    {},
    { enabledServices: merged, updatedBy: adminId },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return { enabledServices: s.enabledServices };
}
