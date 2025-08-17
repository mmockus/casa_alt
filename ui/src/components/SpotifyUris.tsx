import React, { useState, useCallback } from 'react';
import { Box, Typography, Stack } from '@mui/material';

export interface SpotifyUriData {
  track?: string;
  artist?: string;
  album?: string;
  playlist?: string;
  canvas_url?: string | null;
  canvas_not_found?: string | boolean; // boolean from API, string if diagnostic text provided
}

interface Props { data: SpotifyUriData; }

// Automatically chooses contrasting text color based on backdrop-filter area using a simple luminance heuristic on provided fallback colors (optional future enhancement)
const SpotifyUris: React.FC<Props> = ({ data }) => {
  // Order & labels
  const entries: Array<{ label: string; value?: string | boolean }> = [
    { label: 'Track', value: data.track },
    { label: 'Artist', value: data.artist },
    { label: 'Album', value: data.album },
    { label: 'Playlist', value: data.playlist },
    { label: 'Canvas URL', value: data.canvas_url || undefined },
    { label: 'Canvas Missing', value: typeof data.canvas_not_found === 'boolean' ? (data.canvas_not_found ? 'true' : 'false') : data.canvas_not_found },
  ];
  const [copiedKey, setCopiedKey] = useState<string|null>(null);

  const copyToClipboard = useCallback((value: string | boolean | undefined, key:string) => (e: React.MouseEvent) => {
    if (!value) return;
    e.preventDefault();
    const str = typeof value === 'string' ? value : String(value);
    // Attempt async clipboard; fallback if unavailable
    const doSet = () => { setCopiedKey(key); setTimeout(()=>setCopiedKey(p => p===key?null:p), 1500); };
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(str).then(doSet).catch(()=>{
        try {
          const ta = document.createElement('textarea');
          ta.value = str; ta.style.position='fixed'; ta.style.left='-9999px';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); doSet();
        } catch {/* ignore */}
      });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = str; ta.style.position='fixed'; ta.style.left='-9999px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); doSet();
      } catch {/* ignore */}
    }
  }, []);

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
        // enable interaction for copy
        userSelect: 'text',
      }}
    >
      <Typography variant="caption" sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '.12em', opacity: 0.65, display: 'block', mb: 0.6 }}>Spotify URIs</Typography>
      <Stack spacing={0.4}>
        {entries.map(e => {
          const active = copiedKey === e.label;
          return (
            <Box
              key={e.label}
              onContextMenu={copyToClipboard(e.value, e.label)}
              title={e.value ? 'Right click to copy' : 'No value'}
              sx={{
                display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0.8,
                opacity: e.value ? 0.92 : 0.35,
                cursor: e.value ? 'copy' : 'default',
                border: active ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                borderRadius: 1,
                px: active ? 0.4 : 0,
                transition: 'border-color 0.25s'
              }}
            >
              <Typography component="span" sx={{ minWidth: 94, fontSize: '0.62rem', fontWeight: 600, textAlign: 'right', color: '#f5f5f5' }}>{e.label}:</Typography>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.60rem', wordBreak: 'break-all', lineHeight: 1.3 }}>
                {active && e.value ? '[copied]' : (e.value || '—')}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default SpotifyUris;
