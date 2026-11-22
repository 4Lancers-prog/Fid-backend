import { describe, it, expect } from 'vitest';
import { createCropSchema } from '../../validators/crop.validator';
import { createVehicleSchema } from '../../validators/vehicle.validator';
import { createTrailerSchema } from '../../validators/trailer.validator';
import { createLoanSchema } from '../../validators/loan.validator';

describe('crop validator', () => {
  it('accepts valid input', () => {
    expect(
      createCropSchema.safeParse({ farmerName: 'Asha', mobile: '9876543210', cropName: 'Paddy', season: 'kharif' }).success,
    ).toBe(true);
  });
  it('rejects an invalid season and bad mobile', () => {
    const r = createCropSchema.safeParse({ farmerName: 'Asha', mobile: '123', cropName: 'Paddy', season: 'winter' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = r.error.issues.map((i) => i.path[0]);
      expect(f).toContain('season');
      expect(f).toContain('mobile');
    }
  });
});

describe('vehicle validator', () => {
  it('accepts valid input and coerces year', () => {
    const r = createVehicleSchema.safeParse({
      ownerName: 'Ravi', mobile: '9876543210', vehicleType: 'Tractor',
      registrationNumber: 'KA25AB1234', insuranceType: 'comprehensive', manufacturingYear: '2020',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.manufacturingYear).toBe(2020);
  });
  it('rejects an invalid insurance type', () => {
    const r = createVehicleSchema.safeParse({
      ownerName: 'Ravi', mobile: '9876543210', vehicleType: 'Car', registrationNumber: 'KA01', insuranceType: 'full',
    });
    expect(r.success).toBe(false);
  });
});

describe('trailer validator', () => {
  it('accepts valid input', () => {
    expect(
      createTrailerSchema.safeParse({ applicantName: 'Kumar', mobile: '9876543210', certificateType: 'rc' }).success,
    ).toBe(true);
  });
  it('rejects a missing certificate type', () => {
    expect(createTrailerSchema.safeParse({ applicantName: 'Kumar', mobile: '9876543210' }).success).toBe(false);
  });
});

describe('loan validator', () => {
  it('accepts valid input and normalises PAN to uppercase', () => {
    const r = createLoanSchema.safeParse({
      applicantName: 'Meena', mobile: '9876543210', loanType: 'home', loanAmount: '500000', pan: 'abcde1234f',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.pan).toBe('ABCDE1234F');
      expect(r.data.loanAmount).toBe(500000);
    }
  });
  it('rejects a malformed PAN with the PRD message', () => {
    const r = createLoanSchema.safeParse({
      applicantName: 'Meena', mobile: '9876543210', loanType: 'home', loanAmount: 1000, pan: 'BADPAN',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === 'pan')?.message).toMatch(/ABCDE1234F/);
  });
  it('rejects a non-positive loan amount', () => {
    const r = createLoanSchema.safeParse({ applicantName: 'Meena', mobile: '9876543210', loanType: 'home', loanAmount: 0 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === 'loanAmount')?.message).toMatch(/greater than zero/);
  });
});
