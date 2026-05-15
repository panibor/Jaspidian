/**
 * Popup UI: vault status, first-run wizard, scan, post list, export.
 * Export is handled by the background service worker which forwards
 * notes to the Obsidian plugin running on localhost.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MESSAGE_KIND, DEFAULT_COMMENT_MODE, DEFAULT_VAULT_PATTERN } from '../shared/constants';
import type {
  CommentMode,
  ExportResponse,
  ExportResultItemV2,
  ExtractedFacebookPostV2,
  ScanResponse,
  VaultEntry,
  VaultInfoResponse,
} from '../shared/types';
import { STRINGS } from './strings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VaultStatus = 'checking' | 'connected' | 'disconnected';

/** Per-post result row shown in DoneView. */
interface ResultRow {
  postId: string;
  title: string;
  status: 'ok' | 'skipped' | 'failed';
  notePath?: string;
  error?: string;
  warnings: string[];
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'posts'; posts: ExtractedFacebookPostV2[]; tabId: number }
  | { kind: 'processing'; total: number; completed: number; currentTitle: string; remaining: string[]; results: ResultRow[]; tabId: number; posts: ExtractedFacebookPostV2[] }
  | { kind: 'done'; ok: number; failed: number; rows: ResultRow[] }
  | { kind: 'error'; message: string };

interface StoredSettings {
  commentMode: CommentMode;
  vaultPattern: string;
  pluginToken?: string;
  vaults?: VaultEntry[];
  firstRunComplete?: boolean;
}

// ---------------------------------------------------------------------------
// Colours — two palettes keyed to prefers-color-scheme
// Logo is deep crimson/red: #FF2E12 bright, #C20A06 medium, #300000 darkest
// ---------------------------------------------------------------------------

const DARK = {
  bg: '#150202', surface: '#0d0101', card: '#220505',
  accent: '#C91200', accentHover: '#FF2E12',
  green: '#22c55e', red: '#ef4444', yellow: '#f59e0b',
  text: '#f2e6e6', muted: '#b07070',
  border: 'rgba(255,46,18,0.13)', white: '#ffffff',
};

const LIGHT = {
  bg: '#f5f5f5', surface: '#ffffff', card: '#ebebeb',
  accent: '#C91200', accentHover: '#a50e00',
  green: '#16a34a', red: '#dc2626', yellow: '#b45309',
  text: '#111111', muted: '#555555',
  border: 'rgba(0,0,0,0.15)', white: '#ffffff',
};

function useTheme() {
  const mq = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
  const [dark, setDark] = React.useState(mq?.matches ?? true);
  React.useEffect(() => {
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mq]);
  return dark ? DARK : LIGHT;
}

