
import React, { useEffect, useState, useRef } from 'react';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
// Components
import RoomSelector from './components/RoomSelector';
import KaleidoscopeBackground from './components/KaleidoscopeBackground';
import NowPlaying from './components/NowPlaying';
// Types & utils
import { NowPlayingResponse, Song } from './types';
import { API_BASE } from './config';


// API base now centralized in config.ts
// RoomSelector moved to components/RoomSelector.tsx


// NowPlaying moved to components/NowPlaying.tsx
// (Removed duplicate JSX after NowPlaying's return statement)

// KaleidoscopeBackground moved to components/KaleidoscopeBackground.tsx

// (Pride theme removed)

export default function App() {
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [themeName, setThemeName] = useState<string>(() => {
    const storedTheme = localStorage.getItem('themeName');
    return storedTheme || 'basic black';
  });

  // Lock body scroll for Full cover theme
  useEffect(() => {
    if (themeName === 'Full cover' || themeName === 'New cover') {
      const prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => { document.documentElement.style.overflow = prevOverflow; };
    }
  }, [themeName]);

  // For now both themes identical; scaffold for future differentiation
  const theme = React.useMemo(() => createTheme({
    palette: { mode: 'dark' },
    components: {
      MuiCard: { styleOverrides: { root: themeName === 'basic black' ? {} : {} } }
    }
  }), [themeName]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
  {themeName === 'full of fun' && <KaleidoscopeBackground />}
      <Box sx={{ position:'relative', zIndex:1 }}>
  {themeName !== 'Full cover' && themeName !== 'New cover' && (
          <RoomSelector compact selectedZone={selectedZone} setSelectedZone={setSelectedZone} themeName={themeName} setThemeName={setThemeName} />
        )}
        {selectedZone && <NowPlaying zoneName={selectedZone} themeName={themeName} />}
    {(themeName === 'Full cover' || themeName === 'New cover') && (
          <Box sx={{ position:'fixed', top:0, left:0, right:0, px:2, pt:0.4, zIndex:10, display:'flex', justifyContent:'center', pointerEvents:'none' }}>
            <Box sx={{ backdropFilter:'blur(14px) brightness(0.9)', bgcolor:'rgba(0,0,0,0.35)', borderBottom:'1px solid rgba(255,255,255,0.15)', borderRadius:0, width:'100%', maxWidth:420, mx:'auto', pointerEvents:'auto', boxShadow:4, px:0.5 }}>
      <RoomSelector compact selectedZone={selectedZone} setSelectedZone={setSelectedZone} themeName={themeName} setThemeName={setThemeName} />
            </Box>
          </Box>
        )}
        
      </Box>
    </ThemeProvider>
  );
}
