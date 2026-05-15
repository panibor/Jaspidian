/**
 * src-v2/shared/paths.ts
 * Vault path planning: resolve template variables for note organization.
 */
import { slugifyForFolder, slugifyForFilename } from './slug';
import type { ExtractedFacebookPostV2 } from './types';

export interface PathPlan {
  folder: string;
  filename: string;
  attachmentFolder: string;
  slug: string;
}

/**
 * Build a vault path from a post and settings.
 * Resolves template variables: {{year}}, {{month}}, {{day}}, {{groupOrAuthor}}, {{slug}}, {{author}}.
 */
export function buildVaultPath(
  post: ExtractedFacebookPostV2,
  settings: { vaultPattern: string; attachmentPattern: string; unicode: boolean }
): PathPlan {
  const timestamp = post.postedAt || post.postedAtText || '';
  const date = timestamp ? new Date(timestamp) : null;
  const validDate = date && !isNaN(date.getTime()) ? date : new Date();
  const year = validDate.getFullYear().toString();
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const day = String(validDate.getDate()).padStart(2, '0');

  // Build slug: prefer post title (first line of body), fall back to author+snippet
  const contextName =
    post.context.groupName ||
    post.context.pageName ||
    post.context.profileName ||
    post.authorName ||
    'Misc';
  const titleBasis = post.title && !post.title.startsWith('Post by ') && !post.title.startsWith('Photos by ')
    ? post.title
    : (post.body.slice(0, 60).replace(/\s+/g, ' ') || post.authorName || 'note');
  // Use unicode-safe slugify so Hebrew/Russian/etc. titles produce a valid filename
  const slug = slugifyForFilename(titleBasis, { unicode: true, maxLen: 60 });

  // Resolve template in pattern
  let folder = settings.vaultPattern;
  folder = folder.replace('{{year}}', year);
  folder = folder.replace('{{month}}', month);
  folder = folder.replace('{{day}}', day);
  folder = folder.replace('{{groupOrAuthor}}', slugifyForFolder(contextName));
  folder = folder.replace('{{slug}}', slug);
  folder = folder.replace('{{author}}', slugifyForFolder(post.authorName || 'Unknown'));

  // Extract folder and filename
  const lastSlash = folder.lastIndexOf('/');
  let filename = 'note.md';
  if (lastSlash >= 0) {
    filename = folder.slice(lastSlash + 1);
    folder = folder.slice(0, lastSlash);
  } else {
    folder = '';
  }

  // Build attachment folder pattern
  const postId = post.postId || slug; // postId is the most stable unique identifier
  let attachmentFolder = settings.attachmentPattern;
  attachmentFolder = attachmentFolder.replace('{{year}}', year);
  attachmentFolder = attachmentFolder.replace('{{month}}', month);
  attachmentFolder = attachmentFolder.replace('{{day}}', day);
  attachmentFolder = attachmentFolder.replace('{{groupOrAuthor}}', slugifyForFolder(contextName));
  attachmentFolder = attachmentFolder.replace('{{slug}}', slug);
  attachmentFolder = attachmentFolder.replace('{{postId}}', postId);

  return {
    folder,
    filename,
    attachmentFolder,
    slug,
  };
}
