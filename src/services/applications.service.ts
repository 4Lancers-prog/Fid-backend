import { makeCrudService } from './crudFactory';
import { CropApplication, ICropApplication } from '../models/CropApplication';
import { VehicleApplication, IVehicleApplication } from '../models/VehicleApplication';
import { TrailerApplication, ITrailerApplication } from '../models/TrailerApplication';
import { LoanLead, ILoanLead } from '../models/LoanLead';
import { encrypt } from '../utils/crypto';
import { maskAadhaar } from '../utils/mask';

export const cropService = makeCrudService<ICropApplication>({
  model: CropApplication,
  label: 'Crop application',
  notFoundCode: 'CROP_NOT_FOUND',
  searchFields: ['farmerName', 'mobile', 'village', 'district', 'cropName', 'surveyNumber'],
  serialize: (doc) => doc.toJSON(),
});

export const vehicleService = makeCrudService<IVehicleApplication>({
  model: VehicleApplication,
  label: 'Vehicle application',
  notFoundCode: 'VEHICLE_NOT_FOUND',
  searchFields: ['ownerName', 'mobile', 'registrationNumber', 'vehicleType'],
  serialize: (doc) => doc.toJSON(),
});

export const trailerService = makeCrudService<ITrailerApplication>({
  model: TrailerApplication,
  label: 'Trailer certificate',
  notFoundCode: 'TRAILER_NOT_FOUND',
  searchFields: ['applicantName', 'mobile', 'trailerRegistrationNumber', 'chassisNumber'],
  serialize: (doc) => doc.toJSON(),
});

/** Loan leads encrypt PAN/Aadhaar on write and only ever return masked values. */
export const loanService = makeCrudService<ILoanLead>({
  model: LoanLead,
  label: 'Loan lead',
  notFoundCode: 'LOAN_NOT_FOUND',
  searchFields: ['applicantName', 'mobile'],
  mapCreate: (input) => {
    const out: Record<string, unknown> = {
      applicantName: input.applicantName,
      mobile: input.mobile,
      loanType: input.loanType,
      loanAmount: input.loanAmount,
      farmer: input.farmer,
    };
    const pan = input.pan as string | undefined;
    const aadhaar = input.aadhaar as string | undefined;
    if (pan) {
      out.panEnc = encrypt(pan);
      out.panLast4 = pan.slice(-4);
    }
    if (aadhaar) {
      out.aadhaarEnc = encrypt(aadhaar);
      out.aadhaarLast4 = aadhaar.slice(-4);
    }
    return out;
  },
  serialize: (doc) => {
    const json = doc.toJSON() as Record<string, unknown>;
    json.panMasked = doc.panLast4 ? `XXXXXX${doc.panLast4}` : null;
    json.aadhaarMasked = doc.aadhaarLast4 ? maskAadhaar(doc.aadhaarLast4) : null;
    return json;
  },
});
