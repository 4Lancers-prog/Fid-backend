import { Model } from 'mongoose';
import { CropApplication } from '../models/CropApplication';
import { VehicleApplication } from '../models/VehicleApplication';
import { TrailerApplication } from '../models/TrailerApplication';
import { LoanLead } from '../models/LoanLead';
import { AppError } from '../utils/AppError';
import { ApplicationStatus } from '../constants/status';
import { cropService, vehicleService, trailerService, loanService } from './applications.service';

interface Registry {
  type: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  nameField: string;
  mobileField: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: { updateStatus: (id: string, status: ApplicationStatus, remarks: string | undefined, userId: string) => Promise<any> };
}

const REGISTRY: Record<string, Registry> = {
  crop: { type: 'crop', label: 'Crop Insurance', model: CropApplication, nameField: 'farmerName', mobileField: 'mobile', service: cropService },
  vehicle: { type: 'vehicle', label: 'Vehicle Insurance', model: VehicleApplication, nameField: 'ownerName', mobileField: 'mobile', service: vehicleService },
  trailer: { type: 'trailer', label: 'Usha Tailoring Certificate', model: TrailerApplication, nameField: 'applicantName', mobileField: 'mobile', service: trailerService },
  loan: { type: 'loan', label: 'Loan Lead', model: LoanLead, nameField: 'applicantName', mobileField: 'mobile', service: loanService },
};

function escapeRegex(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFilter(reg: Registry, status?: string, search?: string): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ [reg.nameField]: rx }, { [reg.mobileField]: rx }];
  }
  return filter;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(reg: Registry, doc: any) {
  return {
    id: doc._id.toString(),
    serviceType: reg.type,
    serviceLabel: reg.label,
    name: doc[reg.nameField],
    mobile: doc[reg.mobileField],
    status: doc.status,
    remarks: doc.remarks,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Centralised, cross-module application list. When a single serviceType is
 * requested the query is paginated in the database; for the combined view,
 * matching records from each collection are merged, sorted and paged in memory
 * (documented limitation; swap to a $unionWith aggregation for very large data).
 */
export async function listApplications(opts: {
  serviceType?: string;
  status?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  const { serviceType, status, search, page, limit } = opts;

  if (serviceType && serviceType !== 'all') {
    const reg = REGISTRY[serviceType];
    if (!reg) throw AppError.badRequest('Unknown service type.', 'INVALID_SERVICE_TYPE');
    const filter = buildFilter(reg, status, search);
    const [docs, total] = await Promise.all([
      reg.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      reg.model.countDocuments(filter),
    ]);
    return { items: docs.map((d) => normalise(reg, d)), total, page, limit };
  }

  const CAP = 500; // per-collection safety cap for the merged view
  const regs = Object.values(REGISTRY);
  const perCollection = await Promise.all(
    regs.map(async (reg) => {
      const filter = buildFilter(reg, status, search);
      const [docs, count] = await Promise.all([
        reg.model.find(filter).sort({ createdAt: -1 }).limit(CAP),
        reg.model.countDocuments(filter),
      ]);
      return { docs: docs.map((d) => normalise(reg, d)), count };
    }),
  );
  const merged = perCollection.flatMap((p) => p.docs).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const total = perCollection.reduce((sum, p) => sum + p.count, 0);
  const start = (page - 1) * limit;
  return { items: merged.slice(start, start + limit), total, page, limit };
}

export async function updateApplicationStatus(
  serviceType: string,
  id: string,
  status: ApplicationStatus,
  remarks: string | undefined,
  userId: string,
) {
  const reg = REGISTRY[serviceType];
  if (!reg) throw AppError.badRequest('Unknown service type.', 'INVALID_SERVICE_TYPE');
  return reg.service.updateStatus(id, status, remarks, userId);
}
