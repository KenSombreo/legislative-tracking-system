import { DocumentType } from "./config/legislationFields";

export interface DocumentFile {
  _id: string;
  legislativeDocumentId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  fileUrl: string;
  documentCategory: "MAIN_DOCUMENT" | "SUPPORTING_DOCUMENT" | "ATTACHMENT";
  uploadedBy?: string;
  createdAt: string;
}

export interface UserRef {
  _id: string;
  fullName: string;
  username: string;
}

export interface Legislation {
  _id: string;
  documentType: DocumentType;
  documentNumber: string;
  year: number;
  title: string;
  classification: string | null;
  status: string | null;
  remarks: string | null;
  dateEnacted: string | null;
  dateAdopted: string | null;
  dateApprovedByLCE: string | null;
  dateEnactedApprovedBySP: string | null;
  author: string | null;
  sponsor: string | null;
  spResolutionNumber: string | null;
  sector: string | null;
  onlineLink: string | null;
  documents: DocumentFile[] | string[];
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string | null;
  reviewedBy?: UserRef | string | null;
  reviewedAt?: string | null;
  createdBy: UserRef | string | null;
  updatedBy: UserRef | string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Attachment {
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

interface Tracked {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SbMember extends Tracked {
  fullName: string;
  position: string;
  committees: string[];
  contactNumber: string | null;
  email: string | null;
  termStart: string | null;
  termEnd: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface SessionMinutes extends Tracked {
  sessionType: "REGULAR" | "SPECIAL";
  sessionNumber: string;
  sessionDate: string;
  venue: string | null;
  presidingOfficer: string | null;
  summary: string | null;
  status: "DRAFT" | "APPROVED";
  dateApproved: string | null;
  attachment: Attachment | null;
}

export interface CommitteeReport extends Tracked {
  reportNumber: string;
  committee: string;
  title: string;
  dateSubmitted: string | null;
  relatedMeasure: string | null;
  recommendation: string | null;
  summary: string | null;
  attachment: Attachment | null;
}

export type CalendarEventType = "REGULAR_SESSION" | "SPECIAL_SESSION" | "COMMITTEE_HEARING" | "OTHER";

export interface CalendarEvent extends Tracked {
  eventType: CalendarEventType;
  title: string;
  date: string;
  startTime: string | null;
  venue: string | null;
  committee: string | null;
  description: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReportSummary {
  total: number;
  ordinances: number;
  resolutions: number;
  appropriationOrdinances: number;
  pending: number;
  approved: number;
  archived: number;
}

export interface AuditLog {
  _id: string;
  userId: UserRef | string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  changes: Record<string, { old: any; new: any }>;
  createdAt: string;
}

export interface AppUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  role: "ADMIN" | "STAFF" | "VIEWER";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
