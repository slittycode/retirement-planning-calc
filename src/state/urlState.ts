import type { Inputs } from '../types'
import { NZ_DEFAULTS } from '../defaults'
import { clampNumericInput, type NumericInputKey } from '../inputLimits'
import { RETURN_SCENARIOS, type ReturnScenario } from '../calc/portfolio'
import { RELATIONSHIP_STATUSES, type RelationshipStatus } from '../calc/nzsuper'
import { SPENDING_MODES, type SpendingMode } from '../calc/spending'
import { sanitizeLumpSums } from '../calc/cashflows'

/** Encode all inputs as a readable query string (one param per field). */
export function encodeInputs(inputs: Inputs): string {
  const params = new URLSearchParams()
  for (const key of Object.keys(inputs) as (keyof Inputs)[]) {
    const value = inputs[key]
    // Only serialise lump sums when there are any, to keep links tidy.
    if (key === 'lumpSums') {
      if (Array.isArray(value) && value.length > 0) params.set(key, JSON.stringify(value))
      continue
    }
    params.set(key, String(value))
  }
  return params.toString()
}

/** Decode inputs from a query string, falling back to NZ defaults for anything missing or invalid. */
export function decodeInputs(search: string): Inputs {
  const params = new URLSearchParams(search)
  const result: Inputs = { ...NZ_DEFAULTS, lumpSums: [...NZ_DEFAULTS.lumpSums] }
  for (const key of Object.keys(NZ_DEFAULTS) as (keyof Inputs)[]) {
    const raw = params.get(key)
    if (raw === null) continue
    const def = NZ_DEFAULTS[key]
    if (key === 'lumpSums') {
      try {
        result.lumpSums = sanitizeLumpSums(JSON.parse(raw))
      } catch {
        // Malformed lump-sum payload — keep the default (empty) list.
      }
    } else if (typeof def === 'number') {
      const n = Number(raw)
      if (Number.isFinite(n)) (result[key] as number) = clampNumericInput(key as NumericInputKey, n)
    } else if (typeof def === 'boolean') {
      if (raw === 'true' || raw === 'false') (result[key] as boolean) = raw === 'true'
    } else if (key === 'returnScenario') {
      if (RETURN_SCENARIOS.includes(raw as ReturnScenario)) result.returnScenario = raw as ReturnScenario
    } else if (key === 'relationshipStatus') {
      if (RELATIONSHIP_STATUSES.includes(raw as RelationshipStatus))
        result.relationshipStatus = raw as RelationshipStatus
    } else if (key === 'spendingMode') {
      if (SPENDING_MODES.includes(raw as SpendingMode)) result.spendingMode = raw as SpendingMode
    }
  }
  return result
}
