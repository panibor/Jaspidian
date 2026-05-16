/**
 * Settings page: vaults + note path pattern. Shares the popup's crimson
 * palette so it feels like the same product.
 *
 * Vanilla DOM, no framework. document.createElement only - never innerHTML.
 */
import { el, mount, type Child } from '../shared/dom';
import { currentPalette, onThemeChange, type Palette } from '../shared/theme';
import { DEFAULT_COMMENT_MODE, DEFAULT_VAULT_PATTERN } from '../shared/constants';
import type { CommentMode, VaultEntry } from '../shared/types';

interface Settings {
  vaults: VaultEntry[];
  vaultPattern: string;
  commentMode: CommentMode;
  pluginToken?: string;
}

const DEFAULT_SETTINGS: Settings = {
  vaults: [],
  vaultPattern: DEFAULT_VAULT_PATTERN,
  commentMode: DEFAULT_COMMENT_MODE as CommentMode,
};

let C: Palette = currentPalette();
let settings: Settings = { ...DEFAULT_SETTINGS };
let saved: boolean | null = null;
let newVaultName = '';
let newVaultPath = '';

function patch(p: Partial<Settings>): void {
  settings = { ...settings, ...p };
  render();
}

function render(): void {
  const root = document.getElementById('root');
  if (root) mount(root, Page());
}

function Page(): HTMLElement {
  return el('div', { style: pageStyle() }, [
    el('div', { style: containerStyle() }, [
      HeaderView(),
      VaultsSection(),
      PathSection(),
      Footer(),
    ]),
  ]);
}

function HeaderView(): HTMLElement {
  return el('header', { style: headerStyle() }, [
    el('img', {
      src: chrome.runtime.getURL('assets/logo_48.png'),
      alt: '',
      style: { height: '36px', width: '36px', borderRadius: '6px', flexShrink: '0' },
    }),
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } }, [
      el('h1', { style: titleStyle(), text: 'Jaspidian - Settings' }),
      el('p', { style: subtitleStyle(), text: 'Configure how posts are saved to your vault.' }),
    ]),
  ]);
}

function VaultsSection(): HTMLElement {
  const rows: Child[] = [];
  if (settings.vaults.length > 0) {
    rows.push(
      el('div', { style: vaultHeaderStyle() }, [
        el('span', { text: 'Name' }),
        el('span', { text: 'Path on disk' }),
        el('span'),
      ]),
    );
    for (let i = 0; i < settings.vaults.length; i++) {
      rows.push(VaultRow(i, settings.vaults[i]));
    }
  } else {
    rows.push(el('div', { style: emptyVaultsStyle(), text: 'No vaults yet, add one below.' }));
  }
  rows.push(AddRow());

  return el('section', { style: sectionStyle() }, [
    el('div', { style: { marginBottom: '14px' } }, [
      el('h2', { style: sectionTitleStyle(), text: 'Obsidian vaults' }),
      el('p', { style: sectionHintStyle(), text: 'Add each vault you want to save to. The popup shows a dropdown at export time so you can pick the destination. Make sure the Jaspidian Obsidian plugin is enabled in that vault.' }),
    ]),
    ...rows,
  ]);
}

function VaultRow(i: number, v: VaultEntry): HTMLElement {
  return el('div', { style: vaultRowStyle() }, [
    el('input', {
      style: inputStyle(),
      value: v.name,
      placeholder: 'My vault',
      oninput: (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        settings.vaults = settings.vaults.map((x, idx) => idx === i ? { ...x, name: value } : x);
      },
    }),
    el('input', {
      style: inputStyle(),
      value: v.path,
      placeholder: 'C:\\Users\\You\\Documents\\MyVault',
      oninput: (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        settings.vaults = settings.vaults.map((x, idx) => idx === i ? { ...x, path: value } : x);
      },
    }),
    el('button', {
      style: btnDangerStyle(),
      onclick: () => patch({ vaults: settings.vaults.filter((_, idx) => idx !== i) }),
      text: 'Remove',
    }),
  ]);
}

function AddRow(): HTMLElement {
  const nameInput = el('input', {
    style: inputStyle(),
    value: newVaultName,
    placeholder: 'Vault name',
    oninput: (e: Event) => { newVaultName = (e.target as HTMLInputElement).value; },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') addVault(); },
  });
  const pathInput = el('input', {
    style: inputStyle(),
    value: newVaultPath,
    placeholder: 'Full path, e.g. D:\\My Vault',
    oninput: (e: Event) => { newVaultPath = (e.target as HTMLInputElement).value; },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') addVault(); },
  });
  return el('div', { style: addRowStyle() }, [
    nameInput,
    pathInput,
    el('button', { style: btnStyle(), onclick: addVault, text: 'Add' }),
  ]);
}

