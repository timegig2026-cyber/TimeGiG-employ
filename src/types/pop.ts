export type PoPStatus = 'Pending' | 'Approved' | 'Rejected';

export interface UserPoPSubmission {
  id: string;
  submittedAt: string;
  userName: string;
  userEmail: string;
  userContact: string;
  planType: 'Normal User' | 'Tenant';
  amountPaid: string;
  popFileName: string;
  popFileSize: string;
  popFileUrl: string;
  status: PoPStatus;
  rejectionReason?: string;
}
