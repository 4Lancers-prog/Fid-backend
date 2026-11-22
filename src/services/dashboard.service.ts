import { Farmer } from '../models/Farmer';
import { FidRecord } from '../models/FidRecord';
import { Transaction } from '../models/Transaction';
import { CropApplication } from '../models/CropApplication';
import { VehicleApplication } from '../models/VehicleApplication';
import { TrailerApplication } from '../models/TrailerApplication';
import { LoanLead } from '../models/LoanLead';
import { getOrCreateWallet } from './wallet.service';
import { OPEN_STATUSES } from '../constants/status';

/** Aggregates headline figures for the dashboard across all implemented modules. */
export async function getDashboardStats(userId: string) {
  const openFilter = { status: { $in: OPEN_STATUSES } };
  const completedFilter = { status: 'completed' };
  const rejectedFilter = { status: 'rejected' };

  const [
    totalFarmers,
    totalFidCards,
    crop,
    vehicle,
    trailer,
    loan,
    pending,
    completed,
    rejected,
    wallet,
    recent,
  ] = await Promise.all([
    Farmer.countDocuments(),
    FidRecord.countDocuments(),
    CropApplication.countDocuments(),
    VehicleApplication.countDocuments(),
    TrailerApplication.countDocuments(),
    LoanLead.countDocuments(),
    Promise.all([
      CropApplication.countDocuments(openFilter),
      VehicleApplication.countDocuments(openFilter),
      TrailerApplication.countDocuments(openFilter),
      LoanLead.countDocuments(openFilter),
    ]).then((c) => c.reduce((a, b) => a + b, 0)),
    Promise.all([
      CropApplication.countDocuments(completedFilter),
      VehicleApplication.countDocuments(completedFilter),
      TrailerApplication.countDocuments(completedFilter),
      LoanLead.countDocuments(completedFilter),
    ]).then((c) => c.reduce((a, b) => a + b, 0)),
    Promise.all([
      CropApplication.countDocuments(rejectedFilter),
      VehicleApplication.countDocuments(rejectedFilter),
      TrailerApplication.countDocuments(rejectedFilter),
      LoanLead.countDocuments(rejectedFilter),
    ]).then((c) => c.reduce((a, b) => a + b, 0)),
    getOrCreateWallet(userId),
    FidRecord.find().sort({ createdAt: -1 }).limit(5).select('name fid createdAt'),
  ]);

  return {
    totals: {
      farmers: totalFarmers,
      fidCards: totalFidCards,
      cropApplications: crop,
      vehicleApplications: vehicle,
      trailerApplications: trailer,
      loanLeads: loan,
      pending,
      completed,
      rejected,
    },
    walletBalance: wallet.balance,
    recentActivities: recent.map((r) => ({
      id: r._id.toString(),
      title: `FID card generated: ${r.name}`,
      reference: r.fid,
      at: r.createdAt,
    })),
  };
}

export async function getRecentTransactions(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  return Transaction.find({ wallet: wallet._id }).sort({ createdAt: -1 }).limit(10);
}
