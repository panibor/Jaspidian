/**
 * src-v2/content/expander/expanderCore.ts
 * Core expansion loop: clicks "See more" / "View comments" buttons with budget tracking.
 */
import type { Env, ExpansionStatsV2 } from '../../shared/types';
import { EXPANDER_CAPS } from '../../shared/constants';

export interface BudgetTracker {
  totalClicksRemaining(): number;
  totalMsRemaining(): number;
  totalMutationsRemaining(): number;
  recordClick(): void;
  recordMutations(n: number): void;
  hitClickCap: boolean;
  hitTimeCap: boolean;
  hitMutationCap: boolean;
  readonly startMs: number;
}

/**
 * Create a new budget tracker with the given caps.
 */
export function createBudgetTracker(caps: {
  maxClicks: number;
  maxMs: number;
  maxMutationNodes: number;
}): BudgetTracker {
  let clicks = 0;
  let mutations = 0;
  const startMs = Date.now();

  return {
    startMs,
    get hitClickCap() { return clicks >= caps.maxClicks; },
    get hitTimeCap() { return Date.now() - startMs >= caps.maxMs; },
    get hitMutationCap() { return mutations >= caps.maxMutationNodes; },
    totalClicksRemaining() { return Math.max(0, caps.maxClicks - clicks); },
    totalMsRemaining() { return Math.max(0, caps.maxMs - (Date.now() - startMs)); },
    totalMutationsRemaining() { return Math.max(0, caps.maxMutationNodes - mutations); },
    recordClick() { clicks++; },
    recordMutations(n: number) { mutations += n; },
  };
}

export interface ExpanderOpts {
  targetsFn: () => HTMLElement[];
  observeRoot: Element;
  budget: BudgetTracker;
  env: Env;
}

/**
 * Run the expansion loop: repeatedly find and click targets, observe mutations, check caps.
 *
 * @param opts Expansion options.
 * @returns ExpansionStatsV2.
 */
export async function runExpansion(opts: ExpanderOpts): Promise<ExpansionStatsV2> {
  const { targetsFn, observeRoot, budget, env } = opts;
  const warnings: string[] = [];
  const clickedEls = new WeakSet<Element>();

  let bodyClicks = 0;
  let bodyMs = 0;
  let commentClicks = 0;
  let commentMs = 0;
  let replyClicks = 0;
  let replyMs = 0;
  let totalMutations = 0;

  // We track category via the ExpanderOpts caller (they pass different targetsFn per category).
  // This single runExpansion function tracks all clicks contributed by this call.
  let localClicks = 0;
  const localStartMs = Date.now();

  while (true) {
    // Budget checks
    if (budget.hitClickCap) {
      warnings.push('expansion: click cap hit');
      break;
    }
    if (budget.hitTimeCap) {
      warnings.push('expansion: time cap hit');
      break;
    }
    if (budget.hitMutationCap) {
      warnings.push('expansion: mutation cap hit');
      break;
    }

    const targets = targetsFn().filter((el) => !clickedEls.has(el));
    if (targets.length === 0) break;

    const target = targets[0];
    clickedEls.add(target);

    // Dispatch realistic events
    _simulateClick(target);
    budget.recordClick();
    localClicks++;

    // Observe mutations for up to 3 seconds
    const mutsBefore = totalMutations;
    const muts = await env.observeMutations(observeRoot, { timeoutMs: 3_000 });
    const newMuts = muts.reduce((n, r) => n + r.addedNodes.length + r.removedNodes.length, 0);
    totalMutations += newMuts;
    budget.recordMutations(newMuts);

    // Spinner stall detection
    if (newMuts === 0) {
      const spinner = observeRoot.querySelector(
        '[role="progressbar"], [aria-busy="true"]'
      );
      if (spinner) {
        warnings.push('expansion: spinner stall (no mutations after click)');
        break;
      }
    }
  }

  const localMs = Date.now() - localStartMs;

  // We don't know "category" here — caller will add per-category stats.
  // Return aggregate; caller accumulates into the envelope.
  return {
    bodyClicks,
    bodyMs,
    commentClicks,
    commentMs,
    replyClicks,
    replyMs,
    totalClicks: localClicks,
    totalMs: localMs,
    mutationNodes: totalMutations,
    hitClickCap: budget.hitClickCap,
    hitTimeCap: budget.hitTimeCap,
    hitMutationCap: budget.hitMutationCap,
    warnings,
  };
}

