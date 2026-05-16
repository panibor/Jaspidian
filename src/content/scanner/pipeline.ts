/**
 * src-v2/content/scanner/pipeline.ts
 * Main scanner orchestrator.
 */
import type { Env, ScanOptions, ScanEnvelopeV2, ExtractedFacebookPostV2, CommentMode } from '../../shared/types';
import { EXPANDER_CAPS } from '../../shared/constants';
import { detectScenario } from './scenarioDetector';
import { findCandidates } from './candidateFinder';
import { classify } from './candidateClassifier';
import { score } from './candidateScorer';
import { resolveContext } from './contextResolver';
import { extractPost } from '../extractor/extractPost';
import { expandPost } from '../expander/expanderCore';
import { findSeeMoreInBody, findViewCommentsButtons, findViewRepliesButtons } from '../expander/expanderTargets';

const MAX_POSTS_PER_SCAN = 50;
const MIN_SCORE_THRESHOLD = 3;

export interface ScanResult {
  envelope: ScanEnvelopeV2;
  /** Maps postId → DOM element for later deferred expansion. */
  elementMap: Map<string, Element>;
}

/**
 * Scan the current page for posts and extract their content.
 * Expansion is controlled by `opts.expand`; pass all-false for a quick non-clicking scan.
 *
 * @param env Injected environment.
 * @param opts Scan options.
 * @returns ScanResult (envelope + element map for deferred expansion).
 */
