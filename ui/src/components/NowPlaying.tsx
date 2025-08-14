import React, { useEffect, useRef, useState } from 'react';
import PlaybackControls from './PlaybackControls';
import { Box, CircularProgress, Typography, LinearProgress, IconButton, Stack, Popover, Slider } from '@mui/material';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { NowPlayingResponse, Song } from '../types';
import { formatTime } from '../utils';
import { API_BASE } from '../config';
import { ThemeConfig } from '../themeConfig';
import KaleidoscopeBackground from './KaleidoscopeBackground';

interface Props { zoneName: string; theme: ThemeConfig; }

const NowPlaying: React.FC<Props> = ({ zoneName, theme }) => {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [volume, setVolume] = useState<number | null>(null);
  const [volumeAnchor, setVolumeAnchor] = useState<HTMLElement | null>(null);
  const volumeOpen = Boolean(volumeAnchor);
  const [previousVolume, setPreviousVolume] = useState<number | null>(null);
  const [showNextPreview, setShowNextPreview] = useState(false);
  const nextHoverTimeout = useRef<any>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const [palette, setPalette] = useState<{dominant:string; accent:string; text:string}>({dominant:'#444', accent:'#888', text:'#fff'});
  const [bgStack, setBgStack] = useState<Array<{src:string; id:number}>>([]);
  const nextIdRef = useRef(1);

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

  useEffect(() => {
    if (!zoneName) return;
    let cancelled = false;
    setLoading(true); setError(null); setNowPlaying(null); setVolume(null);
    const fetchNowPlaying = () => {
      fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}/nowplaying`)
        .then(res => { if (!res.ok) throw new Error(`API error: ${res.status}`); return res.json(); })
        .then(data => { if (!cancelled) setNowPlaying(data); })
        .catch(e => { if (!cancelled) setError(e.message || 'Unknown error'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    const fetchVolume = () => {
      fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}`)
        .then(res => { if (!res.ok) throw new Error(`API error: ${res.status}`); return res.json(); })
        .then(data => { const v = data?.Volume; if (!cancelled && typeof v === 'number') { setVolume(v); setPreviousVolume(p => (v > 0 && p == null) ? v : p); } })
        .catch(()=>{});
    };
    fetchNowPlaying(); fetchVolume();
    const interval = setInterval(fetchNowPlaying, 1000);
    const volInterval = setInterval(fetchVolume, 3000);
    return () => { cancelled = true; clearInterval(interval); clearInterval(volInterval); };
  }, [zoneName, refreshKey]);

  useEffect(() => {
    if (!theme.Diffused_Background) return;
    const src = nowPlaying?.CurrSong?.ArtworkURI; if (!src) return;
    setBgStack(prev => { if (prev.length && prev[prev.length - 1].src === src) return prev; const id = nextIdRef.current++; return [...prev, { src, id }].slice(-2); });
    const img = new Image(); img.crossOrigin='anonymous'; img.src = src; img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return;
        const w = canvas.width = 64; const h = canvas.height = 64; ctx.drawImage(img,0,0,w,h); const data = ctx.getImageData(0,0,w,h).data;
        const buckets: Record<string,{r:number;g:number;b:number;count:number}> = {}; let total=0;
        for (let i=0;i<data.length;i+=4){ const a=data[i+3]; if (a<128) continue; const r=data[i],g=data[i+1],b=data[i+2]; const mx=Math.max(r,g,b), mn=Math.min(r,g,b); if (mx-mn<18) continue; const key=`${r>>4}-${g>>4}-${b>>4}`; if(!buckets[key]) buckets[key]={r:0,g:0,b:0,count:0}; buckets[key].r+=r; buckets[key].g+=g; buckets[key].b+=b; buckets[key].count++; total++; }
        let dominant='#444', accent='#888'; if (total>0){ const sorted=Object.values(buckets).sort((a,b)=>b.count-a.count); const toHex=(v:number)=>('0'+v.toString(16)).slice(-2); if(sorted[0]) dominant=`#${toHex(Math.round(sorted[0].r/sorted[0].count))}${toHex(Math.round(sorted[0].g/sorted[0].count))}${toHex(Math.round(sorted[0].b/sorted[0].count))}`; if(sorted[1]) accent=`#${toHex(Math.round(sorted[1].r/sorted[1].count))}${toHex(Math.round(sorted[1].g/sorted[1].count))}${toHex(Math.round(sorted[1].b/sorted[1].count))}`; else accent=dominant; }
        const dr=parseInt(dominant.slice(1,3),16); const dg=parseInt(dominant.slice(3,5),16); const db=parseInt(dominant.slice(5,7),16); const lum=0.2126*dr+0.7152*dg+0.0722*db; const text= lum>150?'#111':'#fff'; setPalette({dominant,accent,text});
      } catch{}
    };
  }, [theme.Diffused_Background, nowPlaying?.CurrSong?.ArtworkURI]);

  const callApi = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    try { await fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}/player/${action}`); refresh(); } catch { refresh(); }
  };
  const updateVolume = (newVol:number) => {
    setVolume(newVol); if (newVol>0) setPreviousVolume(newVol); if ((updateVolume as any).t) clearTimeout((updateVolume as any).t);
    (updateVolume as any).t = setTimeout(()=> { fetch(`${API_BASE}/zones/${encodeURIComponent(zoneName)}?Volume=${newVol}`).catch(()=>{}); },200);
  };
  const toggleMute = () => { if (volume===0){ const restore = previousVolume && previousVolume>0 ? previousVolume : 25; updateVolume(restore); } else if (typeof volume==='number'){ if (volume>0) setPreviousVolume(volume); updateVolume(0);} };
  const handleNextHoverEnter = () => { if (nextHoverTimeout.current) clearTimeout(nextHoverTimeout.current); setShowNextPreview(true); };
  const handleNextHoverLeave = () => { if (nextHoverTimeout.current) clearTimeout(nextHoverTimeout.current); nextHoverTimeout.current = setTimeout(()=> setShowNextPreview(false),140); };
  const handleVolumeClick = (e:React.MouseEvent<HTMLElement>) => setVolumeAnchor(e.currentTarget);
  const handleVolumeClose = () => setVolumeAnchor(null);

  if (!zoneName) return null;
  if (loading) return <Box mt={4}><CircularProgress/></Box>;
  if (error) return <Box mt={4}><Typography color="error">{error}</Typography></Box>;
  if (!nowPlaying || !nowPlaying.CurrSong) return <Box mt={4}><Typography>No song playing</Typography></Box>;

  const song = nowPlaying.CurrSong as Song;
  const duration = song.Duration || 0;
  const progress = nowPlaying.CurrProgress || 0;
  const percent = duration > 0 ? (progress / duration) * 100 : 0;
  const isPlaying = nowPlaying.Status === 2;
  const nextSong = (nowPlaying && (nowPlaying.NextSong || (Array.isArray(nowPlaying.Queue) ? nowPlaying.Queue[1] : null) || (Array.isArray(nowPlaying.PlayQueue) ? nowPlaying.PlayQueue[1] : null))) || null;

  if (theme.name === 'Robust' && theme.Diffused_Background) {
    // Diffused album art background for Robust
    return (
      <Box sx={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 0 }}>
        {/* Layer 1: Diffused, cropped album art filling screen */}
        {song.ArtworkURI && (
          <Box
            component="img"
            src={song.ArtworkURI}
            alt={song.Title}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100vw',
              height: '100vh',
              objectFit: 'cover',
              filter: 'blur(32px) brightness(0.7) saturate(1.2)',
              zIndex: 0,
              transition: 'opacity 1.4s ease',
            }}
          />
        )}
        {/* Layer 2: Album art aspect ratio preserved, fill either width or height */}
        {song.ArtworkURI && (
          <Box
            component="img"
            src={song.ArtworkURI}
            alt={song.Title}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100vw',
              height: '100vh',
              objectFit: 'contain',
              zIndex: 1,
              opacity: 0.95,
              pointerEvents: 'none',
              transition: 'opacity 1.4s ease',
            }}
          />
        )}
        {/* Layer 3: Controls (full NowPlaying UI) */}
        <Box sx={{ position:'absolute', left:0, right:0, bottom:0, p:{xs:0.4, sm:0.6}, backdropFilter:'blur(14px) brightness(0.92)', bgcolor:'rgba(0,0,0,0.38)', borderTop:'1px solid rgba(255,255,255,0.12)', color:palette.text, zIndex:2, overflow:'hidden', '&:before': { content:'""', position:'absolute', top:-40, left:0, right:0, height:40, background:'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))', pointerEvents:'none' } }}>
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
            {/* Time remaining indicator */}
            <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:38, color:palette.text, bgcolor:'#d32f2f', borderRadius:1, px:0.7, py:0.2, mx:0.5, fontWeight:500 }}>
              {formatTime(Math.max(0, duration - progress))}
            </Typography>
            <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text, textAlign:'right' }}>{formatTime(duration)}</Typography>
          </Stack>
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
              {/* Marquee for next song info at bottom of album art */}
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
        <style>{`@keyframes marquee {0%{transform:translateX(100%);}100%{transform:translateX(-100%);}}`}</style>
      </Box>
    );
  }
  if (theme.Kaleidoscope_Background) {
    return (
      <Box sx={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 0 }}>
        <KaleidoscopeBackground />
        {/* Layer 2: Album art aspect ratio preserved, fill either width or height */}
        {song.ArtworkURI && (
          <Box
            component="img"
            src={song.ArtworkURI}
            alt={song.Title}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100vw',
              height: '100vh',
              objectFit: 'contain',
              zIndex: 1,
              opacity: 0.95,
              pointerEvents: 'none',
              transition: 'opacity 1.4s ease',
            }}
          />
        )}
        {/* Layer 3: Controls (full NowPlaying UI) */}
        <Box sx={{ position:'absolute', left:0, right:0, bottom:0, p:{xs:0.4, sm:0.6}, backdropFilter:'blur(14px) brightness(0.92)', bgcolor:'rgba(0,0,0,0.38)', borderTop:'1px solid rgba(255,255,255,0.12)', color:palette.text, zIndex:2, overflow:'hidden', '&:before': { content:'""', position:'absolute', top:-40, left:0, right:0, height:40, background:'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))', pointerEvents:'none' } }}>
          <Box sx={{ width:'100%', overflow:'hidden', mb:0.2 }}>
            <Typography variant="subtitle1" sx={{ fontSize:{xs:'.85rem', sm:'.95rem'}, whiteSpace:'nowrap', animation: song.Title.length > 40 ? 'marquee 18s linear infinite' : 'none', fontWeight:600, color:palette.text }}>{song.Title}</Typography>
          </Box>
          <Typography variant="caption" sx={{ fontSize:{xs:'.60rem', sm:'.65rem'}, letterSpacing:'.03em', opacity:0.9, color:palette.text, display:'flex', alignItems:'center', gap:0.6, whiteSpace:'nowrap', overflow:'hidden' }}>
            <Box component="span" sx={{ overflow:'hidden', textOverflow:'ellipsis' }}>{song.Artists}</Box>
            {song.Album && <Box component="span" sx={{ color:'rgba(255,255,255,0.55)', fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', maxWidth:{xs:140, sm:220} }}>• {song.Album}</Box>}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mt:0.4, pr:{xs:10, sm:15} }}>
            <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text }}>{formatTime(progress)}</Typography>
            <LinearProgress variant="determinate" value={percent} sx={{ flex:1, height:5, borderRadius:3, bgcolor:'rgba(255,255,255,0.18)', '& .MuiLinearProgress-bar': { background:`linear-gradient(90deg, ${palette.dominant}, ${palette.accent})` } }} />
            {/* Time remaining indicator */}
            <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:38, color:palette.text, bgcolor:'#d32f2f', borderRadius:1, px:0.7, py:0.2, mx:0.5, fontWeight:500 }}>
              {formatTime(Math.max(0, duration - progress))}
            </Typography>
            <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text, textAlign:'right' }}>{formatTime(duration)}</Typography>
          </Stack>
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
              }}>Up Next</Box>
              {/* Marquee for next song info at bottom of album art */}
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
                      animation: (nextSong.Title && nextSong.Title.length > 18) ? 'marquee 18s linear infinite' : 'none',
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
        <style>{`@keyframes marquee {0%{transform:translateX(100%);}100%{transform:translateX(-100%);}}`}</style>
      </Box>
    );
  }
  // All other themes: solid black background
  return (
    <Box sx={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 0, background: '#000' }}>
      {/* Layer 2: Album art aspect ratio preserved, fill either width or height */}
      {song.ArtworkURI && (
        <Box
          component="img"
          src={song.ArtworkURI}
          alt={song.Title}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'contain',
            zIndex: 1,
            opacity: 0.95,
            pointerEvents: 'none',
            transition: 'opacity 1.4s ease',
          }}
        />
      )}
      {/* Layer 3: Controls (full NowPlaying UI) */}
      <Box sx={{ position:'absolute', left:0, right:0, bottom:0, p:{xs:0.4, sm:0.6}, backdropFilter:'blur(14px) brightness(0.92)', bgcolor:'rgba(0,0,0,0.38)', borderTop:'1px solid rgba(255,255,255,0.12)', color:palette.text, zIndex:2, overflow:'hidden', '&:before': { content:'""', position:'absolute', top:-40, left:0, right:0, height:40, background:'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))', pointerEvents:'none' } }}>
        <Box sx={{ width:'100%', overflow:'hidden', mb:0.2 }}>
          <Typography variant="subtitle1" sx={{ fontSize:{xs:'.85rem', sm:'.95rem'}, whiteSpace:'nowrap', animation: song.Title.length > 40 ? 'marquee 18s linear infinite' : 'none', fontWeight:600, color:palette.text }}>{song.Title}</Typography>
        </Box>
        <Typography variant="caption" sx={{ fontSize:{xs:'.60rem', sm:'.65rem'}, letterSpacing:'.03em', opacity:0.9, color:palette.text, display:'flex', alignItems:'center', gap:0.6, whiteSpace:'nowrap', overflow:'hidden' }}>
          <Box component="span" sx={{ overflow:'hidden', textOverflow:'ellipsis' }}>{song.Artists}</Box>
          {song.Album && <Box component="span" sx={{ color:'rgba(255,255,255,0.55)', fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', maxWidth:{xs:140, sm:220} }}>• {song.Album}</Box>}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mt:0.4, pr:{xs:10, sm:15} }}>
          <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text }}>{formatTime(progress)}</Typography>
          <LinearProgress variant="determinate" value={percent} sx={{ flex:1, height:5, borderRadius:3, bgcolor:'rgba(255,255,255,0.18)', '& .MuiLinearProgress-bar': { background:`linear-gradient(90deg, ${palette.dominant}, ${palette.accent})` } }} />
          {/* Time remaining indicator */}
          <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:38, color:palette.text, bgcolor:'#d32f2f', borderRadius:1, px:0.7, py:0.2, mx:0.5, fontWeight:500 }}>
            {formatTime(Math.max(0, duration - progress))}
          </Typography>
          <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text, textAlign:'right' }}>{formatTime(duration)}</Typography>
        </Stack>
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
            }}>Up Next</Box>
            {/* Marquee for next song info at bottom of album art */}
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
                    animation: (nextSong.Title && nextSong.Title.length > 18) ? 'marquee 18s linear infinite' : 'none',
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
      <style>{`@keyframes marquee {0%{transform:translateX(100%);}100%{transform:translateX(-100%);}}`}</style>
    </Box>
  );
};

export default NowPlaying;
