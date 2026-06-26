/**
 * New Zealand Superannuation.
 *
 * NZ Super is the government pension. Unlike Canada's CPP/OAS it is:
 *   - Universal and flat-rate (not based on a contribution history like CPP).
 *   - NOT income-tested or asset-tested at the standard rate (other income does
 *     not claw it back, unlike OAS).
 *   - Paid from age 65 to anyone meeting the residency test (broadly: lived in
 *     NZ 10 years since age 20, including 5 since age 50).
 *   - Taxed as ordinary income at the recipient's tax code.
 *
 * The amount depends on living situation. The figures below are GROSS annual
 * rates for the 1 April 2025 adjustment (the "M" tax code, before tax), derived
 * so the after-tax amount matches the published net rates. They are editable in
 * the UI — treat them as a starting estimate, not the exact MSD figure, which
 * changes every April.
 */

export const RELATIONSHIP_STATUSES = ['single', 'couple'] as const
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number]

/** Gross annual NZ Super by living situation (per person), 1 April 2025 rates. */
export const NZ_SUPER_GROSS_ANNUAL: Record<RelationshipStatus, number> = {
  // Single, living alone — $1,076.84/fortnight net (M) grosses up to ~$32,610.
  single: 32_610,
  // Each partner where both qualify — $828.34/fortnight net (M) each → ~$24,780.
  couple: 24_780,
}

/** Standard NZ Super eligibility age. */
export const NZ_SUPER_ELIGIBILITY_AGE = 65
