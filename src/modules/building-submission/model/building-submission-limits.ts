export const MAX_PENDING_BUILDING_SUBMISSIONS = 10;
export const MAX_BUILDING_SUBMISSION_IMAGES = 15;

/** Shared by browser conversion and server validation. */
export const BUILDING_SUBMISSION_IMAGE_LIMITS = {
  minWidth: 960,
  minHeight: 540,
  maxDimension: 1920,
  maxBytes: 4 * 1024 * 1024,
  webpQuality: 86,
} as const;
