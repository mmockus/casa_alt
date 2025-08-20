import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface CanvasVideoProps {
  src?: string; // explicit override
  topPct?: string;
  anchorLeftPct?: string;
  leftPx?: number; // center x position
  widthPx?: number; // explicit width
  verticalCenter?: boolean;
  debug?: boolean;
  defaultSrc?: string; // fallback provided from env/localSettings
  diffused?: boolean;
  overlayText?: string | null;
}

// Simplified CanvasVideo: always uses provided defaultSrc (or src) and no longer queries any Canvas API.
const CanvasVideo: React.FC<CanvasVideoProps> = ({
  src,
  topPct = '12%',
  anchorLeftPct = '75%',
  leftPx,
  widthPx,
  verticalCenter,
  debug = false,
  defaultSrc,
  diffused,
  overlayText
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const effectiveSrc = src || defaultSrc || '';
  useEffect(() => { const v = videoRef.current; if (!v) return; v.play().catch(()=>{}); }, [effectiveSrc]);
  const positionStyles = leftPx != null ? {
    top: verticalCenter ? '50%' : topPct,
    left: leftPx,
    transform: verticalCenter ? 'translate(-50%, -50%)' : 'translateX(-50%)',
    position: verticalCenter ? 'fixed' as const : 'absolute' as const
  } : {
    top: topPct,
    left: anchorLeftPct,
    transform: 'translateX(-50%)',
    position: verticalCenter ? 'fixed' as const : 'absolute' as const
  };
  // Compute height from width (9:16) and clamp to viewport height just in case
  let derivedHeight: number | undefined;
  if (widthPx != null) {
    derivedHeight = widthPx * (16/9);
    const vh = typeof window !== 'undefined' ? window.innerHeight : undefined;
    if (vh && derivedHeight > vh * 0.95) {
      derivedHeight = vh * 0.95;
      widthPx = derivedHeight * (9/16);
    }
  }
  const widthStyles = widthPx != null ? {
    width: widthPx,
    height: derivedHeight,
    maxWidth: 'none'
  } : {
    width: { xs: '26vw', sm: '18vw', md: 260 },
    maxWidth: 300
  };
  return (
    <Box sx={{ ...positionStyles, ...widthStyles, aspectRatio:'9/16', zIndex:2, pointerEvents:'none', borderRadius:2, overflow:'hidden', boxShadow:'0 8px 30px -6px rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.18)', position: positionStyles.position }}>
      <Box component="video" ref={videoRef} key={effectiveSrc} autoPlay muted loop playsInline preload="auto" src={effectiveSrc} sx={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'opacity .4s ease', filter: diffused ? 'blur(6px) brightness(0.6) saturate(0.9)' : 'none', opacity: diffused ? 0.8 : 1 }} />
      {diffused && overlayText && (
        <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <Box sx={{ bgcolor:'rgba(0,0,0,0.5)', color:'#fff', px:2, py:0.6, borderRadius:1, fontWeight:700, letterSpacing:'.06em' }}>{overlayText}</Box>
        </Box>
      )}
      {debug && (
        <Box sx={{ position:'absolute', bottom:2, left:2, right:2, fontFamily:'monospace', fontSize:10, lineHeight:1.2, bgcolor:'rgba(0,0,0,0.55)', color:'#8f8', p:0.6, borderRadius:1, pointerEvents:'none', maxHeight:'50%', overflow:'auto' }}>
          <div>src: {effectiveSrc ? effectiveSrc.slice(0,60) : '(none)'} </div>
        </Box>
      )}
    </Box>
  );
};

export default CanvasVideo;
