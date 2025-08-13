import React, { useEffect, useRef, useState } from 'react';
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

interface Props { zoneName: string; themeName?: string; }

const NowPlaying: React.FC<Props> = ({ zoneName, themeName }) => {
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
  if (themeName !== 'immersive art' && themeName !== 'Full cover' && themeName !== 'New cover') return;
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
  }, [themeName, nowPlaying?.CurrSong?.ArtworkURI]);

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

  if (!zoneName) return null; if (loading) return <Box mt={4}><CircularProgress/></Box>; if (error) return <Box mt={4}><Typography color="error">{error}</Typography></Box>; if (!nowPlaying || !nowPlaying.CurrSong) return <Box mt={4}><Typography>No song playing</Typography></Box>;

  const song = nowPlaying.CurrSong as Song; const duration = song.Duration || 0; const progress = nowPlaying.CurrProgress || 0; const percent = duration>0 ? (progress/duration)*100 : 0; const isPlaying = nowPlaying.Status === 2;
  const nextSong = (nowPlaying && (nowPlaying.NextSong || (Array.isArray(nowPlaying.Queue)? nowPlaying.Queue[1]: null) || (Array.isArray(nowPlaying.PlayQueue)? nowPlaying.PlayQueue[1]: null))) || null;

  if (themeName === 'Full cover' || themeName === 'New cover') {
    // Custom 3-layer background for 'New cover'
    if (themeName === 'New cover') {
      return (
        <Box sx={{ position:'fixed', inset:0, width:'100vw', height:'100vh', overflow:'hidden', zIndex:0 }}>
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
              <Typography variant="subtitle1" sx={{ fontSize:{xs:'.85rem', sm:'.95rem'}, whiteSpace:'nowrap', animation: song.Title.length > 40 ? 'marquee 18s linear infinite' : 'none', fontWeight:600, color:palette.text }}>{song.Title}</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize:{xs:'.60rem', sm:'.65rem'}, letterSpacing:'.03em', opacity:0.9, color:palette.text, display:'flex', alignItems:'center', gap:0.6, whiteSpace:'nowrap', overflow:'hidden' }}>
              <Box component="span" sx={{ overflow:'hidden', textOverflow:'ellipsis' }}>{song.Artists}</Box>
              {song.Album && <Box component="span" sx={{ color:'rgba(255,255,255,0.55)', fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', maxWidth:{xs:140, sm:220} }}>• {song.Album}</Box>}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mt:0.4, pr:{xs:10, sm:15} }}>
              <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text }}>{formatTime(progress)}</Typography>
              <LinearProgress variant="determinate" value={percent} sx={{ flex:1, height:5, borderRadius:3, bgcolor:'rgba(255,255,255,0.18)', '& .MuiLinearProgress-bar': { background:`linear-gradient(90deg, ${palette.dominant}, ${palette.accent})` } }} />
              <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text, textAlign:'right' }}>{formatTime(duration)}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt:0.7 }}>
              <IconButton size="small" onClick={() => callApi('previous')} sx={{ color:palette.text, p:0.5 }}><SkipPreviousIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => callApi(isPlaying ? 'pause':'play')} sx={{ p:0.6, bgcolor:`${palette.dominant}55`, color:palette.text, '&:hover':{ bgcolor:`${palette.dominant}88` } }}>{isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}</IconButton>
              <Box sx={{ position:'relative', display:'inline-flex' }} onMouseEnter={handleNextHoverEnter} onMouseLeave={handleNextHoverLeave}>
                <IconButton ref={(r)=> { nextBtnRef.current = r; }} size="small" onClick={() => callApi('next')} sx={{ color:palette.text, p:0.5 }}><SkipNextIcon fontSize="small" /></IconButton>
                {showNextPreview && nextSong && (
                  <Box sx={{ position:'absolute', bottom:'100%', mb:0.6, right:0, width:{xs:70, sm:110}, height:{xs:70, sm:110}, borderRadius:1, boxShadow:'0 4px 14px -4px rgba(0,0,0,0.7)', border:'1px solid rgba(255,255,255,0.25)', overflow:'hidden', backgroundImage: nextSong.ArtworkURI?`url(${nextSong.ArtworkURI})`: 'none', backgroundSize:'cover', backgroundPosition:'center', bgcolor:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-end', justifyContent:'stretch' }}>
                    <Box sx={{ width:'100%', backdropFilter:'blur(4px) brightness(0.9)', bgcolor:'rgba(0,0,0,0.45)', p:0.4 }}>
                      <Typography variant="caption" sx={{ display:'block', fontSize:{xs:'0.48rem', sm:'0.55rem'}, fontWeight:600, lineHeight:1.1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nextSong.Title || 'Next'}</Typography>
                      <Typography variant="caption" sx={{ display:'block', fontSize:{xs:'0.42rem', sm:'0.5rem'}, color:'rgba(255,255,255,0.65)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nextSong.Artists || nextSong.Artist || ''}</Typography>
                    </Box>
                  </Box>
                )}
              </Box>
              <IconButton size="small" onClick={handleVolumeClick} sx={{ color:palette.text, p:0.5 }}><VolumeUpIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={toggleMute} sx={{ color:palette.text, p:0.5 }}>{volume===0? <VolumeOffIcon fontSize="small" color="error" /> : <VolumeOffIcon fontSize="small" />}</IconButton>
            </Stack>
            {song.ArtworkURI && (
              <Box aria-label="art thumb" sx={{ position:'absolute', right:{xs:6, sm:10}, bottom:{xs:6, sm:8}, width:{xs:70, sm:110}, height:{xs:70, sm:110}, borderRadius:1, boxShadow:'0 4px 14px -4px rgba(0,0,0,0.7)', border:'1px solid rgba(255,255,255,0.25)', backgroundImage:`url(${song.ArtworkURI})`, backgroundSize:'cover', backgroundPosition:'center', backgroundColor:'rgba(255,255,255,0.08)' }} />
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
    // Fallback for 'Full cover'
    return (
      <Box sx={{ position:'fixed', inset:0, width:'100%', height:'100%', overflow:'hidden', zIndex:0 }}>
        {song.ArtworkURI && (<Box component="img" src={song.ArtworkURI} alt={song.Title} sx={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'opacity 1.4s ease', filter:'none' }} />)}
        <Box sx={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%), linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 25%)', pointerEvents:'none' }} />
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
            <Typography variant="caption" sx={{ fontSize:'.55rem', minWidth:30, color:palette.text, textAlign:'right' }}>{formatTime(duration)}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt:0.7 }}>
            <IconButton size="small" onClick={() => callApi('previous')} sx={{ color:palette.text, p:0.5 }}><SkipPreviousIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => callApi(isPlaying ? 'pause':'play')} sx={{ p:0.6, bgcolor:`${palette.dominant}55`, color:palette.text, '&:hover':{ bgcolor:`${palette.dominant}88` } }}>{isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}</IconButton>
            <Box sx={{ position:'relative', display:'inline-flex' }} onMouseEnter={handleNextHoverEnter} onMouseLeave={handleNextHoverLeave}>
              <IconButton ref={(r)=> { nextBtnRef.current = r; }} size="small" onClick={() => callApi('next')} sx={{ color:palette.text, p:0.5 }}><SkipNextIcon fontSize="small" /></IconButton>
              {showNextPreview && nextSong && (
                <Box sx={{ position:'absolute', bottom:'100%', mb:0.6, right:0, width:{xs:70, sm:110}, height:{xs:70, sm:110}, borderRadius:1, boxShadow:'0 4px 14px -4px rgba(0,0,0,0.7)', border:'1px solid rgba(255,255,255,0.25)', overflow:'hidden', backgroundImage: nextSong.ArtworkURI?`url(${nextSong.ArtworkURI})`: 'none', backgroundSize:'cover', backgroundPosition:'center', bgcolor:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-end', justifyContent:'stretch' }}>
                  <Box sx={{ width:'100%', backdropFilter:'blur(4px) brightness(0.9)', bgcolor:'rgba(0,0,0,0.45)', p:0.4 }}>
                    <Typography variant="caption" sx={{ display:'block', fontSize:{xs:'0.48rem', sm:'0.55rem'}, fontWeight:600, lineHeight:1.1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nextSong.Title || 'Next'}</Typography>
                    <Typography variant="caption" sx={{ display:'block', fontSize:{xs:'0.42rem', sm:'0.5rem'}, color:'rgba(255,255,255,0.65)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nextSong.Artists || nextSong.Artist || ''}</Typography>
                  </Box>
                </Box>
              )}
            </Box>
            <IconButton size="small" onClick={handleVolumeClick} sx={{ color:palette.text, p:0.5 }}><VolumeUpIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={toggleMute} sx={{ color:palette.text, p:0.5 }}>{volume===0? <VolumeOffIcon fontSize="small" color="error" /> : <VolumeOffIcon fontSize="small" />}</IconButton>
          </Stack>
          {song.ArtworkURI && (
            <Box aria-label="art thumb" sx={{ position:'absolute', right:{xs:6, sm:10}, bottom:{xs:6, sm:8}, width:{xs:70, sm:110}, height:{xs:70, sm:110}, borderRadius:1, boxShadow:'0 4px 14px -4px rgba(0,0,0,0.7)', border:'1px solid rgba(255,255,255,0.25)', backgroundImage:`url(${song.ArtworkURI})`, backgroundSize:'cover', backgroundPosition:'center', backgroundColor:'rgba(255,255,255,0.08)' }} />
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

  if (themeName === 'immersive art') {
    const gradientOverlay = `linear-gradient(120deg, ${palette.dominant}88, ${palette.accent}55)`;
    return (
      <Box sx={{ position:'relative', width:'100%', height:'70vh', maxWidth:1000, mx:'auto', mt:1, borderRadius:2, overflow:'hidden', boxShadow:6 }}>
        <Box sx={{ position:'absolute', inset:0 }}>
          {bgStack.map((b, idx)=> (
            <Box key={b.id} sx={{ position:'absolute', inset:0, backgroundImage:`url(${b.src})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(32px) brightness(0.55)', transform:'scale(1.18)', opacity: idx === bgStack.length-1 ? 1 : 0, transition:'opacity 1.6s ease' }} />
          ))}
          <Box sx={{ position:'absolute', inset:0, background: gradientOverlay, mixBlendMode:'overlay', opacity:0.75, transition:'background 1s linear' }} />
          <Box sx={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 70%, rgba(0,0,0,0.55), rgba(0,0,0,0.9))' }} />
        </Box>
        {song.ArtworkURI && (
          <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <Box component="img" src={song.ArtworkURI} alt={song.Title} sx={{ width:{xs:230, sm:340}, height:{xs:230, sm:340}, objectFit:'contain', boxShadow:`0 8px 28px -8px ${palette.dominant}AA`, borderRadius:2, transition:'box-shadow 1s' }} />
          </Box>
        )}
        <Box sx={{ position:'absolute', left:0, right:0, bottom:0, p:{xs:1, sm:1.5}, backdropFilter:'blur(14px) brightness(0.9)', bgcolor:'rgba(0,0,0,0.22)', borderTop:'1px solid rgba(255,255,255,0.12)', color:palette.text, transition:'color .6s', zIndex:2, '&:before': { content:'""', position:'absolute', top:-60, left:0, right:0, height:60, background:'linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0))', pointerEvents:'none' } }}>
          <Box sx={{ width:'100%', overflow:'hidden' }}>
            <Typography variant="subtitle1" sx={{ whiteSpace:'nowrap', animation: song.Title.length > 34 ? 'marquee 18s linear infinite' : 'none', fontWeight:600, color:palette.text }}>{song.Title}</Typography>
          </Box>
          <Typography variant="body2" sx={{ opacity:0.92, color:palette.text, display:'flex', alignItems:'center', gap:1, flexWrap:'nowrap', whiteSpace:'nowrap', overflow:'hidden' }}>
            <Box component="span" sx={{ overflow:'hidden', textOverflow:'ellipsis' }}>{song.Artists}</Box>
            {song.Album && <Box component="span" sx={{ color:'rgba(255,255,255,0.55)', fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', maxWidth:{xs:200, sm:320} }}>• {song.Album}</Box>}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt:0.7 }}>
            <Typography variant="caption" sx={{ minWidth:34, color:palette.text }}>{formatTime(progress)}</Typography>
            <LinearProgress variant="determinate" value={percent} sx={{ flex:1, height:7, borderRadius:4, bgcolor:'rgba(255,255,255,0.18)', '& .MuiLinearProgress-bar': { background:`linear-gradient(90deg, ${palette.dominant}, ${palette.accent})` } }} />
            <Typography variant="caption" sx={{ minWidth:34, color:palette.text }}>{formatTime(duration)}</Typography>
          </Stack>
          <Stack direction="row" spacing={1.8} justifyContent="center" sx={{ mt:1.2 }}>
            <IconButton size="small" onClick={() => callApi('previous')} sx={{ color:palette.text }}><SkipPreviousIcon /></IconButton>
            <IconButton size="small" onClick={() => callApi(isPlaying ? 'pause':'play')} sx={{ bgcolor:`${palette.dominant}55`, color:palette.text, '&:hover':{ bgcolor:`${palette.dominant}77` } }}>{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}</IconButton>
            <Box sx={{ position:'relative', display:'inline-flex' }} onMouseEnter={handleNextHoverEnter} onMouseLeave={handleNextHoverLeave}>
              <IconButton ref={(r)=> { nextBtnRef.current = r; }} size="small" onClick={() => callApi('next')} sx={{ color:palette.text }}><SkipNextIcon /></IconButton>
              {showNextPreview && nextSong && (
                <Box sx={{ position:'absolute', bottom:'100%', mb:1, right:0, width:{xs:110, sm:130}, height:{xs:110, sm:130}, borderRadius:1.2, boxShadow:'0 6px 18px -6px rgba(0,0,0,0.8)', border:'1px solid rgba(255,255,255,0.25)', overflow:'hidden', backgroundImage: nextSong.ArtworkURI?`url(${nextSong.ArtworkURI})`: 'none', backgroundSize:'cover', backgroundPosition:'center', bgcolor:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-end', justifyContent:'stretch' }}>
                  <Box sx={{ width:'100%', backdropFilter:'blur(5px) brightness(0.95)', bgcolor:'rgba(0,0,0,0.45)', p:0.6 }}>
                    <Typography variant="caption" sx={{ display:'block', fontSize:{xs:'0.58rem', sm:'0.65rem'}, fontWeight:600, lineHeight:1.15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nextSong.Title || 'Next'}</Typography>
                    <Typography variant="caption" sx={{ display:'block', fontSize:{xs:'0.5rem', sm:'0.55rem'}, color:'rgba(255,255,255,0.70)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nextSong.Artists || nextSong.Artist || ''}</Typography>
                  </Box>
                </Box>
              )}
            </Box>
            <IconButton size="small" onClick={handleVolumeClick} sx={{ color:palette.text }}><VolumeUpIcon /></IconButton>
            <IconButton size="small" onClick={toggleMute} sx={{ color:palette.text }}>{volume===0? <VolumeOffIcon color="error" /> : <VolumeOffIcon />}</IconButton>
          </Stack>
          <Popover open={volumeOpen} anchorEl={volumeAnchor} onClose={handleVolumeClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Box sx={{ p:2, width:170 }}>
              <Typography variant="caption" sx={{ display:'block', textAlign:'center', mb:1 }}>Volume {volume ?? '--'}</Typography>
              <Slider value={typeof volume==='number'?volume:0} min={0} max={100} onChange={(_,v)=>updateVolume(v as number)} sx={{ '& .MuiSlider-track':{ bgcolor:palette.dominant }, '& .MuiSlider-thumb':{ bgcolor:palette.accent } }} />
            </Box>
          </Popover>
        </Box>
        <style>{`@keyframes marquee {0%{transform:translateX(100%);}100%{transform:translateX(-100%);}}`}</style>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 2 }}>
      <Box>
        {song.ArtworkURI && (
          <Box component="img" sx={{ width: 320, height: 320, objectFit: 'contain', mx: 'auto', bgcolor: 'rgba(255,255,255,0.04)', display:'block' }} src={song.ArtworkURI} alt={song.Title} />
        )}
        <Box sx={{ textAlign: 'center', p:2 }}>
          <Box sx={{ width: '100%', overflow: 'hidden', mb: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'inline-block', whiteSpace: 'nowrap', animation: song.Title.length > 28 ? 'marquee 20s linear infinite' : 'none', minWidth: '100%' }}>{song.Title}</Typography>
            <style>{`@keyframes marquee {0%{transform:translateX(100%);}100%{transform:translateX(-100%);}}`}</style>
          </Box>
          <Typography variant="subtitle1">{song.Artists}</Typography>
          <Typography variant="subtitle2" color="text.secondary" noWrap sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>{song.Album}</Typography>
          <Box sx={{ mt: 2, mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
              <Typography variant="caption" sx={{ minWidth: 32 }}>{formatTime(progress)}</Typography>
              <LinearProgress variant="determinate" value={percent} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
              <Typography variant="caption" sx={{ minWidth: 32 }}>{formatTime(duration)}</Typography>
            </Stack>
          </Box>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mt: 1 }}>
            <IconButton aria-label="skip previous" size="large" onClick={() => callApi('previous')}><SkipPreviousIcon fontSize="inherit" /></IconButton>
            <IconButton aria-label={isPlaying ? 'pause' : 'play'} size="large" onClick={() => callApi(isPlaying ? 'pause' : 'play')}>{isPlaying ? <PauseIcon fontSize="inherit" /> : <PlayArrowIcon fontSize="inherit" />}</IconButton>
            <IconButton aria-label="skip next" size="large" onClick={() => callApi('next')}><SkipNextIcon fontSize="inherit" /></IconButton>
            <IconButton aria-label="volume" size="large" onClick={handleVolumeClick}><VolumeUpIcon fontSize="inherit" /></IconButton>
            <IconButton aria-label={volume === 0 ? 'unmute' : 'mute'} size="large" onClick={toggleMute}>{volume === 0 ? <VolumeOffIcon fontSize="inherit" color="error" /> : <VolumeOffIcon fontSize="inherit" />}</IconButton>
            <Popover open={volumeOpen} anchorEl={volumeAnchor} onClose={handleVolumeClose} anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
              <Box sx={{ p: 2, width: 140 }}>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>Volume {volume ?? '--'}</Typography>
                <Slider value={typeof volume === 'number' ? volume : 0} min={0} max={100} onChange={(_, v) => updateVolume(v as number)} orientation="horizontal" />
              </Box>
            </Popover>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default NowPlaying;
