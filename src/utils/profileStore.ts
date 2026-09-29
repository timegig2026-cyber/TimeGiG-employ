import { UserProfileSubmission } from '../types/profile';

const STORAGE_KEY = 'timegig_submitted_profiles';

export function getStoredProfiles(): UserProfileSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: UserProfileSubmission[] = JSON.parse(raw);
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveStoredProfiles(profiles: UserProfileSubmission[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    // Dispatch custom event to notify other components instantly
    window.dispatchEvent(new Event('profile_store_updated'));
  } catch (e) {
    console.error('Failed to save profiles to localStorage', e);
  }
}

export function addOrUpdateProfileSubmission(submission: UserProfileSubmission): UserProfileSubmission[] {
  const existing = getStoredProfiles();
  const index = existing.findIndex((p) => p.id === submission.id || (p.email && p.email === submission.email));
  let updated: UserProfileSubmission[];
  if (index >= 0) {
    updated = [...existing];
    // Retain approved status if already approved unless explicitly updated
    const prevStatus = existing[index].status;
    const finalStatus = prevStatus === 'Approved' ? 'Approved' : submission.status;
    updated[index] = {
      ...submission,
      id: existing[index].id,
      status: finalStatus,
      isLocked: finalStatus === 'Approved',
    };
  } else {
    updated = [submission, ...existing];
  }
  saveStoredProfiles(updated);
  return updated;
}

export function updateProfileStatus(id: string, status: 'Approved' | 'Rejected', reason?: string): UserProfileSubmission[] {
  const existing = getStoredProfiles();
  const updated = existing.map((p) =>
    p.id === id ? { ...p, status, rejectionReason: reason, isLocked: status === 'Approved' } : p
  );
  saveStoredProfiles(updated);
  return updated;
}

export function toggleProfileEnabled(id: string, isEnabled: boolean): UserProfileSubmission[] {
  const existing = getStoredProfiles();
  const updated = existing.map((p) =>
    p.id === id ? { ...p, isEnabled } : p
  );
  saveStoredProfiles(updated);
  return updated;
}
