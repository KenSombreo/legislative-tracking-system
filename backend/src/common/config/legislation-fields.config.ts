export enum DocumentType {
  ORDINANCE = 'ORDINANCE',
  RESOLUTION = 'RESOLUTION',
  APPROPRIATION_ORDINANCE = 'APPROPRIATION_ORDINANCE',
}

export interface LegislationFieldRule {
  field: string;
  required: boolean;
}

// Fields beyond the always-required documentNumber, year, title, documentType.
export const LEGISLATION_FIELD_RULES: Record<DocumentType, LegislationFieldRule[]> = {
  [DocumentType.ORDINANCE]: [
    { field: 'dateEnacted', required: true },
    { field: 'classification', required: true },
    { field: 'dateApprovedByLCE', required: true },
    { field: 'author', required: true },
    { field: 'dateEnactedApprovedBySP', required: true },
    { field: 'spResolutionNumber', required: false },
    { field: 'status', required: true },
    { field: 'remarks', required: false },
    { field: 'onlineLink', required: false },
  ],
  [DocumentType.RESOLUTION]: [
    { field: 'dateAdopted', required: true },
    { field: 'classification', required: true },
    { field: 'dateApprovedByLCE', required: true },
    { field: 'sponsor', required: true },
    { field: 'status', required: true },
    { field: 'sector', required: false },
    { field: 'remarks', required: false },
    { field: 'onlineLink', required: false },
  ],
  [DocumentType.APPROPRIATION_ORDINANCE]: [
    { field: 'dateEnacted', required: true },
    { field: 'dateApprovedByLCE', required: true },
    { field: 'author', required: true },
    { field: 'dateEnactedApprovedBySP', required: true },
    { field: 'spResolutionNumber', required: false },
    { field: 'status', required: true },
    { field: 'remarks', required: false },
    { field: 'onlineLink', required: false },
  ],
};

export const ALWAYS_REQUIRED_FIELDS = ['documentNumber', 'year', 'title', 'documentType'];

export function getRequiredFieldsForType(type: DocumentType): string[] {
  const rules = LEGISLATION_FIELD_RULES[type] || [];
  return [...ALWAYS_REQUIRED_FIELDS, ...rules.filter((r) => r.required).map((r) => r.field)];
}

export function getRelevantFieldsForType(type: DocumentType): string[] {
  const rules = LEGISLATION_FIELD_RULES[type] || [];
  return [...ALWAYS_REQUIRED_FIELDS, ...rules.map((r) => r.field)];
}
