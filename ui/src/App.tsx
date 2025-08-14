import React, { useEffect, useState } from 'react';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
// Components
import RoomSelector from './components/RoomSelector';
import NowPlaying from './components/NowPlaying';
// Types & utils
import { themes, ThemeConfig } from './themeConfig';


// API base now centralized in config.ts
// RoomSelector moved to components/RoomSelector.tsx


// NowPlaying moved to components/NowPlaying.tsx
// (Removed duplicate JSX after NowPlaying's return statement)

// KaleidoscopeBackground moved to components/KaleidoscopeBackground.tsx

// (Pride theme removed)

export default function App() {
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const storedTheme = localStorage.getItem('themeName');
    const found = themes.find(t => t.name === storedTheme);
    return found || themes[1]; // Default to Robust
  });

  // Persist theme selection
  useEffect(() => { localStorage.setItem('themeName', theme.name); }, [theme]);

  // For now both themes identical; scaffold for future differentiation
  const muiTheme = React.useMemo(() => createTheme({ palette: { mode: 'dark' } }), []);

  return (
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <Box sx={{ position: 'fixed', top: 20, left: 0, width: '100%', zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <Box sx={{ pointerEvents: 'auto', borderRadius: 24, boxShadow: 4, bgcolor: 'background.paper', height: 24, minWidth: 320, maxWidth: 420, mx: 'auto', display: 'flex', alignItems: 'center', py: 0, px: 2.5 }}>
        <RoomSelector compact selectedZone={selectedZone} setSelectedZone={setSelectedZone} theme={theme} setTheme={setTheme} />
      </Box>
    </Box>
    <Box sx={{ position: 'relative', zIndex: 1 }}>
      {selectedZone && <NowPlaying zoneName={selectedZone} theme={theme} />}
    </Box>
  </ThemeProvider>
  );
}
