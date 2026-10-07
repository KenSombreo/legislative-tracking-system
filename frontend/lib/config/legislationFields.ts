export enum DocumentType {
  ORDINANCE = "ORDINANCE",
  RESOLUTION = "RESOLUTION",
  APPROPRIATION_ORDINANCE = "APPROPRIATION_ORDINANCE",
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.ORDINANCE]: "Ordinance",
  [DocumentType.RESOLUTION]: "Resolution",
  [DocumentType.APPROPRIATION_ORDINANCE]: "Appropriation Ordinance",
};

export interface FieldRule {
  field: string;
  label: string;
  type: "text" | "date" | "select" | "textarea";
  required: boolean;
}

export const LEGISLATION_FIELD_RULES: Record<DocumentType, FieldRule[]> = {
  [DocumentType.ORDINANCE]: [
    { field: "dateEnacted", label: "Date Enacted", type: "date", required: true },
    { field: "classification", label: "Classification", type: "select", required: true },
    { field: "dateApprovedByLCE", label: "Date Approved by LCE", type: "date", required: true },
    { field: "author", label: "Author", type: "text", required: true },
    { field: "dateEnactedApprovedBySP", label: "Date Enacted/Approved by SP", type: "date", required: true },
    { field: "spResolutionNumber", label: "SP Resolution Number", type: "text", required: false },
    { field: "status", label: "Status", type: "select", required: true },
    { field: "remarks", label: "Remarks", type: "textarea", required: false },
    { field: "onlineLink", label: "Online Link", type: "text", required: false },
  ],
  [DocumentType.RESOLUTION]: [
    { field: "dateAdopted", label: "Date Adopted", type: "date", required: true },
    { field: "classification", label: "Classification", type: "select", required: true },
    { field: "dateApprovedByLCE", label: "Date Approved by LCE", type: "date", required: true },
    { field: "sponsor", label: "Sponsor", type: "text", required: true },
    { field: "status", label: "Status", type: "select", required: true },
    { field: "sector", label: "Sector", type: "text", required: false },
    { field: "remarks", label: "Remarks", type: "textarea", required: false },
    { field: "onlineLink", label: "Online Link", type: "text", required: false },
  ],
  [DocumentType.APPROPRIATION_ORDINANCE]: [
    { field: "dateEnacted", label: "Date Enacted", type: "date", required: true },
    { field: "dateApprovedByLCE", label: "Date Approved by LCE", type: "date", required: true },
    { field: "author", label: "Author", type: "text", required: true },
    { field: "dateEnactedApprovedBySP", label: "Date Enacted/Approved by SP", type: "date", required: true },
    { field: "spResolutionNumber", label: "SP Resolution Number", type: "text", required: false },
    { field: "status", label: "Status", type: "select", required: true },
    { field: "remarks", label: "Remarks", type: "textarea", required: false },
    { field: "onlineLink", label: "Online Link", type: "text", required: false },
  ],
};

export const ALWAYS_REQUIRED_FIELDS = ["documentNumber", "year", "title", "documentType"];

export function getRelevantFieldsForType(type: DocumentType): FieldRule[] {
  return LEGISLATION_FIELD_RULES[type] || [];
}
