/**
 * src-v2/content/expander/expandReplies.ts
 * Expand comment replies by clicking "View replies" buttons.
 */
import { runExpansion } from './expanderCore';
import { findViewRepliesButtons } from './expanderTargets';
import type { Env, ExpansionStatsV2 } from '../../shared/types';
import type { BudgetTracker } from './expanderCore';

/**
 * Expand replies by clicking "View replies" buttons in a comments section.
 */
export async function expandReplies(
  commentsRoot: Element,
  env: Env,
  budget: BudgetTracker
): Promise<ExpansionStatsV2> {
  return runExpansion({
    targetsFn: () => findViewRepliesButtons(commentsRoot),
    observeRoot: commentsRoot,
    budget,
    env,
  });
}
