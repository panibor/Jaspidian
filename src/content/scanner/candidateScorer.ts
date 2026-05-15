/**
 * src-v2/content/scanner/candidateScorer.ts
 * Scores a classified candidate by summing its signal weights.
 */
import type { ClassifiedCandidateV2 } from '../../shared/types';

/**
 * Score a classified candidate by summing all its signal weights.
 *
 * @param c Classified candidate with signals.
 * @returns Numeric score (sum of signal weights).
 */
export function score(c: ClassifiedCandidateV2): number {
  return c.signals.reduce((sum, s) => sum + s.weight, 0);
}
