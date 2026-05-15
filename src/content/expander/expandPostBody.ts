/**
 * src-v2/content/expander/expandPostBody.ts
 * Expand post body "See more" buttons.
 */
import { runExpansion } from './expanderCore';
import { findSeeMoreInBody } from './expanderTargets';
import type { Env, ExpansionStatsV2 } from '../../shared/types';
import type { BudgetTracker } from './expanderCore';

/**
 * Expand the post body by clicking "See more" buttons.
 */
export async function expandPostBody(
  postEl: Element,
  env: Env,
  budget: BudgetTracker
): Promise<ExpansionStatsV2> {
  return runExpansion({
    targetsFn: () => findSeeMoreInBody(postEl),
    observeRoot: postEl,
    budget,
    env,
  });
}
