/**
 * Popup UI: vault status, scan, post list, batch export trigger + progress.
 * The export loop itself lives in the background service worker
 * (handlers/exportBatch.ts) so it survives the popup closing.
 *
 * Vanilla DOM, no framework. document.createElement only - never innerHTML.
 */
import { el, svg, mount, type Child } from '../shared/dom';
import { currentPalette, onThemeChange, type Palette } from '../shared/theme';
import { MESSAGE_KIND, DEFAULT_COMMENT_MODE, DEFAULT_VAULT_PATTERN } from '../shared/constants';
import { STRINGS } from './strings';
import type {
  CommentMode,
  ExportBatchStartResponse,
  ExportBatchStatusResponse,
  ExportJobState,
  ExportResultRow,
  ExtractedFacebookPostV2,
  ScanResponse,
  VaultEntry,
  VaultInfoResponse,
} from '../shared/types';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type VaultStatus = 'checking' | 'connected' | 'disconnected';

interface StoredSettings {
  commentMode: CommentMode;
  vaultPattern: string;
  pluginToken?: string;
  vaults?: VaultEntry[];
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'posts'; posts: ExtractedFacebookPostV2[] }
  | { kind: 'processing'; total: number; completed: number; currentTitle: string }
  | { kind: 'done'; ok: number; failed: number; rows: ExportResultRow[] }
  | { kind: 'error'; message: string };

interface AppState {
  vaultStatus: VaultStatus;
  vaultName?: string;
  phase: Phase;
  settings: StoredSettings;
  selectedIds: Set<string>;
  selectedVault: string;
  isOnFacebook: boolean | null;
}

let C: Palette = currentPalette();
let state: AppState = {
  vaultStatus: 'checking',
  phase: { kind: 'idle' },
  settings: {
    commentMode: DEFAULT_COMMENT_MODE as CommentMode,
    vaultPattern: DEFAULT_VAULT_PATTERN,
    vaults: [],
  },
  selectedIds: new Set<string>(),
  selectedVault: '',
  isOnFacebook: null,
};

function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  render();
}

// ---------------------------------------------------------------------------
// Render entry
// ---------------------------------------------------------------------------

function render(): void {
  const root = document.getElementById('root');
  if (root) mount(root, AppView());
}

function AppView(): HTMLElement {
  return el('div', { style: rootStyle() }, [
    HeaderView(),
    PhaseView(),
  ]);
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function HeaderView(): HTMLElement {
  const dotColor =
    state.vaultStatus === 'checking' ? C.yellow :
    state.vaultStatus === 'connected' ? C.green : C.muted;
  const label =
    state.vaultStatus === 'checking' ? 'Checking...' :
    state.vaultStatus === 'connected' ? (state.vaultName || 'Plugin connected') :
    'Plugin offline';

  return el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: `1px solid ${C.border}`, background: C.surface } }, [
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } }, [
      el('img', {
        src: chrome.runtime.getURL('assets/logo_48.png'),
        alt: '',
        style: { height: '22px', width: '22px', objectFit: 'cover', flexShrink: '0', borderRadius: '4px' },
      }),
      el('p', { style: { fontWeight: '700', fontSize: '14px', color: C.accent, margin: '0' }, text: 'Jaspidian' }),
    ]),
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
      el('div', {
        title: state.vaultStatus === 'disconnected' ? 'Click to retry' : (state.vaultName || ''),
        onclick: state.vaultStatus === 'disconnected' ? probeVault : undefined,
        role: state.vaultStatus === 'disconnected' ? 'button' : undefined,
        style: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.muted, cursor: state.vaultStatus === 'disconnected' ? 'pointer' : 'default', userSelect: 'none' },
      }, [
        el('span', { style: dotStyle(dotColor) }),
        el('span', { style: { maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, text: label }),
      ]),
      el('button', {
        type: 'button',
        title: 'Options',
        'aria-label': 'Options',
        onclick: openOptions,
        style: { background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, padding: '2px', lineHeight: '0', display: 'flex' },
      }, [gearIcon()]),
    ]),
  ]);
}

