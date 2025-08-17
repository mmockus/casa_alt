import React from 'react';
import { Box } from '@mui/material';

interface CanvasVideoProps {
  src?: string;
  // Legacy percentage-based positioning
  topPct?: string;
  anchorLeftPct?: string;
  // New pixel-based positioning & sizing
  leftPx?: number;        // center x position in pixels
  widthPx?: number;       // explicit width in pixels
  verticalCenter?: boolean; // if true centers vertically
}

// Standalone looping canvas-style video (Spotify Canvas mimic)
const DEFAULT_SRC = 'https://canvaz.scdn.co/upload/artist/4q3ewBCX7sLwd24euuV69X/video/f7338b30e2da48349b45b80430c29076.cnvs.mp4#t=0.001';

const CanvasVideo: React.FC<CanvasVideoProps> = ({
  src = DEFAULT_SRC,
  topPct = '12%',
  anchorLeftPct = '75%',
  leftPx,
  widthPx,
  verticalCenter
}) => {
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
    <Box
      sx={{
        ...positionStyles,
        ...widthStyles,
        aspectRatio: '9/16',
  zIndex: 5, // keep well below NowPlaying overlays (>=50) and root (100)
  pointerEvents: 'none',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 8px 30px -6px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.18)'
      }}
    >
      <Box
        component="video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src={src}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </Box>
  );
};

export default CanvasVideo;
