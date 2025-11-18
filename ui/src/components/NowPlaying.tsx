import React, { useCallback, useEffect, useRef, useState } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import PlaybackControls from './PlaybackControls';
import { Box, CircularProgress, Typography, LinearProgress, Stack, Popover, Slider } from '@mui/material';
import { NowPlayingResponse, Song } from '../types';
import { formatTime } from '../utils';
import { API_BASE } from '../config';
import { useConfig } from '../hooks/useConfig';
import { ThemeConfig } from '../themeConfig';
// Background & album art layers moved to App; remove internal background imports

import SpotifyUris from './SpotifyUris';

interface Props { zoneName: string; theme: ThemeConfig; showSpotifyUris?: boolean; onArtworkChange?: (uri:string|null)=>void; onSongIdentityChange?: (id:string|null)=>void; onSpotifyTrackChange?: (trackId:string|null)=>void; canvasMeta?: { canvas_url?: string | null; canvas_id?: string | null; canvas_not_found?: boolean }; nowPlayingExternal?: NowPlayingResponse; onRequestRefresh?: ()=>void; onCanvasMetaChange?: (m:{ canvas_url?: string | null; canvas_id?: string | null; canvas_not_found?: boolean }) => void; }

const NowPlaying: React.FC<Props> = ({ zoneName, theme, showSpotifyUris, onArtworkChange, onSongIdentityChange, onSpotifyTrackChange, canvasMeta, nowPlayingExternal, onRequestRefresh, onCanvasMetaChange }) => {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse | null>(nowPlayingExternal || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [volume, setVolume] = useState<number | null>(null);
  const [volumeAnchor, setVolumeAnchor] = useState<HTMLElement | null>(null);
  const volumeOpen = Boolean(volumeAnchor);
  const [previousVolume, setPreviousVolume] = useState<number | null>(null);
  // Removed unused preview / hover refs for next song artwork.
  const [palette, setPalette] = useState<{dominant:string; accent:string; text:string}>({dominant:'#444', accent:'#888', text:'#fff'});
  // Debounce timer ref for volume updates
  const volumeDebounceRef = useRef<number | null>(null);
  // Conditional request + error/backoff refs
  const etagRef = useRef<string | null>(null);
  const consecutiveErrorsRef = useRef(0);
  // Track previous song identity to detect transitions for artwork refresh
  const prevSongIdRef = useRef<string | null>(null);
  const config = useConfig();

  // Marquee scroll logic: only scroll if text overflows
  useEffect(() => {
    const titleEl = document.getElementById('nowplaying-title');
    if (!titleEl) return;
    const parent = titleEl.parentElement;
    if (!parent) return;
    const needsScroll = titleEl.scrollWidth > parent.offsetWidth;
    if (needsScroll) {
      titleEl.style.animation = 'marquee 18s linear infinite';
      titleEl.style.transform = '';
    } else {
      titleEl.style.animation = 'none';
      titleEl.style.transform = 'translateX(0)';
    }
  }, [nowPlaying?.CurrSong?.Title]);

  const refresh = () => setRefreshKey(k => k + 1);

  // If external nowPlaying provided, mirror it and skip internal fetching
  useEffect(() => { if (nowPlayingExternal) setNowPlaying(nowPlayingExternal); }, [nowPlayingExternal]);

  // Initial fetch only if no external source
  useEffect(() => {
    if (nowPlayingExternal) return; // external data governs
    if (!zoneName) return;
    setLoading(true); setError(null); setNowPlaying(null); setVolume(null);
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}/nowplaying`, { signal: controller.signal });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setNowPlaying(data);
        // Store ETag if provided
  const etag = (res as any)?.headers?.get ? res.headers.get('ETag') : null;
        if (etag) etagRef.current = etag;
        consecutiveErrorsRef.current = 0;
      } catch (e:any) {
        if (!cancelled && e.name !== 'AbortError') setError(e.message || 'Unknown error');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; controller.abort(); };
  // Intentionally not depending on nowPlaying to avoid refetch loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneName, refreshKey]);

  // Enhanced adaptive polling for nowPlaying with:
  // - Playback state based intervals
  // - Near-end ramp (faster when track about to finish)
  // - Tab visibility slowdown (pause-ish when hidden)
  // - Error exponential backoff
  // - Conditional requests using ETag (if server supports)
  useEffect(() => {
  if (nowPlayingExternal) return; // polling handled upstream
  if (!zoneName || !nowPlaying) return; // need initial data
    let cancelled = false;
    let timeout: number | null = null;

    const schedule = (ms: number) => {
      if (cancelled) return;
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(runPoll, ms);
    };

    const computeInterval = (): number => {
      const status = nowPlaying.Status; // 2 = playing
      const songDur = nowPlaying.CurrSong?.Duration || nowPlaying.CurrSong?.duration || 0;
      const prog = nowPlaying.CurrProgress || 0;
      const remaining = songDur ? Math.max(0, songDur - prog) * 1000 : Infinity;
      let base = status === 2 ? 5000 : 15000;
      // Near end ramp-up (<7s remaining) poll faster to detect transition
      if (status === 2 && remaining <= 7000) base = 1500;
      // Hidden tab: slow way down (keep occasional sync every minute) unless near end
      if (document.hidden && remaining > 7000) base = Math.max(base, 60000);
      // Error backoff
      const errors = consecutiveErrorsRef.current;
      if (errors > 0) {
        const factor = Math.min(2 ** errors, 32); // cap growth
        base = Math.min(base * factor, 120000); // cap 2 min
      }
      return base;
    };

    const runPoll = async () => {
      if (cancelled) return;
      const controller = new AbortController();
      try {
        const headers: Record<string,string> = {};
        if (etagRef.current) headers['If-None-Match'] = etagRef.current;
        const res = await fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}/nowplaying`, { signal: controller.signal, headers });
        if (res.status === 304) {
          consecutiveErrorsRef.current = 0;
        } else if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            // Detect song change
            const newSong = data?.CurrSong;
            const newId = newSong ? `${newSong.Title}|${newSong.Artists || newSong.Artist || ''}|${newSong.Album || ''}` : null;
            const changed = newId && newId !== prevSongIdRef.current;
            setNowPlaying(data);
            if (changed) {
              prevSongIdRef.current = newId;
              // Force artwork change callback (even if artwork URI same string but track meta changed) by re-invoking
              if (newSong?.ArtworkURI) onArtworkChange?.(newSong.ArtworkURI);
              onSongIdentityChange?.(newId);
            }
            const etag = (res as any)?.headers?.get ? res.headers.get('ETag') : null; if (etag) etagRef.current = etag;
          }
          consecutiveErrorsRef.current = 0;
        } else {
          consecutiveErrorsRef.current += 1;
        }
      } catch {
        consecutiveErrorsRef.current += 1; // network/abort
      } finally {
        schedule(computeInterval());
      }
    };

    // Kick off first scheduled poll using current interval logic
    schedule(computeInterval());

    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  // Depend on key props that influence interval computation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneName, nowPlaying?.Status, nowPlaying?.CurrSong?.Duration, nowPlaying?.CurrProgress]);

  // Visibility change: on becoming visible force a refresh (without waiting for next schedule)
  useEffect(() => {
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Local progress tick (simulate smooth progress between polls when playing)
  useEffect(() => {
    if (!nowPlaying || nowPlaying.Status !== 2) return; // only when playing
    const id = setInterval(() => {
      setNowPlaying(prev => {
        if (!prev) return prev;
        const songDur = prev.CurrSong?.Duration || prev.CurrSong?.duration || 0;
        const curr = prev.CurrProgress || 0;
        if (!songDur) return prev;
        const next = Math.min(songDur, curr + 1);
        if (next === curr) return prev;
        // If we've reached end, trigger a refresh to get next track metadata sooner
        if (next >= songDur) {
          setTimeout(() => refresh(), 300); // slight delay for backend to roll over
        }
        return { ...prev, CurrProgress: next };
      });
    }, 1000);
    return () => clearInterval(id);
  // Intentionally only track status (not full nowPlaying) to avoid resetting each second
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.Status]);

  // Palette extraction (moved earlier to App as well, but keep local for overlay gradient colors)
  useEffect(() => {
    // Maintain prevSongIdRef on initial load or refresh
    const curr = nowPlaying?.CurrSong;
    if (curr) {
      const id = `${curr.Title}|${curr.Artists || curr.Artist || ''}|${curr.Album || ''}`;
      prevSongIdRef.current = id;
      onSongIdentityChange?.(id);
    }
    const src = curr?.ArtworkURI; if (!src) return;
    const img = new Image(); img.crossOrigin='anonymous'; img.src = src; img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return;
        const w = canvas.width = 64; const h = canvas.height = 64; ctx.drawImage(img,0,0,w,h); const data = ctx.getImageData(0,0,w,h).data;
        const buckets: Record<string,{r:number;g:number;b:number;count:number}> = {}; let total=0;
        for (let i=0;i<data.length;i+=4){ const a=data[i+3]; if (a<128) continue; const r=data[i],g=data[i+1],b=data[i+2]; const mx=Math.max(r,g,b), mn=Math.min(r,g,b); if (mx-mn<18) continue; const key=`${r>>4}-${g>>4}-${b>>4}`; if(!buckets[key]) buckets[key]={r:0,g:0,b:0,count:0}; buckets[key].r+=r; buckets[key].g+=g; buckets[key].b+=b; buckets[key].count++; total++; }
        let dominant='#444', accent='#888'; if (total>0){ const sorted=Object.values(buckets).sort((a,b)=>b.count-a.count); const toHex=(v:number)=>('0'+v.toString(16)).slice(-2); if(sorted[0]) dominant=`#${toHex(Math.round(sorted[0].r/sorted[0].count))}${toHex(Math.round(sorted[0].g/sorted[0].count))}${toHex(Math.round(sorted[0].b/sorted[0].count))}`; if(sorted[1]) accent=`#${toHex(Math.round(sorted[1].r/sorted[1].count))}${toHex(Math.round(sorted[1].g/sorted[1].count))}${toHex(Math.round(sorted[1].b/sorted[1].count))}`; else accent=dominant; }
        const dr=parseInt(dominant.slice(1,3),16); const dg=parseInt(dominant.slice(3,5),16); const db=parseInt(dominant.slice(5,7),16); const lum=0.2126*dr+0.7152*dg+0.0722*db; const text= lum>150?'#111':'#fff'; setPalette({dominant,accent,text});
      } catch{/* ignore palette errors */}
    };
  }, [nowPlaying?.CurrSong?.ArtworkURI]);

  const callApi = useCallback(async (action: 'play' | 'pause' | 'next' | 'previous') => {
    try {
      if (!zoneName) throw new Error('No zone');
      // Per API docs use GET /zones/{id}/player/{action}
      const endpoint = `${API_BASE}/zones/${encodeURIComponent(zoneName)}/player/${action}`;
      console.debug('[NowPlaying] calling control endpoint (player action)', endpoint);
      const res = await fetch(endpoint, { method: 'GET' });
       console.debug('[NowPlaying] control response', res.status, res.statusText);
       if (!res.ok) {
         // throw a descriptive error so the catch block can set a transient control message
         throw new Error(`API error: ${res.status} ${res.statusText}`);
       }
       // Immediately refresh nowPlaying state after successful control action
       // Optimistically update local nowPlaying Status for play/pause so UI toggles immediately
      try {
        if (action === 'play' || action === 'pause') {
          setNowPlaying(prev => {
            if (!prev) return prev;
            return { ...prev, Status: action === 'play' ? 2 : 1 } as NowPlayingResponse;
          });
        }
      } catch {/* ignore */}
      // Always refresh immediately after the control action
      try { onRequestRefresh?.(); } catch {/* ignore */}
      // If the user navigated next/previous, schedule extra follow-up refreshes to capture new track metadata (album art)
      if (action === 'next' || action === 'previous') {
        try { setTimeout(() => { try { onRequestRefresh?.(); } catch {/* ignore */} }, 300); } catch {/* ignore */}
        try { setTimeout(() => { try { onRequestRefresh?.(); } catch {/* ignore */} }, 1200); } catch {/* ignore */}
      } else {
        // regular follow-up for play/pause
        try { setTimeout(() => { try { onRequestRefresh?.(); } catch {/* ignore */} }, 900); } catch {/* ignore */}
      }
       return true;
     } catch (e:any) {
       // For control actions we avoid setting the global `error` state because
       // that triggers the overlay to return an error UI and hide controls.
       const msg = e?.message || 'Control action failed';
       // Provide a transient control-specific message and log the full error.
       console.warn('[NowPlaying] control API error', msg, e);
       setControlError(msg.includes('401') ? 'Unauthorized (401) — check API access' : msg);
       window.setTimeout(() => setControlError(null), 5000);
       return false;
     }
   }, [zoneName, onRequestRefresh]);

  const updateVolume = useCallback((newVol:number) => {
    setVolume(newVol);
    if (newVol>0) setPreviousVolume(newVol);
    if (volumeDebounceRef.current) window.clearTimeout(volumeDebounceRef.current);
    volumeDebounceRef.current = window.setTimeout(() => {
      fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}?Volume=${newVol}`).catch(()=>{});
    }, 200);
  }, [zoneName]);

  const toggleMute = useCallback(() => {
    if (volume === 0) {
      const restore = previousVolume && previousVolume>0 ? previousVolume : 25;
      updateVolume(restore);
    } else if (typeof volume === 'number') {
      if (volume > 0) setPreviousVolume(volume);
      updateVolume(0);
    }
  }, [volume, previousVolume, updateVolume]);

  const handleVolumeClick = (e:React.MouseEvent<HTMLElement>) => {
    setVolumeAnchor(e.currentTarget);
    // Fetch volume on demand when popover opens (if not already loaded)
    if (volume == null) {
      fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && typeof data.Volume === 'number') {
            setVolume(data.Volume);
            setPreviousVolume(p => (data.Volume > 0 && p == null) ? data.Volume : p);
          }
        }).catch(()=>{});
    }
  };
  const handleVolumeClose = () => setVolumeAnchor(null);

  // Lift artwork URI to parent as soon as it changes (must be before early returns for stable hook order)
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    const art = nowPlaying?.CurrSong?.ArtworkURI;
    if (art) onArtworkChange?.(art);
  }, []);

  // Precompute spotify track id (must happen before any early return to preserve hook order)
  const spotifyTrackId = React.useMemo(() => {
    const songLocal = nowPlaying?.CurrSong as Song | undefined;
    if (!songLocal || !Array.isArray((songLocal as any).DeepLinks)) return null;
    const dl = (songLocal as any).DeepLinks as Array<{ Kind?: string; Uri?: string }>;
    for (const d of dl) {
      if (!d || !d.Uri || !d.Kind) continue;
      if (d.Kind.toLowerCase() === 'track' && d.Uri.startsWith('spotify:')) {
        const parts = d.Uri.split(':');
        if (parts.length === 3 && parts[1] === 'track') return parts[2];
      }
    }
    return null;
  }, [nowPlaying?.CurrSong]);

  useEffect(() => { onSpotifyTrackChange?.(spotifyTrackId); }, [spotifyTrackId, onSpotifyTrackChange]);

  const [localCanvasMeta, setLocalCanvasMeta] = useState<{ canvas_url?: string | null; canvas_id?: string | null; canvas_not_found?: boolean }>({});
  const prevSpotifyRef = useRef<string | null>(null);

  // If theme requests Canvas, call the CANVAS_API any time the spotify track id changes.
  useEffect(() => {
    if (!theme.Canvas) {
      if (localCanvasMeta && Object.keys(localCanvasMeta).length) {
        setLocalCanvasMeta({});
        onCanvasMetaChange?.({});
      }
      return;
    }
    if (!spotifyTrackId) return;
    if (!config?.canvasApi) return;
    // Only call when track changes
    if (prevSpotifyRef.current === spotifyTrackId) return;
    prevSpotifyRef.current = spotifyTrackId;

    let cancelled = false; const controller = new AbortController();
    (async () => {
      try {
        const url = `${config.canvasApi}${config.canvasApi.includes('?') ? '&' : '?'}track=${encodeURIComponent(spotifyTrackId!)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          if (!cancelled) setLocalCanvasMeta({ canvas_not_found: true });
          return;
        }
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        let body: any = null;
        if (contentType.includes('application/json')) body = await res.json(); else { const txt = await res.text(); try { body = JSON.parse(txt); } catch { body = txt.trim(); } }
        if (cancelled) return;
        let canvas_url: string | null = null; let canvas_id: string | null = null; let canvas_not_found = false;
        if (typeof body === 'string') {
          const txt = body as string;
          if (txt) {
            canvas_url = txt;
            try { const u = new URL(txt); const t = u.searchParams.get('track'); if (t) canvas_id = t; } catch {/* ignore */}
            if (!canvas_id) { const m = txt.match(/([A-Za-z0-9]{22})/); if (m) canvas_id = m[1]; }
          } else canvas_not_found = true;
        } else if (typeof body === 'object' && body !== null) {
          canvas_url = body.canvas_url || body.url || body.canvasUrl || null;
          canvas_id = body.canvas_id || body.id || body.canvasId || null;
          canvas_not_found = !!(body.canvas_not_found || body.not_found || body.canvasNotFound);
        }
        const newMeta = { canvas_url: canvas_url || null, canvas_id: canvas_id || null, canvas_not_found: !!canvas_not_found };
        setLocalCanvasMeta(newMeta);
        onCanvasMetaChange?.(newMeta);
      } catch (e) {
        if (!cancelled) setLocalCanvasMeta({ canvas_not_found: true });
        if (!cancelled) onCanvasMetaChange?.({ canvas_not_found: true });
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [spotifyTrackId, theme.Canvas, config?.canvasApi, onCanvasMetaChange]);
  // Notify parent if localCanvasMeta is cleared elsewhere
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    onCanvasMetaChange?.(localCanvasMeta || {});
  }, []);

  if (!zoneName) return null;
  if (loading) return <Box mt={4}><CircularProgress/></Box>;
  if (error) return <Box mt={4}><Typography color="error">{error}</Typography></Box>;
  if (!nowPlaying || !nowPlaying.CurrSong) return <Box mt={4}><Typography>No song playing</Typography></Box>;

  const song = nowPlaying.CurrSong as Song;
  let spotifyData: { track?: string; artist?: string; album?: string; playlist?: string; canvas_url?: string | null; canvas_not_found?: boolean; canvas_id?: string | null } | null = null;
  if (showSpotifyUris && song && Array.isArray((song as any).DeepLinks)) {
    const dl = (song as any).DeepLinks as Array<{ Kind?: string; Uri?: string }>; 
    if (dl && dl.length) {
      spotifyData = {};
      for (const d of dl) {
        if (!d || !d.Uri || !d.Kind) continue;
        const uri = d.Uri.startsWith('spotify:') ? d.Uri : undefined;
        if (!uri) continue;
        const k = d.Kind.toLowerCase();
        if (k === 'track' && !spotifyData.track) spotifyData.track = uri;
        else if (k === 'artist' && !spotifyData.artist) spotifyData.artist = uri;
        else if (k === 'album' && !spotifyData.album) spotifyData.album = uri;
        else if (k === 'playlist' && !spotifyData.playlist) spotifyData.playlist = uri;
      }
    }
  }
  const duration = song.Duration || 0;
  const progress = nowPlaying.CurrProgress || 0;
  const percent = duration > 0 ? (progress / duration) * 100 : 0;
  const isPlaying = nowPlaying.Status === 2;
  const nextSong: Song | null = (nowPlaying?.NextSong as Song)
    || (Array.isArray(nowPlaying?.Queue) ? nowPlaying!.Queue[1] : undefined as any)
    || (Array.isArray(nowPlaying?.PlayQueue) ? nowPlaying!.PlayQueue[1] : undefined as any)
    || null;

  // Unified overlay-only return (background & album art handled by App layer stack)
  return (
    <React.Fragment>
      <Box sx={{ position:'absolute', left:0, right:0, bottom:0, p:{xs:0.4, sm:0.6}, backdropFilter:'blur(14px) brightness(0.92)', bgcolor:'rgba(0,0,0,0.38)', borderTop:'1px solid rgba(255,255,255,0.12)', color:palette.text, zIndex:50, overflow:'hidden', '&:before': { content:'""', position:'absolute', top:-40, left:0, right:0, height:40, background:'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))', pointerEvents:'none' } }}>
        <Box sx={{ width:'100%', overflow:'hidden', mb:0.2 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontSize: { xs: '.85rem', sm: '.95rem' },
              whiteSpace: 'nowrap',
              fontWeight: 600,
              color: palette.text,
              position: 'relative',
              left: 0,
              transition: 'transform 0.3s',
            }}
            id="nowplaying-title"
          >
            {song.Title}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontSize:{xs:'.60rem', sm:'.65rem'}, letterSpacing:'.03em', opacity:0.9, color:palette.text, display:'flex', alignItems:'center', gap:0.6, whiteSpace:'nowrap', overflow:'hidden' }}>
          <Box component="span" sx={{ overflow:'hidden', textOverflow:'ellipsis' }}>{song.Artists}</Box>
          {song.Album && <Box component="span" sx={{ color:'rgba(255,255,255,0.55)', fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', maxWidth:{xs:140, sm:220} }}>• {song.Album}</Box>}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mt:0.4, pr:{xs:10, sm:15} }}>
          <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text }}>{formatTime(progress)}</Typography>
          <LinearProgress variant="determinate" value={percent} sx={{ flex:1, height:5, borderRadius:3, bgcolor:'rgba(255,255,255,0.18)', '& .MuiLinearProgress-bar': { background:`linear-gradient(90deg, ${palette.dominant}, ${palette.accent})` } }} />
          <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:38, color:palette.text, bgcolor:'#d32f2f', borderRadius:1, px:0.7, py:0.2, mx:0.5, fontWeight:500 }}>
            {formatTime(Math.max(0, duration - progress))}
          </Typography>
          <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text, textAlign:'right' }}>{formatTime(duration)}</Typography>
        </Stack>
        <Box>
        <PlaybackControls
          isPlaying={isPlaying}
          volume={volume}
          onPlayPause={() => callApi(isPlaying ? 'pause' : 'play')}
          onNext={() => callApi('next')}
          onPrevious={() => callApi('previous')}
          onVolumeClick={handleVolumeClick}
          onMute={toggleMute}
          volumeOpen={volumeOpen}
          volumeAnchor={volumeAnchor}
          onVolumeClose={handleVolumeClose}
          onVolumeChange={updateVolume}
          palette={palette}
        />
        {controlError && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 0.6, display: 'block', textAlign: 'center' }}>{controlError}</Typography>
        )}
        </Box>
        {nextSong && nextSong.ArtworkURI && (
          <Box
            aria-label="next art thumb"
            sx={{
              position: 'absolute',
              top: '50%',
              right: { xs: 8, sm: 16 },
              transform: 'translateY(-50%)',
              width: { xs: '12vw', sm: '8vw', md: '70px', lg: '90px' },
              height: { xs: '12vw', sm: '8vw', md: '70px', lg: '90px' },
              maxWidth: '90px',
              maxHeight: '90px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: 1,
              boxShadow: '0 4px 14px -4px rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.25)',
              backgroundImage: `url(${nextSong.ArtworkURI})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
              zIndex: 3,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <Box sx={{
              position: 'absolute',
              top: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(240,240,240,0.92)',
              color: '#333',
              px: 1,
              py: 0.2,
              borderRadius: 2,
              fontSize: '0.62rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.10)',
              zIndex: 4,
              letterSpacing: '0.03em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '70px',
            }}>
              Up Next
            </Box>
            {nextSong && (
              <Box sx={{
                position: 'absolute',
                bottom: 6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '110px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                bgcolor: 'rgba(255,255,255,0.85)',
                borderRadius: 1,
                px: 0.5,
                py: 0.12,
                fontSize: '0.62rem',
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.08)',
                zIndex: 4,
              }}>
                <Box
                  sx={{
                    display: 'inline-block',
                    minWidth: '100%',
                    animation: 'marquee 18s linear infinite',
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 700, color: '#222', mr: 0.5 }}>{nextSong.Title}</Box>
                  <Box component="span" sx={{ fontWeight: 400, color: '#333', mr: 0.5 }}>/ {nextSong.Artists || nextSong.Artist}</Box>
                  {nextSong.Album && (
                    <Box component="span" sx={{ fontStyle: 'italic', color: '#888' }}>/ {nextSong.Album}</Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
        <Popover open={volumeOpen} anchorEl={volumeAnchor} onClose={handleVolumeClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Box sx={{ p:1.2, width:140 }}>
            <Typography variant="caption" sx={{ display:'block', textAlign:'center', mb:0.5, fontSize:'.6rem' }}>Vol {volume ?? '--'}</Typography>
            <Slider value={typeof volume==='number'?volume:0} min={0} max={100} onChange={(_,v)=>updateVolume(v as number)} sx={{ '& .MuiSlider-track':{ bgcolor:palette.dominant, height:4 }, '& .MuiSlider-rail':{ height:4 }, '& .MuiSlider-thumb':{ bgcolor:palette.accent, width:14, height:14 } }} />
          </Box>
        </Popover>
      </Box>
      {showSpotifyUris && spotifyData && (
        <SpotifyUris
          data={{
            ...spotifyData,
            canvas_url: (localCanvasMeta?.canvas_url ?? canvasMeta?.canvas_url ?? spotifyData.canvas_url) || undefined,
            canvas_not_found: typeof localCanvasMeta?.canvas_not_found === 'boolean' ? localCanvasMeta.canvas_not_found : (typeof canvasMeta?.canvas_not_found === 'boolean' ? canvasMeta.canvas_not_found : spotifyData.canvas_not_found),
            canvas_id: (localCanvasMeta?.canvas_id ?? canvasMeta?.canvas_id ?? spotifyData.canvas_id) || undefined
          }}
        />
      )}
      <style>{`@keyframes marquee {0%{transform:translateX(100%);}100%{transform:translateX(-100%);}}`}</style>
    </React.Fragment>
  );
};

export default NowPlaying;