function gearIcon(): SVGElement {
  return svg('svg', {
    width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, [
    svg('circle', { cx: '12', cy: '12', r: '3' }),
    svg('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }),
  ]);
}

// ---------------------------------------------------------------------------
// Phase views
// ---------------------------------------------------------------------------

function PhaseView(): HTMLElement {
  switch (state.phase.kind) {
    case 'idle': return IdleView();
    case 'scanning': return ScanningView();
    case 'posts': return PostsView(state.phase.posts);
    case 'processing': return ProcessingView(state.phase.total, state.phase.completed, state.phase.currentTitle);
    case 'done': return DoneView(state.phase.ok, state.phase.failed, state.phase.rows);
    case 'error': return ErrorView(state.phase.message);
  }
}

function IdleView(): HTMLElement {
  if (state.isOnFacebook === false) {
    return el('div', { style: bodyStyle() }, [
      el('div', { style: errorBoxStyle(), text: STRINGS.notOnFacebook }),
    ]);
  }
  return el('div', { style: bodyStyle() }, [
    el('p', { style: { margin: '0', color: C.muted, lineHeight: '1.6' }, text: 'Open a Facebook feed, group, or post, then scan to capture visible posts.' }),
    el('button', {
      style: { ...btnStyle(), ...btnPrimaryStyle() },
      onclick: handleScan,
      text: STRINGS.scanButton,
    }),
  ]);
}

function ScanningView(): HTMLElement {
  return el('div', { style: bodyStyle() }, [
    el('div', { style: statusBoxStyle() }, [
      Spinner(true),
      el('p', { style: { marginTop: '12px' }, text: STRINGS.scanning }),
      el('p', { style: { fontSize: '11px', color: C.muted, marginTop: '4px' }, text: 'Finding posts on the page...' }),
    ]),
  ]);
}

function PostsView(posts: ExtractedFacebookPostV2[]): HTMLElement {
  const allSelected = posts.every(p => state.selectedIds.has(p.id));
  const nSelected = posts.filter(p => state.selectedIds.has(p.id)).length;
  const vaults = state.settings.vaults || [];
  const canExport = nSelected > 0 && (vaults.length === 0 || state.selectedVault !== '');

  return el('div', { style: bodyStyle() }, [
    el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' } }, [
      el('span', { style: { color: C.muted, fontSize: '12px' }, text: `${posts.length} post${posts.length !== 1 ? 's' : ''} found` }),
      el('button', {
        style: btnSmStyle(),
        onclick: () => {
          if (allSelected) state.selectedIds.clear();
          else for (const p of posts) state.selectedIds.add(p.id);
          persistSelections();
          render();
        },
        text: allSelected ? STRINGS.deselectAll : STRINGS.selectAll,
      }),
    ]),
    el('div', { style: scrollBoxStyle() }, posts.map(p => PostCard(p))),
    el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
      el('label', { style: { color: C.muted, fontSize: '12px', flexShrink: '0' }, text: STRINGS.commentModeLabel }),
      buildSelect(state.settings.commentMode, [
        { value: 'all', label: STRINGS.commentModeAll },
        { value: 'opOnly', label: STRINGS.commentModeOpOnly },
        { value: 'opAnsweredOnly', label: STRINGS.commentModeOpAnswered },
      ], (val) => {
        const next = { ...state.settings, commentMode: val as CommentMode };
        setState({ settings: next });
        chrome.storage.sync.set({ settings_v2: next });
      }),
    ]),
    vaults.length > 1 ? el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
      el('label', { style: { color: C.muted, fontSize: '12px', flexShrink: '0' }, text: 'Save to vault' }),
      buildSelect(state.selectedVault, [
        { value: '', label: '- pick a vault -' },
        ...vaults.map(v => ({ value: v.path, label: v.name })),
      ], (val) => {
        state.selectedVault = val;
        persistSelections();
      }),
    ]) : null,
    vaults.length === 1 ? el('div', { style: { fontSize: '11px', color: C.muted } }, [
      'Saving to: ', el('strong', { style: { color: C.text }, text: vaults[0].name }),
    ]) : null,
    vaults.length === 0 ? el('div', { style: { fontSize: '11px', color: C.muted }, text: 'Install the plugin in Obsidian to auto-save with images. Without it, posts are saved via Obsidian URI.' }) : null,
    el('button', {
      style: { ...btnStyle(), ...(canExport ? btnGreenStyle() : btnSecondaryStyle()), opacity: canExport ? '1' : '0.5' },
      disabled: !canExport,
      onclick: handleExport,
      text: nSelected > 0 ? `Export (${nSelected})` : 'Select posts to export',
    }),
    el('button', { style: { ...btnStyle(), ...btnSecondaryStyle() }, onclick: handleScan, text: 'Detect posts again' }),
  ]);
}

