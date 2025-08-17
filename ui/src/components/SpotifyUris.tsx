import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

export interface SpotifyUriData {
  track?: string;
  artist?: string;
  album?: string;
  playlist?: string;
}

interface Props { data: SpotifyUriData; }

// Automatically chooses contrasting text color based on backdrop-filter area using a simple luminance heuristic on provided fallback colors (optional future enhancement)
const SpotifyUris: React.FC<Props> = ({ data }) => {
  // Order & labels
  const entries: Array<{ label: string; value?: string }> = [
    { label: 'Track', value: data.track },
    { label: 'Artist', value: data.artist },
    { label: 'Album', value: data.album },
    { label: 'Playlist', value: data.playlist },
  ];
  return (
    <Box
      sx={{
        position: 'fixed',
        left: { xs: 8, sm: 24 },
        top: '33vh',
        zIndex: 3000,
        backdropFilter: 'blur(14px) brightness(0.85) saturate(1.2)',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.40), rgba(0,0,0,0.10))',
        border: '1px solid rgba(255,255,255,0.20)',
        borderRadius: 2,
        px: 2.2,
        py: 1.4,
        maxWidth: { xs: '72%', sm: 380 },
        boxShadow: '0 4px 22px -6px rgba(0,0,0,0.55)',
        color: '#fff',
        fontSize: '0.7rem',
        pointerEvents: 'none',
      }}
    >
      <Typography variant="caption" sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '.12em', opacity: 0.65, display: 'block', mb: 0.6 }}>Spotify URIs</Typography>
      <Stack spacing={0.4}>
        {entries.map(e => (
          <Box key={e.label} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0.8, opacity: e.value ? 0.92 : 0.35 }}>
            <Typography component="span" sx={{ minWidth: 56, fontSize: '0.62rem', fontWeight: 600, textAlign: 'right', color: '#f5f5f5' }}>{e.label}:</Typography>
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.60rem', wordBreak: 'break-all', lineHeight: 1.3 }}>
              {e.value || '—'}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default SpotifyUris;
