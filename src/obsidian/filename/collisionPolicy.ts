/**
 * src-v2/obsidian/filename/collisionPolicy.ts
 * Collision policy application: skip, overwrite, or suffix-rename.
 */
import type { CollisionPolicy } from '../../shared/types';
import type { PathPlan } from '../../shared/paths';

/**
 * Apply collision policy to a path plan.
 */
export function applyCollisionPolicy(
  plan: PathPlan,
  exists: (absPath: string) => boolean,
  vaultRoot: string,
  policy: CollisionPolicy
): PathPlan {
  const fullPath = vaultRoot + '/' + plan.folder + '/' + plan.filename;

  if (policy === 'skip') {
    if (exists(fullPath)) {
      throw new Error('SKIP_EXISTING');
    }
    return plan;
  }

  if (policy === 'overwrite') {
    return plan;
  }

  if (policy === 'suffix') {
    if (!exists(fullPath)) {
      return plan;
    }

    // Try suffix: filename (2).md, (3).md, etc.
    const ext = plan.filename.includes('.') ? plan.filename.split('.').pop() : '';
    const base = ext ? plan.filename.slice(0, -(ext.length + 1)) : plan.filename;

    for (let i = 2; i < 1000; i++) {
      const newFilename = `${base} (${i}).${ext}`;
      const newPath = vaultRoot + '/' + plan.folder + '/' + newFilename;
      if (!exists(newPath)) {
        return { ...plan, filename: newFilename };
      }
    }

    // Fallback: use timestamp
    const timestamp = new Date().getTime();
    return { ...plan, filename: `${base} ${timestamp}.${ext}` };
  }

  return plan;
}