function PostCard(post: ExtractedFacebookPostV2): HTMLElement {
  const selected = state.selectedIds.has(post.id);
  const title = post.title || post.body.slice(0, 80) || '(no text)';
  const trimmed = title.length > 72 ? title.slice(0, 72) + '...' : title;
  const group = post.context.groupName || post.context.pageName || post.context.profileName;

  const meta: Child[] = [];
  if (post.authorName) meta.push(el('span', { text: `${STRINGS.author} ${post.authorName}` }));
  if (group) meta.push(el('span', { text: `${STRINGS.group} ${group}` }));
  if (post.images.length > 0) meta.push(el('span', { text: `${post.images.length} ${STRINGS.images}` }));
  if (post.comments.length > 0) meta.push(el('span', { text: `${post.comments.length} ${STRINGS.comments}` }));

  return el('div', {
    role: 'checkbox',
    'aria-checked': String(selected),
    onclick: () => toggleSelected(post.id),
    style: {
      background: C.surface, borderRadius: '7px', padding: '9px 11px',
      border: `${selected ? '2px' : '1px'} solid ${selected ? C.accent : C.border}`,
      display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer',
    },
  }, [
    el('input', {
      type: 'checkbox',
      checked: selected,
      onchange: () => toggleSelected(post.id),
      onclick: (e: Event) => e.stopPropagation(),
      style: { marginTop: '1px', accentColor: C.accent, flexShrink: '0' },
    }),
    el('div', { style: { flex: '1', minWidth: '0' } }, [
      el('div', { title: title, style: { fontWeight: '600', fontSize: '12px', color: C.text, marginBottom: '3px', lineHeight: '1.4' }, text: trimmed }),
      el('div', { style: { fontSize: '11px', color: C.muted, display: 'flex', gap: '8px', flexWrap: 'wrap' } }, meta),
    ]),
  ]);
}