export async function scan(env: Env, opts: ScanOptions): Promise<ScanResult> {
  const { document: doc, url, now } = env;
  const warnings: string[] = [];

  // 1. Detect scenario
  const scenario = detectScenario(doc, url);
  console.debug('[jaspidian] scenario:', scenario, '| url:', url);

  // 2. Find candidates
  const candidates = findCandidates(doc, scenario);
  console.debug('[jaspidian] raw candidates:', candidates.length,
    candidates.map((c) => ({ origin: c.origin, tag: c.el.tagName, role: c.el.getAttribute('role'), id: c.el.id })));

  // 3. Classify + score
  const allClassified = candidates.map((c) => classify(c, doc)).map((c) => ({ ...c, score: score(c) }));
  console.debug('[jaspidian] classified (all):',
    allClassified.map((c) => ({
      kind: c.kind, score: c.score, origin: c.origin,
      tag: c.el.tagName, role: c.el.getAttribute('role'),
      signals: c.signals.map((s) => `${s.name}(${s.weight})`).join(', '),
    })));

  const scored = allClassified
    .filter((c) => c.kind === 'postRoot')
    .filter((c) => c.score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  console.debug('[jaspidian] passed score threshold (≥' + MIN_SCORE_THRESHOLD + '):', scored.length);

  // Deduplicate by DOM ancestry + score: when two candidates overlap, keep the one
  // with the HIGHER score. If an outer wrapper somehow scored higher it wins; but
  // a real [aria-posinset] post (score ~16) always beats a feed-wrapper (score ~10).
  // Ties go to the outer ancestor (original behavior).
  const classified = scored
    .filter((candidate, _i, arr) =>
      !arr.some(
        (other) =>
          other !== candidate &&
          other.el.contains(candidate.el) &&
          other.score >= candidate.score  // only suppress if outer is at least as confident
      )
    )
    .slice(0, MAX_POSTS_PER_SCAN);

  console.debug('[jaspidian] final accepted posts:', classified.length);

  if (classified.length === 0) {
    warnings.push('No post candidates found on this page');
  }

  // 4. Extract each post (with optional expansion)
  const caps = {
    maxClicks: opts.expand.maxClicks ?? EXPANDER_CAPS.maxClicks,
    maxMs: opts.expand.maxMs ?? EXPANDER_CAPS.maxMs,
    maxMutationNodes: opts.expand.maxMutationNodes ?? EXPANDER_CAPS.maxMutationNodes,
    bodyMaxClicks: EXPANDER_CAPS.bodyMaxClicks,
    commentMaxClicks: EXPANDER_CAPS.commentMaxClicks,
    replyMaxClicks: EXPANDER_CAPS.replyMaxClicks,
  };

  const posts: ExtractedFacebookPostV2[] = [];
  const elementMap = new Map<string, Element>();

  for (const candidate of classified) {
    const postEl = candidate.el;

    try {
      // Resolve context before expansion (context headers may change after expansion)
      const context = resolveContext(doc, postEl, scenario, url);

      // Expand (only if requested - for deferred-expansion scans all flags are false)
      let expansionStats = _emptyExpansionStats();
      if (opts.expand.body || opts.expand.comments || opts.expand.replies) {
        expansionStats = await expandPost(
          postEl,
          env,
          caps,
          () => findSeeMoreInBody(postEl),
          () => findViewCommentsButtons(postEl),
          () => findViewRepliesButtons(postEl),
          opts.expand.body,
          opts.expand.comments,
          opts.expand.replies
        );
        warnings.push(...expansionStats.warnings);
      }

      // Extract
      const post = extractPost(postEl, context, expansionStats, env);
      // Deduplicate by postId - skip if we already have a post with this ID.
      // Only applies when postId is a real FB identifier (not the counter fallback).
      if (post.postId && elementMap.has(post.postId)) {
        continue;
      }
      posts.push(post);
      elementMap.set(post.postId || post.id, postEl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`extractPost failed: ${msg}`);
      env.log.error('pipeline: extractPost threw', err);
    }
  }

  const envelope: ScanEnvelopeV2 = {
    v: 2,
    posts,
    scenario,
    url,
    scannedAt: now(),
    warnings,
    debugReport: {
      scenarioDetected: scenario,
      candidatesCount: candidates.length,
      classifiedCount: classified.length,
      rejectionReasons: _buildRejectionReasons(candidates.length, classified.length),
      topCandidates: classified.slice(0, 3).map(({ el: _el, ...rest }) => rest),
    },
  };

  return { envelope, elementMap };
}

/**
 * Deferred expansion: given a set of post IDs and their stored DOM elements,
 * run expansion + re-extraction and return fully-populated posts.
 * Called by the content script in response to EXPAND_AND_EXTRACT_REQUEST.
 */
export async function expandAndExtractPosts(
  env: Env,
  postIds: string[],
  elementStore: ReadonlyMap<string, WeakRef<Element>>,
  expandOpts: ScanOptions['expand'],
  _commentMode: CommentMode
): Promise<{ posts: ExtractedFacebookPostV2[]; warnings: string[]; notFound: string[] }> {
  const { document: doc, url } = env;
  const scenario = detectScenario(doc, url);

  const caps = {
    maxClicks: expandOpts.maxClicks ?? EXPANDER_CAPS.maxClicks,
    maxMs: expandOpts.maxMs ?? EXPANDER_CAPS.maxMs,
    maxMutationNodes: expandOpts.maxMutationNodes ?? EXPANDER_CAPS.maxMutationNodes,
    bodyMaxClicks: EXPANDER_CAPS.bodyMaxClicks,
    commentMaxClicks: EXPANDER_CAPS.commentMaxClicks,
    replyMaxClicks: EXPANDER_CAPS.replyMaxClicks,
  };

  const posts: ExtractedFacebookPostV2[] = [];
  const warnings: string[] = [];
  const notFound: string[] = [];

  for (const postId of postIds) {
    const ref = elementStore.get(postId);
    const postEl = ref?.deref() as HTMLElement | undefined;

    if (!postEl || !postEl.isConnected) {
      notFound.push(postId);
      warnings.push(`Post ${postId} not found in DOM - page may have changed since last scan`);
      continue;
    }

    try {
      const context = resolveContext(doc, postEl, scenario, url);

      const expansionStats = await expandPost(
        postEl,
        env,
        caps,
        () => findSeeMoreInBody(postEl),
        () => findViewCommentsButtons(postEl),
        () => findViewRepliesButtons(postEl),
        expandOpts.body,
        expandOpts.comments,
        expandOpts.replies
      );
      warnings.push(...expansionStats.warnings);

      const post = extractPost(postEl, context, expansionStats, env);
      posts.push(post);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`expandAndExtract failed for ${postId}: ${msg}`);
      env.log.error('pipeline: expandAndExtract threw', err);
    }
  }

  return { posts, warnings, notFound };
}

function _emptyExpansionStats() {
  return {
    bodyClicks: 0, bodyMs: 0,
    commentClicks: 0, commentMs: 0,
    replyClicks: 0, replyMs: 0,
    totalClicks: 0, totalMs: 0,
    mutationNodes: 0,
    hitClickCap: false, hitTimeCap: false, hitMutationCap: false,
    warnings: [],
  };
}

function _buildRejectionReasons(total: number, accepted: number): Record<string, number> {
  return { rejected: total - accepted, accepted };
}