function _simulateClick(el: HTMLElement): void {
  el.click();
}

/**
 * Run body expansion, comment expansion, and reply expansion for a single post.
 * Returns merged ExpansionStatsV2.
 */
export async function expandPost(
  postEl: Element,
  env: Env,
  caps: typeof EXPANDER_CAPS,
  findBodyBtns: () => HTMLElement[],
  findCommentBtns: () => HTMLElement[],
  findReplyBtns: () => HTMLElement[],
  doBody: boolean,
  doComments: boolean,
  doReplies: boolean
): Promise<ExpansionStatsV2> {
  const budget = createBudgetTracker({
    maxClicks: caps.maxClicks,
    maxMs: caps.maxMs,
    maxMutationNodes: caps.maxMutationNodes,
  });

  const merged: ExpansionStatsV2 = {
    bodyClicks: 0, bodyMs: 0,
    commentClicks: 0, commentMs: 0,
    replyClicks: 0, replyMs: 0,
    totalClicks: 0, totalMs: 0,
    mutationNodes: 0,
    hitClickCap: false, hitTimeCap: false, hitMutationCap: false,
    warnings: [],
  };

  function _merge(stats: ExpansionStatsV2, category: 'body' | 'comment' | 'reply'): void {
    if (category === 'body') {
      merged.bodyClicks += stats.totalClicks;
      merged.bodyMs += stats.totalMs;
    } else if (category === 'comment') {
      merged.commentClicks += stats.totalClicks;
      merged.commentMs += stats.totalMs;
    } else {
      merged.replyClicks += stats.totalClicks;
      merged.replyMs += stats.totalMs;
    }
    merged.totalClicks += stats.totalClicks;
    merged.totalMs += stats.totalMs;
    merged.mutationNodes += stats.mutationNodes;
    merged.hitClickCap = merged.hitClickCap || stats.hitClickCap;
    merged.hitTimeCap = merged.hitTimeCap || stats.hitTimeCap;
    merged.hitMutationCap = merged.hitMutationCap || stats.hitMutationCap;
    merged.warnings.push(...stats.warnings);
  }

  // Body clicks (capped separately, one pass is enough)
  if (doBody) {
    const bodyCap = createBudgetTracker({
      maxClicks: caps.bodyMaxClicks,
      maxMs: caps.maxMs,
      maxMutationNodes: caps.maxMutationNodes,
    });
    const bodyStats = await runExpansion({ targetsFn: findBodyBtns, observeRoot: postEl as Element, budget: bodyCap, env });
    _merge(bodyStats, 'body');
  }

  // Comments + replies: run in interleaved passes so newly loaded comments
  // also get their reply threads expanded. Cap at 4 rounds.
  const MAX_ROUNDS = 4;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (budget.hitClickCap || budget.hitTimeCap || budget.hitMutationCap) break;

    let roundClicks = 0;

    if (doComments) {
      const s = await runExpansion({ targetsFn: findCommentBtns, observeRoot: postEl as Element, budget, env });
      _merge(s, 'comment');
      roundClicks += s.totalClicks;
    }

    if (doReplies && !budget.hitClickCap && !budget.hitTimeCap) {
      const s = await runExpansion({ targetsFn: findReplyBtns, observeRoot: postEl as Element, budget, env });
      _merge(s, 'reply');
      roundClicks += s.totalClicks;
    }

    // If neither phase clicked anything new this round, no point continuing
    if (roundClicks === 0) break;
  }

  return merged;
}
