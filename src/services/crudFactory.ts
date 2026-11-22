import { FilterQuery, Model } from 'mongoose';
import { AppError } from '../utils/AppError';
import { APPLICATION_STATUSES, ApplicationStatus } from '../constants/status';

interface ListParams {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}

interface CrudConfig<TDoc> {
  model: Model<TDoc>;
  label: string;
  /** Fields matched (case-insensitive regex) when a search term is supplied. */
  searchFields: string[];
  /** Shapes a document for API responses (e.g. masking sensitive fields). */
  serialize: (doc: TDoc) => unknown;
  /** Optional transform of validated input into the stored document shape. */
  mapCreate?: (input: Record<string, unknown>) => Record<string, unknown>;
  notFoundCode: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a standard create / list / get / update / updateStatus service for an
 * application-style collection, keeping each module thin and consistent.
 */
export function makeCrudService<TDoc>(config: CrudConfig<TDoc>) {
  const { model, label, searchFields, serialize, mapCreate, notFoundCode } = config;

  async function create(input: Record<string, unknown>, userId: string) {
    const payload = mapCreate ? mapCreate(input) : input;
    const doc = await model.create({ ...payload, createdBy: userId });
    return serialize(doc);
  }

  async function list(params: ListParams) {
    const filter: FilterQuery<TDoc> = {};
    if (params.status) {
      if (!APPLICATION_STATUSES.includes(params.status as ApplicationStatus)) {
        throw AppError.badRequest('Unknown status filter.', 'INVALID_STATUS');
      }
      (filter as Record<string, unknown>).status = params.status;
    }
    if (params.search && searchFields.length) {
      const rx = new RegExp(escapeRegex(params.search), 'i');
      (filter as Record<string, unknown>).$or = searchFields.map((f) => ({ [f]: rx }));
    }
    const [docs, total] = await Promise.all([
      model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((params.page - 1) * params.limit)
        .limit(params.limit),
      model.countDocuments(filter),
    ]);
    return { items: docs.map(serialize), total, page: params.page, limit: params.limit };
  }

  async function getOne(id: string) {
    const doc = await model.findById(id);
    if (!doc) throw AppError.notFound(`${label} not found.`, notFoundCode);
    return serialize(doc);
  }

  async function update(id: string, input: Record<string, unknown>, userId: string) {
    const doc = await model.findByIdAndUpdate(
      id,
      { ...input, updatedBy: userId },
      { new: true, runValidators: true },
    );
    if (!doc) throw AppError.notFound(`${label} not found.`, notFoundCode);
    return serialize(doc);
  }

  async function updateStatus(id: string, status: ApplicationStatus, remarks: string | undefined, userId: string) {
    const doc = await model.findByIdAndUpdate(
      id,
      { status, ...(remarks !== undefined ? { remarks } : {}), updatedBy: userId },
      { new: true, runValidators: true },
    );
    if (!doc) throw AppError.notFound(`${label} not found.`, notFoundCode);
    return serialize(doc);
  }

  return { create, list, getOne, update, updateStatus };
}

export type CrudService = ReturnType<typeof makeCrudService>;
