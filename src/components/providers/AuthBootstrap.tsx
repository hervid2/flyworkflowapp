'use client';
/**
 * Mounted once for the authenticated route group. Reconciles the in-memory
 * auth store with the mirrored access-token cookie (or a silent refresh) on
 * first client render, so a hard reload doesn't force a re-login even though
 * the access token itself is never persisted client-side beyond that cookie.
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthBootstrap() {
  const hydrateFromCookie = useAuthStore((s) => s.hydrateFromCookie);

  useEffect(() => {
    void hydrateFromCookie();
  }, [hydrateFromCookie]);

  return null;
}
