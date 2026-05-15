/**
 * src-v2/popup/state.ts
 * Simple useState-based state management (no external library).
 */
import { useState } from 'react';
import type { ExtractedFacebookPostV2, CommentMode } from '../shared/types';

export interface PopupState {
  posts: ExtractedFacebookPostV2[];
  selectedPostIds: Set<string>;
  commentMode: CommentMode;
  isScanning: boolean;
  isExporting: boolean;
  lastScanError?: string;
  lastExportResult?: { ok: number; failed: number };
}

export function usePopupState(): PopupState & {
  addPosts: (posts: ExtractedFacebookPostV2[]) => void;
  togglePost: (postId: string) => void;
  setCommentMode: (mode: CommentMode) => void;
  setScanning: (v: boolean) => void;
  setExporting: (v: boolean) => void;
  setScanError: (err?: string) => void;
  setExportResult: (ok: number, failed: number) => void;
} {
  const [posts, setPosts] = useState<ExtractedFacebookPostV2[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [commentMode, setCommentMode] = useState<CommentMode>('opAnsweredOnly');
  const [isScanning, setIsScanning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastScanError, setScanError] = useState<string>();
  const [lastExportResult, setExportResultState] = useState<{ ok: number; failed: number }>();

  return {
    posts,
    selectedPostIds,
    commentMode,
    isScanning,
    isExporting,
    lastScanError,
    lastExportResult,
    addPosts: (newPosts) => setPosts(newPosts),
    togglePost: (postId) => {
      const next = new Set(selectedPostIds);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      setSelectedPostIds(next);
    },
    setCommentMode,
    setScanning,
    setExporting,
    setScanError,
    setExportResult: (ok, failed) => setExportResultState({ ok, failed }),
  };
}
