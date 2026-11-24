export const MAX_PENDING_BUILDING_SUBMISSIONS = 10;
export const MAX_BUILDING_SUBMISSION_IMAGES = 15;
export const MAX_BUILDING_SUBMISSION_TAGS = 20;
export const MAX_BUILDING_SUBMISSION_BUILDERS = 50;

export const BUILDING_SUBMISSION_TEXT_LIMITS = {
  name: 200,
  description: 2000,
  tag: 50,
  sourceAuthor: 200,
  sourceLink: 500,
  sourceNote: 500,
} as const;

/** Shared by browser conversion and server validation. */
export const BUILDING_SUBMISSION_IMAGE_LIMITS = {
  minWidth: 960,
  minHeight: 540,
  maxDimension: 1920,
  maxBytes: 4 * 1024 * 1024,
  webpQuality: 92,
} as const;
