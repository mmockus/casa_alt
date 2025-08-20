import React, { useEffect, useMemo, useState } from 'react';
import { Box, ThemeProvider, CssBaseline, Typography } from '@mui/material';
import { createTheme } from '@mui/material/styles';
// Components
import RoomSelector from './components/RoomSelector';
import NowPlaying from './components/NowPlaying';
import SettingsModal from './components/SettingsModal';
import CanvasVideo from './components/CanvasVideo';
import KaleidoscopeBackground from './components/KaleidoscopeBackground';
// Types & utils
import { themes, ThemeConfig } from './themeConfig';
import { useNowPlaying } from './hooks/useNowPlaying';
import { CANVAS_DEFAULT_VIDEO, CANVAS_API, API_BASE } from './config';


// API base now centralized in config.ts
// RoomSelector moved to components/RoomSelector.tsx


// NowPlaying moved to components/NowPlaying.tsx
// (Removed duplicate JSX after NowPlaying's return statement)

// KaleidoscopeBackground moved to components/KaleidoscopeBackground.tsx

// (Pride theme removed)

export default function App() {
  // remove reading localStorage on app load per spec: show only RoomSelector initially
  // Initialize selectedZone from localSettings if available (per spec: restore previously selected room)
  const [selectedZone, setSelectedZone] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('localSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.selectedZone) return parsed.selectedZone;
      }
    } catch {/* ignore */}
    return '';
  });
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const raw = localStorage.getItem('localSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.themeName) {
          const found = themes.find(t => t.name === parsed.themeName);
          if (found) return found;
        }
      }
    } catch {/* ignore */}
    return themes[1];
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSpotifyUris, setShowSpotifyUris] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('localSettings');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!parsed.showSpotifyUris;
    } catch { return false; }
  });

  // Listen to storage events (in case settings modified while modal open, ensure App reflects changes)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'localSettings') {
        try { const parsed = JSON.parse(e.newValue || '{}'); setShowSpotifyUris(!!parsed.showSpotifyUris); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    const interval = setInterval(() => {
      // Poll every 2s as modal writes localStorage in same tab (storage event won't fire)
      try { const parsed = JSON.parse(localStorage.getItem('localSettings') || '{}'); const flag = !!parsed.showSpotifyUris; setShowSpotifyUris(prev => prev !== flag ? flag : prev); } catch { /* ignore */ }
    }, 2000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, []);

  // Persist theme selection inside localSettings only
  useEffect(() => {
    try {
      const raw = localStorage.getItem('localSettings');
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed.themeName !== theme.name) {
        parsed.themeName = theme.name;
        localStorage.setItem('localSettings', JSON.stringify(parsed));
      }
    } catch {/* ignore */}
  }, [theme.name]);

  // Persist selectedZone only after user chooses a room
  useEffect(() => {
    try {
      const raw = localStorage.getItem('localSettings');
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed.selectedZone !== selectedZone) {
        parsed.selectedZone = selectedZone;
        localStorage.setItem('localSettings', JSON.stringify(parsed));
      }
    } catch {/* ignore */}
  }, [selectedZone]);

  const muiTheme = React.useMemo(() => createTheme({ palette: { mode: 'dark' } }), []);

  // Track selected zone power state: null = unknown/loading, true = on, false = off
  const [selectedZonePower, setSelectedZonePower] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!selectedZone) { setSelectedZonePower(null); return; }
    setSelectedZonePower(null);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/zones`);
        if (!res.ok) { if (!cancelled) setSelectedZonePower(false); return; }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const found = list.find((z: any) => z.Name === selectedZone || String(z.ZoneID) === String(selectedZone) || z.PersistentZoneID === selectedZone);
        if (!cancelled) setSelectedZonePower(!!found?.Power);
      } catch (e) {
        if (!cancelled) setSelectedZonePower(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedZone]);

  // Minimal UI on first load per control behavior spec: only background color + RoomSelector
  if (!selectedZone) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {/* Front layer: Room selector (top) */}
        <Box sx={{ position: 'fixed', top: 20, left: 0, width: '100%', zIndex: 5, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <Box sx={{ pointerEvents: 'auto', borderRadius: 24, boxShadow: 4, bgcolor: 'background.paper', height: 24, minWidth: 320, maxWidth: 420, mx: 'auto', display: 'flex', alignItems: 'center', py: 0, px: 2.5 }}>
            <RoomSelector compact selectedZone={selectedZone} setSelectedZone={setSelectedZone} theme={theme} setTheme={setTheme} onOpenSettings={() => setSettingsOpen(true)} />
          </Box>
        </Box>
        {/* Background color only - no other controls or API calls */}
        <Box sx={{ position:'fixed', inset:0, overflow:'hidden', zIndex:0, background:'#000' }} />
        {/* Settings modal must be available even when no room is selected */}
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} setTheme={setTheme} />
      </ThemeProvider>
    );
  }

  // MainContent is mounted only after a zone is selected; it contains all now-playing related hooks and UI
  const MainContent: React.FC<{ zoneName: string; theme: ThemeConfig; showSpotifyUris: boolean; onOpenSettings: ()=>void }>= ({ zoneName, theme, showSpotifyUris, onOpenSettings }) => {
    const [albumArt, setAlbumArt] = useState<string | null>(null);
    const [palette, setPalette] = useState<{dominant:string;accent:string;text:string}>({dominant:'#444',accent:'#888',text:'#fff'});
    const { nowPlaying } = useNowPlaying(zoneName || undefined);

    // Derive song identity & spotifyTrackId centrally
    const songIdentity = React.useMemo(() => {
      const s: any = nowPlaying?.CurrSong;
      if (!s) return null;
      const title = s.Title || s.title;
      const artist = s.Artist || s.Artists || s.artist;
      const album = s.Album || s.album;
      if (!title || !artist) return null;
      return `${title}|${artist}|${album||''}`;
    }, [nowPlaying?.CurrSong]);
    const spotifyTrackId = React.useMemo(() => {
      const dl = (nowPlaying?.CurrSong as any)?.DeepLinks;
      if (Array.isArray(dl)) {
        for (const entry of dl) {
          if (!entry?.URI) continue;
          if (entry.URI.startsWith('spotify:track:')) return entry.URI.split(':')[2];
        }
      }
      return null;
    }, [nowPlaying?.CurrSong]);

    const [canvasMeta, setCanvasMeta] = useState<{ canvas_url?: string | null; canvas_id?: string | null; canvas_not_found?: boolean }>({});
    const [defaultCanvasVideo, setDefaultCanvasVideo] = useState<string | undefined>(() => {
      try {
        const ls = JSON.parse(localStorage.getItem('localSettings') || '{}');
        if (ls.defaultCanvasVideo) return ls.defaultCanvasVideo;
        if (CANVAS_DEFAULT_VIDEO) {
          ls.defaultCanvasVideo = CANVAS_DEFAULT_VIDEO;
          localStorage.setItem('localSettings', JSON.stringify(ls));
          return CANVAS_DEFAULT_VIDEO;
        }
      } catch {/* ignore */}
      return undefined;
    });

    // Canvas API query when new song loads
    useEffect(() => {
      if (!theme.Canvas) {
        if (canvasMeta && Object.keys(canvasMeta).length) setCanvasMeta({});
        return;
      }
      if (!songIdentity || !spotifyTrackId) return;
      if (!CANVAS_API) return;

      let cancelled = false;
      const controller = new AbortController();

      (async () => {
        try {
          const url = `${CANVAS_API}${CANVAS_API.includes('?') ? '&' : '?'}track=${encodeURIComponent(spotifyTrackId)}`;
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) {
            if (!cancelled) setCanvasMeta({ canvas_not_found: true });
            return;
          }

          const contentType = (res.headers.get('content-type') || '').toLowerCase();
          let body: any = null;
          if (contentType.includes('application/json')) {
            body = await res.json();
          } else {
            const txt = await res.text();
            try { body = JSON.parse(txt); } catch { body = txt.trim(); }
          }
          if (cancelled) return;

          let canvas_url: string | null = null;
          let canvas_id: string | null = null;
          let canvas_not_found = false;

          if (typeof body === 'string') {
            const txt = body as string;
            if (txt) {
              canvas_url = txt;
              try {
                const u = new URL(txt);
                const t = u.searchParams.get('track'); if (t) canvas_id = t;
              } catch {/* not a URL */}
              if (!canvas_id) {
                const m = txt.match(/([A-Za-z0-9]{22})/);
                if (m) canvas_id = m[1];
              }
            } else {
              canvas_not_found = true;
            }
          } else if (typeof body === 'object' && body !== null) {
            canvas_url = body.canvas_url || body.url || body.canvasUrl || null;
            canvas_id = body.canvas_id || body.id || body.canvasId || null;
            canvas_not_found = !!(body.canvas_not_found || body.not_found || body.canvasNotFound);
          }

          setCanvasMeta({ canvas_url: canvas_url || null, canvas_id: canvas_id || null, canvas_not_found: !!canvas_not_found });
        } catch (e) {
          if (!cancelled) setCanvasMeta({ canvas_not_found: true });
        }
      })();

      return () => { cancelled = true; controller.abort(); };
    }, [songIdentity, spotifyTrackId, theme.Canvas]);

    // Palette extraction for album art
    useEffect(() => {
      const src = albumArt; if (!src) return;
      const img = new Image(); img.crossOrigin='anonymous'; img.src = src; img.onload = () => {
        try {
          const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return;
          const w = canvas.width = 64; const h = canvas.height = 64; ctx.drawImage(img,0,0,w,h); const data = ctx.getImageData(0,0,w,h).data;
          const buckets: Record<string,{r:number;g:number;b:number;count:number}> = {}; let total=0;
          for (let i=0;i<data.length;i+=4){ const a=data[i+3]; if (a<128) continue; const r=data[i],g=data[i+1],b=data[i+2]; const mx=Math.max(r,g,b), mn=Math.min(r,g,b); if (mx-mn<18) continue; const key=`${r>>4}-${g>>4}-${b>>4}`; if(!buckets[key]) buckets[key]={r:0,g:0,b:0,count:0}; buckets[key].r+=r; buckets[key].g+=g; buckets[key].b+=b; buckets[key].count++; total++; }
          let dominant='#444', accent='#888'; if (total>0){ const sorted=Object.values(buckets).sort((a,b)=>b.count-a.count); const toHex=(v:number)=>('0'+v.toString(16)).slice(-2); if(sorted[0]) dominant=`#${toHex(Math.round(sorted[0].r/sorted[0].count))}${toHex(Math.round(sorted[0].g/sorted[0].count))}${toHex(Math.round(sorted[0].b/sorted[0].count))}`; if(sorted[1]) accent=`#${toHex(Math.round(sorted[1].r/sorted[1].count))}${toHex(Math.round(sorted[1].g/sorted[1].count))}${toHex(Math.round(sorted[1].b/sorted[1].count))}`; else accent=dominant; }
          const dr=parseInt(dominant.slice(1,3),16); const dg=parseInt(dominant.slice(3,5),16); const db=parseInt(dominant.slice(5,7),16); const lum=0.2126*dr+0.7152*dg+0.0722*db; const text= lum>150?'#111':'#fff'; setPalette({dominant,accent,text});
        } catch{/* ignore */}
      };
    }, [albumArt]);

    // Dynamically compute canvas video positioning relative to album art (frontmiddle layer)
    const [canvasLeftPx, setCanvasLeftPx] = useState<number | null>(null);
    const [canvasWidthPx, setCanvasWidthPx] = useState<number | null>(null);
    useEffect(() => {
      if (!theme.Canvas) return;
      const compute = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const img = document.getElementById('album-art-main') as HTMLImageElement | null;
        let albumArtWidth: number;
        if (img && img.naturalWidth && img.naturalHeight) {
          const imageAspect = img.naturalWidth / img.naturalHeight;
          const viewportAspect = vw / vh;
          if (imageAspect > viewportAspect) {
            albumArtWidth = vw;
          } else {
            albumArtWidth = vh * imageAspect;
          }
        } else {
          albumArtWidth = Math.min(vw, vh);
        }
        const remaining = Math.max(0, vw - albumArtWidth);
        let videoWidth = remaining * 0.4;
        if (!videoWidth || videoWidth < 40) {
          videoWidth = Math.min(vw, vh) * 0.28;
          videoWidth = Math.max(160, Math.min(videoWidth, 360));
        }
        let videoHeight = videoWidth * (16/9);
        const maxHeight = vh * 0.9;
        if (videoHeight > maxHeight) {
          videoHeight = maxHeight;
          videoWidth = videoHeight * (9/16);
        }
        const widthNotAlbum = Math.max(0, vw - albumArtWidth);
        let centerX: number;
        if (widthNotAlbum > 4) {
          const leftEdge = (widthNotAlbum / 2) + albumArtWidth + ((widthNotAlbum / 2 - videoWidth) / 2);
          centerX = leftEdge + (videoWidth / 2);
        } else {
          centerX = vw * 0.78;
        }
        let adjustedCenterX = centerX;
        if (adjustedCenterX + videoWidth / 2 > vw) adjustedCenterX = vw - videoWidth / 2 - 8;
        if (adjustedCenterX - videoWidth / 2 < 0) adjustedCenterX = videoWidth / 2 + 8;
        setCanvasLeftPx(adjustedCenterX);
        setCanvasWidthPx(videoWidth);
      };
      compute();
      const onResize = () => compute();
      window.addEventListener('resize', onResize);
      const interval = setInterval(compute, 1200);
      const imgEl = document.getElementById('album-art-main') as HTMLImageElement | null;
      if (imgEl) imgEl.addEventListener('load', compute);
      return () => { window.removeEventListener('resize', onResize); clearInterval(interval); if (imgEl) imgEl.removeEventListener('load', compute); };
    }, [theme.Canvas, zoneName, theme.name]);

    return (
      <>
        {/* Background layer stack */}
        <Box sx={{ position:'fixed', inset:0, overflow:'hidden', zIndex:0, background:'#000' }} />
        {/* BackMiddle: diffused album art */}
        {theme.Diffused_Background && albumArt && !theme.Kaleidoscope_Background && (
          <Box component="img" src={albumArt} alt="diffused" sx={{ position:'fixed', inset:0, width:'100vw', height:'100vh', objectFit:'cover', filter:'blur(32px) brightness(0.7) saturate(1.2)', zIndex:1, transition:'opacity 1.2s ease' }} />
        )}
        {/* Middle: kaleidoscope background */}
        {theme.Kaleidoscope_Background && (
          <Box sx={{ position:'fixed', inset:0, zIndex:1 }}>
            <KaleidoscopeBackground />
          </Box>
        )}
        {/* FrontMiddle: album art + video (video positioned via leftPx) */}
        {albumArt && (
          <Box component="img" id="album-art-main" src={albumArt} alt="album" sx={{ position:'fixed', inset:0, width:'100vw', height:'100vh', objectFit:'contain', zIndex:2, opacity:0.95, pointerEvents:'none', transition:'opacity 1.2s ease' }} />
        )}
        {theme.Canvas && (canvasMeta?.canvas_url || defaultCanvasVideo) && canvasLeftPx != null && canvasWidthPx != null && (
          <CanvasVideo debug leftPx={canvasLeftPx} widthPx={canvasWidthPx} verticalCenter defaultSrc={canvasMeta?.canvas_url || defaultCanvasVideo} />
        )}
        {/* Front: NowPlaying overlay */}
        <Box sx={{ position:'fixed', inset:0, zIndex:3 }}>
          <NowPlaying zoneName={zoneName} theme={theme} showSpotifyUris={showSpotifyUris} canvasMeta={canvasMeta} nowPlayingExternal={nowPlaying || undefined} onArtworkChange={(uri)=>setAlbumArt(uri)} />
        </Box>
      </>
    );
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {/* Front layer: Room selector (top) */}
      <Box sx={{ position: 'fixed', top: 20, left: 0, width: '100%', zIndex: 5, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <Box sx={{ pointerEvents: 'auto', borderRadius: 24, boxShadow: 4, bgcolor: 'background.paper', height: 24, minWidth: 320, maxWidth: 420, mx: 'auto', display: 'flex', alignItems: 'center', py: 0, px: 2.5 }}>
          <RoomSelector compact selectedZone={selectedZone} setSelectedZone={setSelectedZone} theme={theme} setTheme={setTheme} onOpenSettings={() => setSettingsOpen(true)} />
        </Box>
      </Box>

      {/* Now that a zone is selected, mount the main content ONLY when the zone is ON per spec. */}
      {selectedZonePower === true && (
        <MainContent zoneName={selectedZone} theme={theme} showSpotifyUris={showSpotifyUris} onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {selectedZonePower === false && (
        <>
          {/* Zone is OFF: do not mount NowPlaying, CanvasVideo, KaleidoscopeBackground, or PlaybackControls */}
          <Box sx={{ position:'fixed', inset:0, overflow:'hidden', zIndex:0, background:'#000' }} />
          <Box sx={{ position:'fixed', top: 80, left:0, width:'100%', zIndex:3, display:'flex', justifyContent:'center', pointerEvents:'none' }}>
            <Box sx={{ pointerEvents:'auto', bgcolor:'background.paper', px:2, py:1, borderRadius:2, boxShadow:3 }}>
              <Typography variant="body2">Selected room is OFF — controls are disabled.</Typography>
            </Box>
          </Box>
        </>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} setTheme={setTheme} />
    </ThemeProvider>
  );
}