function makeStyles(C: typeof DARK) {
  return {
    root: {
      width: 360, minHeight: 240, background: C.bg, color: C.text,
      fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 13,
      display: 'flex', flexDirection: 'column',
    } as React.CSSProperties,
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px 8px', borderBottom: `1px solid ${C.border}`, background: C.surface,
    } as React.CSSProperties,
    headerTitle: { fontWeight: 700, fontSize: 14, color: C.accent, margin: 0 } as React.CSSProperties,
    vaultBadge: {
      display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
      color: C.muted, cursor: 'default', userSelect: 'none',
    } as React.CSSProperties,
    body: { flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 } as React.CSSProperties,
    btn: {
      display: 'block', width: '100%', padding: '9px 14px', border: 'none',
      borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
      textAlign: 'center', transition: 'opacity .15s',
    } as React.CSSProperties,
    btnPrimary: { background: C.accent, color: C.white } as React.CSSProperties,
    btnSecondary: { background: C.card, color: C.text } as React.CSSProperties,
    btnGreen: { background: C.green, color: C.white } as React.CSSProperties,
    btnSm: {
      display: 'inline-block', padding: '5px 10px', border: 'none', borderRadius: 5,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', background: C.card, color: C.text,
    } as React.CSSProperties,
    card: { background: C.card, borderRadius: 7, padding: '10px 12px', border: `1px solid ${C.border}` } as React.CSSProperties,
    postCard: {
      background: C.surface, borderRadius: 7, padding: '9px 11px',
      border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start',
      gap: 8, cursor: 'pointer',
    } as React.CSSProperties,
    postCardSelected: { borderColor: C.accent, borderWidth: 2 } as React.CSSProperties,
    postTitle: { fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 3, lineHeight: 1.4 } as React.CSSProperties,
    postMeta: { fontSize: 11, color: C.muted, display: 'flex', gap: 8, flexWrap: 'wrap' } as React.CSSProperties,
    scrollBox: { overflowY: 'auto', maxHeight: 280, display: 'flex', flexDirection: 'column', gap: 6 } as React.CSSProperties,
    row: { display: 'flex', gap: 6, alignItems: 'center' } as React.CSSProperties,
    modeSelect: {
      flex: 1, background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 5, color: C.text, padding: '5px 8px', fontSize: 12,
    } as React.CSSProperties,
    statusBox: { textAlign: 'center', padding: '24px 0', color: C.muted } as React.CSSProperties,
    dot: (color: string): React.CSSProperties => ({
      width: 7, height: 7, borderRadius: '50%', background: color,
      display: 'inline-block', flexShrink: 0,
    }),
    warningBox: {
      background: 'rgba(245,158,11,.12)', border: `1px solid rgba(245,158,11,.4)`,
      borderRadius: 6, padding: '8px 10px', fontSize: 11, color: C.yellow,
    } as React.CSSProperties,
    errorBox: {
      background: 'rgba(220,38,38,.10)', border: `1px solid rgba(220,38,38,.35)`,
      borderRadius: 6, padding: '10px 12px', fontSize: 12, color: C.red,
    } as React.CSSProperties,
    successBox: {
      background: 'rgba(34,197,94,.10)', border: `1px solid rgba(34,197,94,.35)`,
      borderRadius: 6, padding: '10px 12px', fontSize: 12, color: C.green,
    } as React.CSSProperties,
    wizardStep: { fontSize: 11, color: C.muted, marginBottom: 8 } as React.CSSProperties,
  };
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const SPINNER_CSS = `
@keyframes fb2ob-spin { to { transform: rotate(360deg); } }
.fb2ob-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(200,50,0,.2);
  border-top-color: #C91200; border-radius: 50%;
  animation: fb2ob-spin .7s linear infinite; margin: 0 auto;
}
.fb2ob-pulse { animation: fb2ob-spin 1.2s linear infinite; border-top-color: #FF2E12; }
`;
function InjectStyle() { return <style>{SPINNER_CSS}</style>; }
function Spinner({ pulse = false }: { pulse?: boolean }) {
  return <div className={`fb2ob-spinner${pulse ? ' fb2ob-pulse' : ''}`} />;
}

// ---------------------------------------------------------------------------
// Theme context so sub-components can access C + S without prop-drilling
// ---------------------------------------------------------------------------

