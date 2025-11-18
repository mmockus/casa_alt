import { useCallback, useEffect, useRef, useState } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import { NowPlayingResponse } from '../types';
import { API_BASE } from '../config';

interface UseNowPlayingResult {
  nowPlaying: NowPlayingResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Extracted polling logic from legacy NowPlaying component
export function useNowPlaying(zoneName: string | undefined): UseNowPlayingResult {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const etagRef = useRef<string | null>(null);
  const consecutiveErrorsRef = useRef(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Initial fetch
  useEffect(() => {
    if (!zoneName) return;
    setLoading(true); setError(null); setNowPlaying(null);
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}/nowplaying`, { signal: controller.signal });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setNowPlaying(data);
        const etag = res.headers.get('ETag'); if (etag) etagRef.current = etag;
        consecutiveErrorsRef.current = 0;
      } catch (e: any) {
        if (!cancelled && e.name !== 'AbortError') setError(e.message || 'Unknown error');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [zoneName, refreshKey]);

  // Adaptive polling (subset of original logic)
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!zoneName || !nowPlaying) return;
    let cancelled = false; let timeout: number | null = null;

    const computeInterval = (): number => {
      const status = nowPlaying.Status; // 2 = playing
      const songDur = (nowPlaying.CurrSong as any)?.Duration || 0;
      const prog = nowPlaying.CurrProgress || 0;
      const remaining = songDur ? Math.max(0, songDur - prog) * 1000 : Infinity;
      let base = status === 2 ? 5000 : 15000;
      if (status === 2 && remaining <= 7000) base = 1500;
      if (document.hidden && remaining > 7000) base = Math.max(base, 60000);
      const errors = consecutiveErrorsRef.current;
      if (errors > 0) {
        const factor = Math.min(2 ** errors, 32);
        base = Math.min(base * factor, 120000);
      }
      return base;
    };

    const schedule = (ms: number) => {
      if (cancelled) return;
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(runPoll, ms);
    };

    const runPoll = async () => {
      if (cancelled) return;
      try {
        const headers: Record<string, string> = {};
        if (etagRef.current) headers['If-None-Match'] = etagRef.current;
        const res = await fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}/nowplaying`, { headers });
        if (res.status === 304) {
          consecutiveErrorsRef.current = 0;
        } else if (res.ok) {
          const data = await res.json();
          if (!cancelled) setNowPlaying(data);
          const etag = res.headers.get('ETag'); if (etag) etagRef.current = etag;
          consecutiveErrorsRef.current = 0;
        } else {
          consecutiveErrorsRef.current += 1;
        }
      } catch {
        consecutiveErrorsRef.current += 1;
      } finally {
        schedule(computeInterval());
      }
    };

    schedule(computeInterval());
    return () => { cancelled = true; if (timeout) window.clearTimeout(timeout); };
  }, []);

  // Smooth progress tick
  useEffect(() => {
    if (!nowPlaying || nowPlaying.Status !== 2) return;
    const id = setInterval(() => {
      setNowPlaying(prev => {
        if (!prev) return prev;
        const songDur = (prev.CurrSong as any)?.Duration || 0;
        const curr = prev.CurrProgress || 0;
        if (!songDur) return prev;
        const next = Math.min(songDur, curr + 1);
        if (next === curr) return prev;
        return { ...prev, CurrProgress: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [nowPlaying?.Status]);

  useEffect(() => {
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  return { nowPlaying, loading, error, refresh };
}
