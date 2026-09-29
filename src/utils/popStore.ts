import { UserPoPSubmission } from '../types/pop';

const POP_STORAGE_KEY = 'timegig_submitted_pops';
const BANKING_STORAGE_KEY = 'timegig_banking_details';
const TRIAL_STORAGE_KEY = 'timegig_free_trial';

export interface BankingDetails {
  monthlyFee: string;
  tenantMonthlyFee: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  referenceFormat: string;
}

export const DEFAULT_BANKING_DETAILS: BankingDetails = {
  monthlyFee: 'R150.00',
  tenantMonthlyFee: 'R500.00',
  bankName: 'First National Bank (FNB)',
  accountHolder: 'TimeGig Platform (Pty) Ltd',
  accountNumber: '62849103851',
  branchCode: '250655',
  referenceFormat: 'Your Phone / Email',
};

export interface FreeTrialSettings {
  enabled: boolean;
  trialDays: number;
}

export const DEFAULT_TRIAL_SETTINGS: FreeTrialSettings = {
  enabled: true,
  trialDays: 14,
};

export function getFreeTrialSettings(): FreeTrialSettings {
  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(DEFAULT_TRIAL_SETTINGS));
      return DEFAULT_TRIAL_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_TRIAL_SETTINGS;
  }
}

export function saveFreeTrialSettings(settings: FreeTrialSettings): void {
  try {
    localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('trial_settings_updated'));
  } catch (e) {
    console.error('Failed to save free trial settings', e);
  }
}

export function getStoredBankingDetails(): BankingDetails {
  try {
    const raw = localStorage.getItem(BANKING_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BANKING_STORAGE_KEY, JSON.stringify(DEFAULT_BANKING_DETAILS));
      return DEFAULT_BANKING_DETAILS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BANKING_DETAILS,
      ...parsed,
    };
  } catch (e) {
    return DEFAULT_BANKING_DETAILS;
  }
}

export function saveStoredBankingDetails(details: BankingDetails): void {
  try {
    localStorage.setItem(BANKING_STORAGE_KEY, JSON.stringify(details));
    window.dispatchEvent(new Event('banking_details_updated'));
  } catch (e) {
    console.error('Failed to save banking details', e);
  }
}

export function getStoredPoPs(): UserPoPSubmission[] {
  try {
    const raw = localStorage.getItem(POP_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveStoredPoPs(pops: UserPoPSubmission[]): void {
  try {
    localStorage.setItem(POP_STORAGE_KEY, JSON.stringify(pops));
    window.dispatchEvent(new Event('pop_store_updated'));
  } catch (e) {
    console.error('Failed to save PoPs to localStorage', e);
  }
}

export function addOrUpdatePoP(submission: UserPoPSubmission): UserPoPSubmission[] {
  const existing = getStoredPoPs();
  const index = existing.findIndex((p) => p.id === submission.id);
  let updated: UserPoPSubmission[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = submission;
  } else {
    updated = [submission, ...existing];
  }
  saveStoredPoPs(updated);
  return updated;
}

export function updatePoPStatus(id: string, status: 'Approved' | 'Rejected', reason?: string): UserPoPSubmission[] {
  const existing = getStoredPoPs();
  const updated = existing.map((p) =>
    p.id === id ? { ...p, status, rejectionReason: reason } : p
  );
  saveStoredPoPs(updated);
  return updated;
}