type Theme = { C: typeof DARK; S: ReturnType<typeof makeStyles> };
const ThemeCtx = React.createContext<Theme>({ C: DARK, S: makeStyles(DARK) });
function useC() { return React.useContext(ThemeCtx).C; }
function useS() { return React.useContext(ThemeCtx).S; }

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header({ vaultStatus, vaultName, onRetry }: {
  vaultStatus: VaultStatus;
  vaultName?: string;
  onRetry: () => void;
}) {
  const C = useC(); const S = useS();
  const dot = vaultStatus === 'checking' ? C.yellow : vaultStatus === 'connected' ? C.green : C.muted;
  const label =
    vaultStatus === 'checking' ? 'Checking...' :
    vaultStatus === 'connected' ? (vaultName || 'Plugin connected') :
    'Plugin offline';

  return (
    <div style={S.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <img src="assets/logo-2.png" alt="" style={{ height: 22, width: 22, objectFit: 'cover', flexShrink: 0, borderRadius: 4 }} />
        <p style={S.headerTitle}>Jaspidian</p>
      </div>
      <div
        style={S.vaultBadge}
        title={vaultStatus === 'disconnected' ? 'Click to retry' : (vaultName || '')}
        onClick={vaultStatus === 'disconnected' ? onRetry : undefined}
        role={vaultStatus === 'disconnected' ? 'button' : undefined}
      >
        <span style={S.dot(dot)} />
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function WizardView({ vaultStatus, onRetry }: { vaultStatus: VaultStatus; onRetry: () => void }) {
  const C = useC(); const S = useS();
  return (
    <div style={S.body}>
      <div style={S.card}>
        <p style={S.wizardStep}>Step 1 of 2 — Connect to Obsidian</p>
        <p style={{ margin: '0 0 10px', lineHeight: 1.6, color: C.text }}>
          Install the <strong>Jaspidian</strong> plugin in Obsidian to save notes directly into your vault.
        </p>
        <ol style={{ margin: '0 0 12px', paddingLeft: 18, color: C.muted, lineHeight: 2.1, fontSize: 12 }}>
          <li>Copy the <code>obsidian-plugin</code> folder into your vault's <code>.obsidian/plugins/jaspidian/</code></li>
          <li>In Obsidian → Settings → Community plugins → enable <strong>Jaspidian</strong></li>
          <li>Come back here and click <strong>Retry</strong></li>
        </ol>
        {vaultStatus === 'checking' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spinner />
            <span style={{ color: C.muted, fontSize: 12 }}>Checking…</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={S.dot(C.red)} />
              <span style={{ color: '#fca5a5', fontSize: 12 }}>Plugin not detected</span>
            </div>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={onRetry}>
              Retry connection
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function IdleView({ isOnFacebook, onScan }: { isOnFacebook: boolean | null; onScan: () => void }) {
  const C = useC(); const S = useS();
  if (isOnFacebook === false) {
    return (
      <div style={S.body}>
        <div style={S.errorBox}>{STRINGS.notOnFacebook}</div>
      </div>
    );
  }
  return (
    <div style={S.body}>
      <p style={{ margin: 0, color: C.muted, lineHeight: 1.6 }}>
        Open a Facebook feed, group, or post — then scan to capture visible posts.
      </p>
      <button style={{ ...S.btn, ...S.btnPrimary }} onClick={onScan}>
        {STRINGS.scanButton}
      </button>
    </div>
  );
}

function ScanningView({ deep = false }: { deep?: boolean }) {
  const C = useC(); const S = useS();
  return (
    <div style={S.body}>
      <div style={S.statusBox}>
        <Spinner pulse />
        <p style={{ marginTop: 12 }}>{deep ? 'Scanning post…' : STRINGS.scanning}</p>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          {deep ? 'Expanding "See more", loading comments and replies…' : 'Finding posts on the page…'}
        </p>
      </div>
    </div>
  );
}

function ExportingView() {
  const S = useS();
  return (
    <div style={S.body}>
      <div style={S.statusBox}>
        <Spinner pulse />
        <p style={{ marginTop: 12 }}>{STRINGS.exporting}</p>
      </div>
    </div>
  );
}

function ProcessingView({ completed, total, currentTitle }: {
  completed: number; total: number; currentTitle: string;
}) {
  const C = useC(); const S = useS();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div style={S.body}>
      <div style={S.statusBox}>
        <Spinner pulse />
        <p style={{ marginTop: 12, fontWeight: 600 }}>
          Processing {completed + 1} of {total}
        </p>
        {currentTitle && (
          <p style={{ fontSize: 11, color: C.muted, marginTop: 4, maxWidth: 280,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTitle}
          </p>
        )}
        <div style={{ marginTop: 10, height: 4, background: C.border, borderRadius: 2, width: '100%', maxWidth: 280 }}>
          <div style={{ height: '100%', background: C.accent, borderRadius: 2,
            width: `${pct}%`, transition: 'width .3s ease' }} />
        </div>
        <p style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          Opening Facebook modal, scanning, saving to Obsidian…
        </p>
      </div>
    </div>
  );
}

function PostCard({ post, selected, onToggle }: {
  post: ExtractedFacebookPostV2; selected: boolean; onToggle: () => void;
}) {
  const C = useC(); const S = useS();
  const title = post.title || post.body.slice(0, 80) || '(no text)';
  const group = post.context.groupName || post.context.pageName || post.context.profileName;

  return (
    <div
      style={{ ...S.postCard, ...(selected ? S.postCardSelected : {}) }}
      onClick={onToggle} role="checkbox" aria-checked={selected}
    >
      <input
        type="checkbox" checked={selected} onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: 1, accentColor: C.accent, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.postTitle} title={title}>
          {title.length > 72 ? title.slice(0, 72) + '...' : title}
        </div>
        <div style={S.postMeta}>
          {post.authorName && <span>{STRINGS.author} {post.authorName}</span>}
          {group && <span>{STRINGS.group} {group}</span>}
          {post.images.length > 0 && <span>{post.images.length} {STRINGS.images}</span>}
          {post.comments.length > 0 && <span>{post.comments.length} {STRINGS.comments}</span>}
        </div>
      </div>
    </div>
  );
}

function PostsView({
  posts, selectedIds, commentMode, vaults, selectedVault,
  onToggle, onCommentModeChange, onVaultChange, onExport, onRescan,
}: {
  posts: ExtractedFacebookPostV2[]; selectedIds: Set<string>; commentMode: CommentMode;
  vaults: VaultEntry[]; selectedVault: string;
  onToggle: (id: string) => void; onCommentModeChange: (m: CommentMode) => void;
  onVaultChange: (path: string) => void; onExport: () => void; onRescan: () => void;
}) {
  const C = useC(); const S = useS();
  const allSelected = posts.every(p => selectedIds.has(p.id));
  const nSelected = posts.filter(p => selectedIds.has(p.id)).length;
  const canExport = nSelected > 0 && (vaults.length === 0 || selectedVault !== '');

  return (
    <div style={S.body}>
      <div style={{ ...S.row, justifyContent: 'space-between' }}>
        <span style={{ color: C.muted, fontSize: 12 }}>
          {posts.length} post{posts.length !== 1 ? 's' : ''} found
        </span>
        <button
          style={S.btnSm}
          onClick={() => posts.forEach(p => { if (allSelected === selectedIds.has(p.id)) onToggle(p.id); })}
        >
          {allSelected ? STRINGS.deselectAll : STRINGS.selectAll}
        </button>
      </div>

      <div style={S.scrollBox}>
        {posts.map(post => (
          <PostCard key={post.id} post={post} selected={selectedIds.has(post.id)} onToggle={() => onToggle(post.id)} />
        ))}
      </div>

      <div style={S.row}>
        <label style={{ color: C.muted, fontSize: 12, flexShrink: 0 }}>{STRINGS.commentModeLabel}</label>
        <select
          style={S.modeSelect} value={commentMode}
          onChange={(e) => onCommentModeChange(e.target.value as CommentMode)}
        >
          <option value="all">{STRINGS.commentModeAll}</option>
          <option value="opOnly">{STRINGS.commentModeOpOnly}</option>
          <option value="opAnsweredOnly">{STRINGS.commentModeOpAnswered}</option>
        </select>
      </div>

      {vaults.length > 1 && (
        <div style={S.row}>
          <label style={{ color: C.muted, fontSize: 12, flexShrink: 0 }}>Save to vault</label>
          <select
            style={S.modeSelect} value={selectedVault}
            onChange={(e) => onVaultChange(e.target.value)}
          >
            <option value="">— pick a vault —</option>
            {vaults.map((v) => (
              <option key={v.path} value={v.path}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      {vaults.length === 1 && (
        <div style={{ fontSize: 11, color: C.muted }}>
          Saving to: <strong style={{ color: C.text }}>{vaults[0].name}</strong>
        </div>
      )}

      {vaults.length === 0 && (
        <div style={{ fontSize: 11, color: C.muted }}>
          Install the plugin in Obsidian to auto-save with images. Without it, posts are saved via Obsidian URI.
        </div>
      )}

      <button
        style={{ ...S.btn, ...(canExport ? S.btnGreen : S.btnSecondary), opacity: canExport ? 1 : 0.5 }}
        disabled={!canExport} onClick={onExport}
      >
        {nSelected > 0 ? `Export (${nSelected})` : 'Select posts to export'}
      </button>

      <button style={{ ...S.btn, ...S.btnSecondary }} onClick={onRescan}>Detect posts again</button>
    </div>
  );
}

function DoneView({ ok, failed, rows, onScanAgain }: {
  ok: number; failed: number; rows: ResultRow[]; onScanAgain: () => void;
}) {
  const C = useC(); const S = useS();

  const summaryBox = ok === 0 ? S.errorBox : failed === 0 ? S.successBox : S.warningBox;
  const summaryText = ok === 0
    ? STRINGS.exportNone(failed)
    : failed === 0
      ? STRINGS.exportSuccess(ok)
      : STRINGS.exportPartial(ok, failed);

  return (
    <div style={S.body}>
      <div style={summaryBox}>{summaryText}</div>

      {/* Per-post result rows */}
      <div style={{
        marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 6,
        overflow: 'hidden', fontSize: 11,
      }}>
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          const icon = row.status === 'failed' ? '✗' : row.status === 'skipped' ? '↷' : '✓';
          const iconColor = row.status === 'failed' ? C.red : row.status === 'skipped' ? C.muted : C.green;
          const title = row.title.length > 48 ? row.title.slice(0, 45) + '…' : row.title;

          // Reason line: failure error, or path on success
          const reason = row.status === 'failed'
            ? (row.error || 'Unknown error')
            : row.notePath
              ? row.notePath.split(/[\\/]/).pop()  // just filename
              : 'Saved';

          return (
            <div key={row.postId} style={{
              padding: '5px 8px',
              borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
              background: C.surface,
            }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: iconColor, fontWeight: 700, flexShrink: 0 }}>{icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {title}
                  </div>
                  <div style={{ color: row.status === 'failed' ? C.red : C.muted, marginTop: 1, wordBreak: 'break-word' }}>
                    {reason}
                  </div>
                  {row.warnings.length > 0 && row.status !== 'failed' && (
                    <div style={{ color: C.yellow, marginTop: 1 }}>
                      {row.warnings.join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button style={{ ...S.btn, ...S.btnPrimary, marginTop: 8 }} onClick={onScanAgain}>Scan more posts</button>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const S = useS();
  return (
    <div style={S.body}>
      <div style={S.errorBox}>{message}</div>
      <button style={{ ...S.btn, ...S.btnSecondary }} onClick={onRetry}>{STRINGS.retryButton}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root app
// ---------------------------------------------------------------------------

function App() {
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('checking');
  const [vaultName, setVaultName] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [settings, setSettings] = useState<StoredSettings>({
    commentMode: DEFAULT_COMMENT_MODE as CommentMode,
    vaultPattern: DEFAULT_VAULT_PATTERN,
    firstRunComplete: false,
    vaults: [],
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedVault, setSelectedVault] = useState<string>('');
  const [isOnFacebook, setIsOnFacebook] = useState<boolean | null>(null);
  const initDone = useRef(false);

  // ---- Vault probe ----
  const probeVault = useCallback(() => {
    setVaultStatus('checking');
    chrome.runtime.sendMessage(
      { v: 2, type: MESSAGE_KIND.VAULT_PROBE_REQUEST },
      (res: VaultInfoResponse | undefined) => {
        if (chrome.runtime.lastError || !res?.ok) {
          setVaultStatus('disconnected');
        } else {
          setVaultStatus('connected');
          setVaultName((res as any).vaultName || (res as any).vaultRoot?.split(/[\\/]/).pop());
        }
      }
    );
  }, []);

  // ---- Init ----
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    chrome.storage.sync.get('settings_v2', (data) => {
      if (data.settings_v2) {
        setSettings((s) => ({ ...s, ...data.settings_v2 }));
        // Auto-select if only one vault configured
        const vaults: VaultEntry[] = data.settings_v2.vaults || [];
        if (vaults.length === 1) setSelectedVault(vaults[0].path);
      }
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setIsOnFacebook((tabs[0]?.url ?? '').includes('facebook.com'));
    });

    if (chrome.storage.session) {
      chrome.storage.session.get('lastScan', (data) => {
        const cached = data.lastScan as { posts: ExtractedFacebookPostV2[]; tabId?: number } | undefined;
        if (cached?.posts?.length) {
          setPhase({ kind: 'posts', posts: cached.posts, tabId: cached.tabId ?? 0 });
          setSelectedIds(new Set(cached.posts.map((p) => p.id)));
        }
      });
    }

    probeVault();
  }, [probeVault]);

  // ---- Persist settings ----
  const updateSettings = useCallback((patch: Partial<StoredSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      chrome.storage.sync.set({ settings_v2: next });
      return next;
    });
  }, []);

  // ---- Scan ----
  const handleScan = useCallback(() => {
    setPhase({ kind: 'scanning' });
    chrome.runtime.sendMessage(
      {
        v: 2, type: MESSAGE_KIND.SCAN_REQUEST,
        // Expansion is deliberately disabled here — clicking DOM elements during scan
        // opens random posts and locks up Facebook. Expansion runs at export time instead.
        opts: { expand: { body: false, comments: false, replies: false }, commentMode: settings.commentMode },
      },
      (res: ScanResponse | undefined) => {
        if (chrome.runtime.lastError || !res) {
          setPhase({ kind: 'error', message: chrome.runtime.lastError?.message ?? 'No response — is the extension injected?' });
          return;
        }
        if (!res.ok || !res.envelope) {
          setPhase({ kind: 'error', message: res.error ?? 'Scan failed' });
          return;
        }
        const posts = res.envelope.posts;
        if (posts.length === 0) { setPhase({ kind: 'error', message: STRINGS.noPostsDetected }); return; }
        const tabId = res.tabId ?? 0;
        setPhase({ kind: 'posts', posts, tabId });
        setSelectedIds(new Set(posts.map((p) => p.id)));
        if (chrome.storage.session) chrome.storage.session.set({ lastScan: { posts, tabId } });
      }
    );
  }, [settings.commentMode]);

  // ---- Export: sequential modal scan + write, one post at a time ----
  // The popup drives the loop so it can show live progress after each post.
  const handleExport = useCallback(() => {
    if (phase.kind !== 'posts') return;
    const toExport = phase.posts.filter((p) => selectedIds.has(p.id));
    if (toExport.length === 0) return;

    const vaults = settings.vaults || [];
    const activeVaultPath = selectedVault || (vaults.length === 1 ? vaults[0].path : '');
    const activeVaultEntry = vaults.find((v) => v.path === activeVaultPath);
    const exportSettings = {
      tabId: phase.tabId,
      posts: phase.posts,
      commentMode: settings.commentMode,
      vaultPattern: settings.vaultPattern,
      pluginToken: settings.pluginToken,
      vaultPath: activeVaultPath,
      vaultName: activeVaultEntry?.name || '',
    };

    // Enter processing phase — first post fires immediately via useEffect
    setPhase({
      kind: 'processing',
      total: toExport.length,
      completed: 0,
      currentTitle: toExport[0]?.title || toExport[0]?.body?.slice(0, 50) || '…',
      remaining: toExport.map((p) => p.id),
      results: [],
      tabId: exportSettings.tabId,
      posts: exportSettings.posts,
    });

    // Store export settings for the processing loop
    exportSettingsRef.current = exportSettings;
  }, [phase, selectedIds, settings, selectedVault]);

  // Ref that holds export settings across renders during the processing loop
  const exportSettingsRef = useRef<{
    tabId: number; posts: ExtractedFacebookPostV2[];
    commentMode: string; vaultPattern: string;
    pluginToken?: string; vaultPath: string; vaultName: string;
  } | null>(null);

  // Drive the processing loop: whenever phase is 'processing' with remaining posts, fire the next one
  useEffect(() => {
    if (phase.kind !== 'processing') return;
    if (phase.remaining.length === 0) {
      // All done
      const ok = phase.results.filter((r) => r.status === 'ok' || r.status === 'skipped').length;
      const failed = phase.results.filter((r) => r.status === 'failed').length;
      setPhase({ kind: 'done', ok, failed, rows: phase.results });
      if (chrome.storage.session) chrome.storage.session.remove('lastScan');
      return;
    }

    const [currentId, ...rest] = phase.remaining;
    const post = phase.posts.find((p) => p.id === currentId);
    const cfg = exportSettingsRef.current;
    if (!cfg) return;

    chrome.runtime.sendMessage(
      {
        v: 2, type: MESSAGE_KIND.MODAL_EXPORT_ONE,
        tabId: cfg.tabId, postId: currentId,
        permalink: post?.permalink || '',
        commentMode: cfg.commentMode, vaultPattern: cfg.vaultPattern,
        pluginToken: cfg.pluginToken,
        vaultPath: cfg.vaultPath, vaultName: cfg.vaultName,
      },
      (res: { ok: boolean; result?: ExportResultItemV2; title?: string; error?: string } | undefined) => {
        const result: ResultRow = res?.result
          ? {
              postId: res.result.postId,
              title: res.title || post?.title || currentId,
              status: res.result.status,
              notePath: res.result.notePath,
              error: res.result.error,
              warnings: res.result.warnings ?? [],
            }
          : {
              postId: currentId,
              title: post?.title || currentId,
              status: 'failed',
              error: chrome.runtime.lastError?.message || res?.error || 'No response',
              warnings: [],
            };

        const nextTitle = rest.length > 0
          ? (phase.posts.find((p) => p.id === rest[0])?.title || rest[0])
          : '';

        setPhase((prev) => {
          if (prev.kind !== 'processing') return prev;
          return {
            ...prev,
            completed: prev.completed + 1,
            currentTitle: nextTitle,
            remaining: rest,
            results: [...prev.results, result],
          };
        });
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);


  // ---- Toggle selection ----
  const togglePost = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Mark first run complete once connected
  useEffect(() => {
    if (vaultStatus === 'connected' && !settings.firstRunComplete) {
      updateSettings({ firstRunComplete: true });
    }
  }, [vaultStatus, settings.firstRunComplete, updateSettings]);

  const showWizard = false;
  const C = useTheme();
  const S = makeStyles(C);

  return (
    <ThemeCtx.Provider value={{ C, S }}>
    <>
      <InjectStyle />
      <div style={S.root}>
        <Header vaultStatus={vaultStatus} vaultName={vaultName} onRetry={probeVault} />

        {showWizard && <WizardView vaultStatus={vaultStatus} onRetry={probeVault} />}

        {!showWizard && phase.kind === 'idle' && (
          <IdleView isOnFacebook={isOnFacebook} onScan={handleScan} />
        )}
        {!showWizard && phase.kind === 'scanning' && <ScanningView />}
        {!showWizard && phase.kind === 'posts' && (
          <PostsView
            posts={phase.posts} selectedIds={selectedIds} commentMode={settings.commentMode}
            vaults={settings.vaults || []} selectedVault={selectedVault}
            onToggle={togglePost} onCommentModeChange={(m) => updateSettings({ commentMode: m })}
            onVaultChange={setSelectedVault} onExport={handleExport} onRescan={handleScan}
          />
        )}
        {!showWizard && phase.kind === 'processing' && (
          <ProcessingView completed={phase.completed} total={phase.total} currentTitle={phase.currentTitle} />
        )}
        {!showWizard && phase.kind === 'done' && (
          <DoneView ok={phase.ok} failed={phase.failed} rows={phase.rows} onScanAgain={() => setPhase({ kind: 'idle' })} />
        )}
        {!showWizard && phase.kind === 'error' && (
          <ErrorView message={phase.message} onRetry={() => setPhase({ kind: 'idle' })} />
        )}
      </div>
    </>
    </ThemeCtx.Provider>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: 'sans-serif', fontSize: 12, color: '#ef4444', background: '#1a0000', minHeight: 80 }}>
          <strong>Popup error:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) { createRoot(rootEl).render(<ErrorBoundary><App /></ErrorBoundary>); }