function PathSection(): HTMLElement {
  return el('section', { style: sectionStyle() }, [
    el('div', { style: { marginBottom: '14px' } }, [
      el('h2', { style: sectionTitleStyle(), text: 'Note path pattern' }),
      el('p', { style: sectionHintStyle(), text: 'Where each note lands inside the vault. Folders are created automatically.' }),
    ]),
    el('input', {
      style: inputMonoStyle(),
      value: settings.vaultPattern,
      placeholder: DEFAULT_VAULT_PATTERN,
      oninput: (e: Event) => { settings.vaultPattern = (e.target as HTMLInputElement).value; },
    }),
    el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' } }, [
      el('span', { style: chipStyle(), text: '{{year}}' }),
      el('span', { style: chipStyle(), text: '{{groupOrAuthor}}' }),
      el('span', { style: chipStyle(), text: '{{slug}}' }),
    ]),
  ]);
}

function Footer(): HTMLElement {
  const toast = saved === null ? null : el('span', {
    style: { fontSize: '12px', fontWeight: '500', color: saved ? C.green : C.red },
    text: saved ? 'Saved' : 'Save failed',
  });

  return el('div', { style: footerStyle() }, [
    el('button', { style: btnStyle(), onclick: handleSave, text: 'Save settings' }),
    toast,
    el('span', { style: resetLinkStyle(), onclick: handleReset, text: 'Reset to defaults' }),
  ]);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function addVault(): void {
  const name = newVaultName.trim();
  const path = newVaultPath.trim();
  if (!name || !path) return;
  settings.vaults = [...settings.vaults, { name, path }];
  newVaultName = '';
  newVaultPath = '';
  render();
}

function handleSave(): void {
  chrome.storage.sync.set({ settings_v2: settings }, () => {
    saved = true;
    render();
    setTimeout(() => { saved = null; render(); }, 2500);
  });
}

function handleReset(): void {
  if (!confirm('Reset all settings to defaults?')) return;
  settings = { ...DEFAULT_SETTINGS };
  chrome.storage.sync.set({ settings_v2: settings });
  render();
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function pageStyle() { return { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '14px', lineHeight: '1.5', paddingBottom: '48px' }; }
function containerStyle() { return { maxWidth: '720px', margin: '0 auto', padding: '0 24px' }; }
function headerStyle() { return { display: 'flex', alignItems: 'center', gap: '12px', padding: '28px 0 24px', borderBottom: `1px solid ${C.border}`, marginBottom: '24px' }; }
function titleStyle() { return { fontSize: '22px', fontWeight: '700', color: C.accent, margin: '0', letterSpacing: '0.2px' }; }
function subtitleStyle() { return { fontSize: '13px', color: C.muted, margin: '0' }; }
function sectionStyle() { return { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px 22px', marginBottom: '18px' }; }
function sectionTitleStyle() { return { fontSize: '15px', fontWeight: '600', margin: '0', color: C.text }; }
function sectionHintStyle() { return { fontSize: '12px', color: C.muted, margin: '4px 0 0', lineHeight: '1.55' }; }
function vaultHeaderStyle() { return { display: 'grid', gridTemplateColumns: '1fr 2fr 80px', gap: '8px', padding: '0 2px 6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: C.muted }; }
function vaultRowStyle() { return { display: 'grid', gridTemplateColumns: '1fr 2fr 80px', gap: '8px', alignItems: 'center', marginBottom: '6px' }; }
function inputStyle() { return { width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }; }
function inputMonoStyle() { return { width: '100%', boxSizing: 'border-box', padding: '9px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', outline: 'none' }; }
function btnStyle() { return { padding: '9px 18px', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', background: C.accent, color: C.white, fontFamily: 'inherit' }; }
function btnDangerStyle() { return { padding: '7px 12px', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: C.red, fontFamily: 'inherit' }; }
function addRowStyle() { return { display: 'grid', gridTemplateColumns: '1fr 2fr 80px', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: `1px dashed ${C.border}` }; }
function chipStyle() { return { fontSize: '11px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', padding: '3px 7px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '4px', color: C.muted }; }
function footerStyle() { return { display: 'flex', alignItems: 'center', gap: '14px', marginTop: '22px' }; }
function emptyVaultsStyle() { return { padding: '14px 0 4px', fontSize: '12px', color: C.muted, textAlign: 'center', fontStyle: 'italic' }; }
function resetLinkStyle() { return { marginLeft: 'auto', fontSize: '12px', color: C.muted, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }; }

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init(): void {
  onThemeChange((p) => { C = p; render(); });

  chrome.storage.sync.get('settings_v2', (data) => {
    if (data.settings_v2) settings = { ...settings, ...data.settings_v2 };
    render();
  });

  render();
}

init();
