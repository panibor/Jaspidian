/**
 * Options / settings page — vaults, note path pattern, comment mode.
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_COMMENT_MODE, DEFAULT_VAULT_PATTERN } from '../shared/constants';
import type { CommentMode, VaultEntry } from '../shared/types';

interface Settings {
  commentMode: CommentMode;
  vaultPattern: string;
  pluginToken?: string;
  vaults: VaultEntry[];
  firstRunComplete?: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  commentMode: DEFAULT_COMMENT_MODE as CommentMode,
  vaultPattern: DEFAULT_VAULT_PATTERN,
  pluginToken: '',
  vaults: [],
};

const C = {
  bg: '#f8fafc', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', accent: '#6d28d9', white: '#ffffff',
  green: '#16a34a', red: '#dc2626', lightRed: '#fee2e2',
};

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 620, margin: '0 auto', padding: '32px 24px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: 14, color: C.text, background: C.bg, minHeight: '100vh',
  },
  h1: { fontSize: 20, fontWeight: 700, margin: '0 0 4px' },
  subtitle: { color: C.muted, fontSize: 13, margin: '0 0 28px' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: '0 0 14px', paddingBottom: 6, borderBottom: `1px solid ${C.border}` },
  field: { marginBottom: 16 },
  label: { display: 'block', fontWeight: 500, marginBottom: 5, fontSize: 13 },
  hint: { fontSize: 11, color: C.muted, marginTop: 4 },
  input: {
    display: 'block', width: '100%', boxSizing: 'border-box' as const,
    padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6,
    fontSize: 13, color: C.text, background: C.white, outline: 'none',
  },
  inputSm: {
    padding: '6px 8px', border: `1px solid ${C.border}`, borderRadius: 5,
    fontSize: 12, color: C.text, background: C.white, outline: 'none',
  },
  select: {
    display: 'block', padding: '8px 10px', border: `1px solid ${C.border}`,
    borderRadius: 6, fontSize: 13, color: C.text, background: C.white, minWidth: 220,
  },
  btn: {
    padding: '9px 18px', border: 'none', borderRadius: 6,
    fontWeight: 600, fontSize: 13, cursor: 'pointer', background: C.accent, color: C.white,
  },
  btnSm: {
    padding: '5px 10px', border: 'none', borderRadius: 5,
    fontWeight: 600, fontSize: 12, cursor: 'pointer', background: C.accent, color: C.white,
  },
  btnDanger: {
    padding: '5px 10px', border: 'none', borderRadius: 5,
    fontWeight: 600, fontSize: 12, cursor: 'pointer', background: C.lightRed, color: C.red,
  },
  btnOutline: {
    padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 6,
    fontWeight: 600, fontSize: 13, cursor: 'pointer', background: C.white, color: C.text,
  },
  toast: (ok: boolean): React.CSSProperties => ({
    display: 'inline-block', marginLeft: 12, fontSize: 13,
    color: ok ? C.green : C.red, fontWeight: 500,
  }),
  resetLink: {
    display: 'inline-block', marginTop: 4, fontSize: 12,
    color: C.muted, cursor: 'pointer', textDecoration: 'underline',
  },
  vaultRow: {
    display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8,
    alignItems: 'center', marginBottom: 8,
  },
  vaultHeader: {
    display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8,
    marginBottom: 4,
  },
  vaultHeaderLabel: { fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase' as const },
};

function OptionsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultPath, setNewVaultPath] = useState('');

  useEffect(() => {
    chrome.storage.sync.get('settings_v2', (data) => {
      if (data.settings_v2) setSettings((s) => ({ ...s, ...data.settings_v2 }));
    });
  }, []);

  const handleSave = () => {
    chrome.storage.sync.set({ settings_v2: settings }, () => {
      setSaved(true);
      setTimeout(() => setSaved(null), 2500);
    });
  };

  const handleReset = () => {
    if (!confirm('Reset all settings to defaults?')) return;
    const fresh: Settings = { ...DEFAULT_SETTINGS, firstRunComplete: settings.firstRunComplete };
    setSettings(fresh);
    chrome.storage.sync.set({ settings_v2: fresh });
  };

  const set = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  const addVault = () => {
    const name = newVaultName.trim();
    const path = newVaultPath.trim();
    if (!name || !path) return;
    set({ vaults: [...(settings.vaults || []), { name, path }] });
    setNewVaultName('');
    setNewVaultPath('');
  };

  const removeVault = (i: number) => {
    set({ vaults: settings.vaults.filter((_, idx) => idx !== i) });
  };

  const updateVault = (i: number, patch: Partial<VaultEntry>) => {
    set({ vaults: settings.vaults.map((v, idx) => idx === i ? { ...v, ...patch } : v) });
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Jaspidian Settings</h1>
      <p style={S.subtitle}>Configure how posts are saved to your vault.</p>

      {/* Vaults */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>Obsidian vaults</h2>
        <p style={{ ...S.hint, marginBottom: 12, fontSize: 12 }}>
          Add each vault you want to save to. The extension shows a dropdown when you export so you can pick where the note goes.
          Make sure the Jaspidian Obsidian plugin is enabled in this vault.
        </p>

        {(settings.vaults || []).length > 0 && (
          <>
            <div style={S.vaultHeader}>
              <span style={S.vaultHeaderLabel}>Name</span>
              <span style={S.vaultHeaderLabel}>Path on disk</span>
              <span />
            </div>
            {settings.vaults.map((v, i) => (
              <div key={i} style={S.vaultRow}>
                <input
                  style={S.inputSm}
                  value={v.name}
                  onChange={(e) => updateVault(i, { name: e.target.value })}
                  placeholder="My vault"
                />
                <input
                  style={S.inputSm}
                  value={v.path}
                  onChange={(e) => updateVault(i, { path: e.target.value })}
                  placeholder="C:\Users\You\Documents\MyVault"
                />
                <button style={S.btnDanger} onClick={() => removeVault(i)}>Remove</button>
              </div>
            ))}
          </>
        )}

        {/* Add new row */}
        <div style={{ ...S.vaultRow, marginTop: 8 }}>
          <input
            style={S.inputSm}
            value={newVaultName}
            onChange={(e) => setNewVaultName(e.target.value)}
            placeholder="Vault name"
            onKeyDown={(e) => e.key === 'Enter' && addVault()}
          />
          <input
            style={S.inputSm}
            value={newVaultPath}
            onChange={(e) => setNewVaultPath(e.target.value)}
            placeholder="Full path, e.g. D:\My Vault"
            onKeyDown={(e) => e.key === 'Enter' && addVault()}
          />
          <button style={S.btnSm} onClick={addVault}>Add</button>
        </div>
      </div>

      {/* Note path */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>Note path pattern</h2>
        <div style={S.field}>
          <input
            style={S.input}
            type="text"
            value={settings.vaultPattern}
            onChange={(e) => set({ vaultPattern: e.target.value })}
            placeholder={DEFAULT_VAULT_PATTERN}
          />
          <p style={S.hint}>
            Variables: <code>{'{{year}}'}</code> <code>{'{{groupOrAuthor}}'}</code> <code>{'{{slug}}'}</code>.
            Folders are created automatically.
          </p>
        </div>
      </div>

      {/* Comments */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>Comments</h2>
        <div style={S.field}>
          <label style={S.label}>Default comment mode</label>
          <select
            style={S.select}
            value={settings.commentMode}
            onChange={(e) => set({ commentMode: e.target.value as CommentMode })}
          >
            <option value="opAnsweredOnly">OP answered (recommended)</option>
            <option value="opOnly">OP only — comments written by the original poster</option>
            <option value="all">All — every visible comment</option>
          </select>
          <p style={S.hint}>You can also change this per-export in the popup.</p>
        </div>
      </div>

      {/* Auth */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>Advanced</h2>
        <div style={S.field}>
          <label style={S.label}>Obsidian plugin auth token (optional)</label>
          <input
            style={S.input}
            type="password"
            value={settings.pluginToken ?? ''}
            onChange={(e) => set({ pluginToken: e.target.value || undefined })}
            placeholder="Leave blank unless you set FACEBOOK_TO_OBSIDIAN_TOKEN"
            autoComplete="off"
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button style={S.btn} onClick={handleSave}>Save settings</button>
        {saved !== null && (
          <span style={S.toast(saved)}>{saved ? 'Saved!' : 'Save failed'}</span>
        )}
      </div>
      <div>
        <span style={S.resetLink} onClick={handleReset}>Reset to defaults</span>
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) { createRoot(rootEl).render(<OptionsPage />); }
