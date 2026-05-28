'use client';

import { useEffect, useRef } from "react";
import { recordArticleView } from "../../lib/api";

export function ArticleViewTracker({ slug, enabled }: { slug: string; enabled: boolean }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!enabled || trackedRef.current) return;
    trackedRef.current = true;

    void recordArticleView(slug).catch(() => {
      trackedRef.current = false;
    });
  }, [enabled, slug]);

  return null;
}
