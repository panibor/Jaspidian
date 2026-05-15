/**
 * src-v2/content/expander/expandComments.ts
 * Expand comments by clicking "View comments" buttons.
 */
import { runExpansion } from './expanderCore';
import { findViewCommentsButtons } from './expanderTargets';
import type { Env, ExpansionStatsV2 } from '../../shared/types';
import type { BudgetTracker } from './expanderCore';

/**
 * Expand comments by clicking "View comments" buttons.
 */
export async function expandComments(
  postEl: Element,
  env: Env,
  budget: BudgetTracker
): Promise<ExpansionStatsV2> {
  return runExpansion({
    targetsFn: () => findViewCommentsButtons(postEl),
    observeRoot: postEl,
    budget,
    env,
  });
}
