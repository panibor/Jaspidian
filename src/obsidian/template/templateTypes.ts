/**
 * src-v2/obsidian/template/templateTypes.ts
 * Template type definitions.
 */

export interface NoteTemplate {
  id: string;
  name: string;
  raw: string;
}

export interface RenderOptions {
  commentMode: 'all' | 'opOnly' | 'opAnsweredOnly';
  vaultPattern: string;
  attachmentsFolder: string;
  capturedAt: string;
  language?: string;
  direction?: 'ltr' | 'rtl' | 'auto';
}