function ProcessingView(total: number, completed: number, currentTitle: string): HTMLElement {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return el('div', { style: bodyStyle() }, [
    el('div', { style: statusBoxStyle() }, [
      Spinner(true),
      el('p', { style: { marginTop: '12px', fontWeight: '600' }, text: `Processing ${Math.min(completed + 1, total)} of ${total}` }),
      currentTitle ? el('p', { style: { fontSize: '11px', color: C.muted, marginTop: '4px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, text: currentTitle }) : null,
      el('div', { style: { marginTop: '10px', height: '4px', background: C.border, borderRadius: '2px', width: '100%', maxWidth: '280px' } }, [
        el('div', { style: { height: '100%', background: C.accent, borderRadius: '2px', width: `${pct}%`, transition: 'width .3s ease' } }),
      ]),
      el('p', { style: { fontSize: '10px', color: C.muted, marginTop: '4px' }, text: 'Opening Facebook modal, scanning, saving to Obsidian...' }),
    ]),
  ]);
}

function DoneView(ok: number, failed: number, rows: ExportResultRow[]): HTMLElement {
  const summaryBox = ok === 0 ? errorBoxStyle() : failed === 0 ? successBoxStyle() : warningBoxStyle();
  const summaryText = ok === 0
    ? STRINGS.exportNone(failed)
    : failed === 0
      ? STRINGS.exportSuccess(ok)
      : STRINGS.exportPartial(ok, failed);

  const rowEls = rows.map((row, i) => {
    const isLast = i === rows.length - 1;
    const icon = row.status === 'failed' ? '✗' : row.status === 'skipped' ? '↷' : '✓';
    const iconColor = row.status === 'failed' ? C.red : row.status === 'skipped' ? C.muted : C.green;
    const titleText = row.title.length > 48 ? row.title.slice(0, 45) + '…' : row.title;
    const reason = row.status === 'failed'
      ? (row.error || 'Unknown error')
      : row.notePath
        ? (row.notePath.split(/[\\/]/).pop() || 'Saved')
        : 'Saved';
    return el('div', { style: { padding: '5px 8px', borderBottom: isLast ? 'none' : `1px solid ${C.border}`, background: C.surface } }, [
      el('div', { style: { display: 'flex', gap: '6px', alignItems: 'flex-start' } }, [
        el('span', { style: { color: iconColor, fontWeight: '700', flexShrink: '0' }, text: icon }),
        el('div', { style: { minWidth: '0' } }, [
          el('div', { style: { color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, text: titleText }),
          el('div', { style: { color: row.status === 'failed' ? C.red : C.muted, marginTop: '1px', wordBreak: 'break-word' }, text: reason }),
          row.warnings.length > 0 && row.status !== 'failed'
            ? el('div', { style: { color: C.yellow, marginTop: '1px' }, text: row.warnings.join(' · ') })
            : null,
        ]),
      ]),
    ]);
  });

  return el('div', { style: bodyStyle() }, [
    el('div', { style: summaryBox, text: summaryText }),
    el('div', { style: { marginTop: '8px', border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden', fontSize: '11px' } }, rowEls),
    el('button', { style: { ...btnStyle(), ...btnPrimaryStyle(), marginTop: '8px' }, onclick: handleScanAgain, text: 'Scan more posts' }),
  ]);
}

function ErrorView(message: string): HTMLElement {
  return el('div', { style: bodyStyle() }, [
    el('div', { style: errorBoxStyle(), text: message }),
    el('button', { style: { ...btnStyle(), ...btnSecondaryStyle() }, onclick: () => setState({ phase: { kind: 'idle' } }), text: STRINGS.retryButton }),
  ]);
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Spinner(pulse: boolean): HTMLElement {
  return el('div', { class: `jaspidian-spinner${pulse ? ' jaspidian-pulse' : ''}` });
}

function buildSelect(
  value: string,
  options: { value: string; label: string }[],
  onChange: (val: string) => void,
): HTMLElement {
  const select = el('select', {
    style: { flex: '1', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '5px', color: C.text, padding: '5px 8px', fontSize: '12px' },
    onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
  });
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    select.appendChild(o);
  }
  return select;
}

// ---------------------------------------------------------------------------
// Styles (palette-bound; rebuilt per render since C may flip with theme)
// ---------------------------------------------------------------------------

function rootStyle() {
  return { width: '360px', minHeight: '240px', background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '13px', display: 'flex', flexDirection: 'column' };
}
function bodyStyle() { return { flex: '1', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }; }
function btnStyle() { return { display: 'block', width: '100%', padding: '9px 14px', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textAlign: 'center', transition: 'opacity .15s', fontFamily: 'inherit' }; }
function btnPrimaryStyle() { return { background: C.accent, color: C.white }; }
function btnSecondaryStyle() { return { background: C.card, color: C.text }; }
function btnGreenStyle() { return { background: C.green, color: C.white }; }
function btnSmStyle() { return { display: 'inline-block', padding: '5px 10px', border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: C.card, color: C.text, fontFamily: 'inherit' }; }
function scrollBoxStyle() { return { overflowY: 'auto', maxHeight: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }; }
function statusBoxStyle() { return { textAlign: 'center', padding: '24px 0', color: C.muted }; }
function dotStyle(color: string) { return { width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: '0' }; }
function errorBoxStyle() { return { background: 'rgba(220,38,38,.10)', border: `1px solid rgba(220,38,38,.35)`, borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: C.red }; }
function successBoxStyle() { return { background: 'rgba(34,197,94,.10)', border: `1px solid rgba(34,197,94,.35)`, borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: C.green }; }
function warningBoxStyle() { return { background: 'rgba(245,158,11,.12)', border: `1px solid rgba(245,158,11,.4)`, borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: C.yellow }; }

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function probeVault(): void {
  setState({ vaultStatus: 'checking' });
  chrome.runtime.sendMessage(
    { v: 2, type: MESSAGE_KIND.VAULT_PROBE_REQUEST },
    (res: VaultInfoResponse | undefined) => {
      if (chrome.runtime.lastError || !res?.ok) {
        setState({ vaultStatus: 'disconnected', vaultName: undefined });
      } else {
        const name = (res as unknown as { vaultName?: string }).vaultName
          || (res.vaultRoot ?? '').split(/[\\/]/).pop();
        setState({ vaultStatus: 'connected', vaultName: name });
      }
    },
  );
}

function toggleSelected(id: string): void {
  if (state.selectedIds.has(id)) state.selectedIds.delete(id);
  else state.selectedIds.add(id);
  persistSelections();
  render();
}

function persistSelections(): void {
  if (state.phase.kind !== 'posts') return;
  if (!chrome.storage?.session) return;
  chrome.storage.session.set({
    lastSelections: { ids: [...state.selectedIds], vault: state.selectedVault },
  });
}

function handleScan(): void {
  setState({ phase: { kind: 'scanning' } });
  chrome.runtime.sendMessage(
    {
      v: 2, type: MESSAGE_KIND.SCAN_REQUEST,
      opts: { expand: { body: false, comments: false, replies: false }, commentMode: state.settings.commentMode },
    },
    (res: ScanResponse | undefined) => {
      if (chrome.runtime.lastError || !res) {
        setState({ phase: { kind: 'error', message: chrome.runtime.lastError?.message ?? 'No response, is the extension injected?' } });
        return;
      }
      if (!res.ok || !res.envelope) {
        setState({ phase: { kind: 'error', message: res.error ?? 'Scan failed' } });
        return;
      }
      const posts = res.envelope.posts;
      if (posts.length === 0) {
        setState({ phase: { kind: 'error', message: STRINGS.noPostsDetected } });
        return;
      }
      state.selectedIds = new Set(posts.map(p => p.id));
      setState({ phase: { kind: 'posts', posts } });
      if (chrome.storage?.session) chrome.storage.session.set({ lastScan: { posts } });
    },
  );
}

function handleExport(): void {
  if (state.phase.kind !== 'posts') return;
  const allPosts = state.phase.posts;
  const toExport = allPosts.filter(p => state.selectedIds.has(p.id));
  if (toExport.length === 0) return;

  setState({
    phase: {
      kind: 'processing',
      total: toExport.length,
      completed: 0,
      currentTitle: toExport[0]?.title || toExport[0]?.body?.slice(0, 50) || '...',
    },
  });

  chrome.runtime.sendMessage(
    {
      v: 2, type: MESSAGE_KIND.EXPORT_BATCH_START,
      posts: allPosts,
      postIds: toExport.map(p => p.id),
      commentMode: state.settings.commentMode,
      vaultPattern: state.settings.vaultPattern,
      pluginToken: state.settings.pluginToken,
    },
    (res: ExportBatchStartResponse | undefined) => {
      if (chrome.runtime.lastError || !res?.ok) {
        setState({ phase: { kind: 'error', message: chrome.runtime.lastError?.message ?? res?.error ?? 'Could not start export' } });
      }
    },
  );
}

function handleScanAgain(): void {
  state.selectedIds = new Set();
  setState({ phase: { kind: 'idle' }, selectedVault: '' });
  chrome.runtime.sendMessage(
    { v: 2, type: MESSAGE_KIND.EXPORT_BATCH_ACK },
    () => { void chrome.runtime.lastError; },
  );
  if (chrome.storage?.session) {
    chrome.storage.session.remove(['lastScan', 'lastSelections']);
  }
}

function openOptions(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
}

function phaseFromJob(job: ExportJobState): Phase {
  if (job.status === 'running') {
    return { kind: 'processing', total: job.total, completed: job.completed, currentTitle: job.currentTitle };
  }
  const ok = job.results.filter(r => r.status === 'ok' || r.status === 'skipped').length;
  const failed = job.results.filter(r => r.status === 'failed').length;
  return { kind: 'done', ok, failed, rows: job.results };
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init(): void {
  onThemeChange((p) => { C = p; render(); });

  chrome.storage.sync.get('settings_v2', (data) => {
    if (data.settings_v2) {
      state.settings = { ...state.settings, ...data.settings_v2 };
      const vaults: VaultEntry[] = data.settings_v2.vaults || [];
      if (vaults.length === 1) state.selectedVault = vaults[0].path;
      render();
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    setState({ isOnFacebook: (tabs[0]?.url ?? '').includes('facebook.com') });
  });

  chrome.runtime.sendMessage(
    { v: 2, type: MESSAGE_KIND.EXPORT_BATCH_STATUS },
    (res: ExportBatchStatusResponse | undefined) => {
      const job = res?.job ?? null;
      if (job) {
        setState({ phase: phaseFromJob(job) });
        return;
      }
      if (!chrome.storage?.session) return;
      chrome.storage.session.get(['lastScan', 'lastSelections'], (data) => {
        const cached = data.lastScan as { posts: ExtractedFacebookPostV2[] } | undefined;
        const selCached = data.lastSelections as { ids?: string[]; vault?: string } | undefined;
        if (cached?.posts?.length) {
          const ids = selCached?.ids && selCached.ids.length > 0
            ? selCached.ids.filter(id => cached.posts.some(p => p.id === id))
            : cached.posts.map(p => p.id);
          state.selectedIds = new Set(ids);
          setState({ phase: { kind: 'posts', posts: cached.posts } });
        }
        if (selCached?.vault) {
          state.selectedVault = selCached.vault;
          render();
        }
      });
    },
  );

  chrome.runtime.onMessage.addListener((msg: unknown) => {
    const m = msg as { v?: number; type?: string; job?: ExportJobState } | undefined;
    if (m?.v !== 2 || m.type !== MESSAGE_KIND.EXPORT_PROGRESS || !m.job) return;
    setState({ phase: phaseFromJob(m.job) });
  });

  probeVault();
  render();
}

init();
