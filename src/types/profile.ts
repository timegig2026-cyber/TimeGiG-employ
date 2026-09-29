export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface IDDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize: string;
  fileUrl?: string;
}

export type ProfileStatus = 'Pending' | 'Approved' | 'Rejected' | 'Not Submitted';

export interface UserProfileSubmission {
  id: string;
  submittedAt: string;
  faceImage: string | null;
  lastLogoChangedAt?: string;
  firstName: string;
  middleName?: string;
  surname: string;
  dob: string;
  address: string;
  location: string;
  province: string;
  contactNumber: string;
  email: string;
  documents: IDDocument[];
  socialLinks: SocialLink[];
  status: ProfileStatus;
  rejectionReason?: string;
  isLocked?: boolean;
}
