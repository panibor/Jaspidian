/**
 * src-v2/obsidian/filename/buildFilename.ts
 * Build Obsidian-safe filename and folder paths.
 */
import { buildVaultPath } from '../../shared/paths';
import type { ExtractedFacebookPostV2 } from '../../shared/types';

export interface FilenameSettings {
  vaultPattern: string;
  attachmentPattern: string;
  unicode: boolean;
}

/**
 * Build filename, folder, and attachment folder from a post.
 */
export function buildFilename(
  post: ExtractedFacebookPostV2,
  settings: FilenameSettings
): { filename: string; folder: string; attachmentFolder: string; slug: string } {
  const plan = buildVaultPath(post, {
    vaultPattern: settings.vaultPattern,
    attachmentPattern: settings.attachmentPattern,
    unicode: settings.unicode,
  });

  // Ensure .md extension
  const filename = plan.filename.endsWith('.md') ? plan.filename : plan.filename + '.md';

  return {
    filename,
    folder: plan.folder,
    attachmentFolder: plan.attachmentFolder,
    slug: plan.slug,
  };
}
