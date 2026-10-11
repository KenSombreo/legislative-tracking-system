// Steps a measure goes through in the Sanggunian, used by the status tracker, in order.
// Labels, and the stage shown for records that have none yet, live in frontend/lib/tracking.ts.
export enum TrackingStage {
  FILED = 'FILED',
  COMMITTEE = 'COMMITTEE',
  SECOND_READING = 'SECOND_READING',
  THIRD_READING = 'THIRD_READING',
  LCE_APPROVAL = 'LCE_APPROVAL',
  SP_REVIEW = 'SP_REVIEW',
  EFFECTIVE = 'EFFECTIVE',
}
