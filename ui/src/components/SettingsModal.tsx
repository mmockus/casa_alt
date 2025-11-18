import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Divider, FormControlLabel, Checkbox, Alert, Box } from '@mui/material';
import { ThemeConfig } from '../themeConfig';
import { CANVAS_DEFAULT_VIDEO, CANVAS_API } from '../config';
import { useConfig } from '../hooks/useConfig';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  setTheme: (t: ThemeConfig) => void;
}

// Shape of persisted local settings (extend here as new options are added)
interface LocalSettings {
  showSpotifyUris: boolean;
  selectedZone?: string;
  themeName?: string;
  defaultCanvasVideo?: string;
  // future: kaleidoscopeEnabled?: boolean; diffusedBackground?: boolean; refreshMs?: number; etc.
  [key: string]: any; // allow forward-compatible keys
}

const LS_KEY = 'localSettings';

const defaultSettings: LocalSettings = { showSpotifyUris: false, defaultCanvasVideo: CANVAS_DEFAULT_VIDEO || '' };

const loadSettings = (): LocalSettings => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
};

const saveSettings = (s: LocalSettings) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore quota errors */ }
};

// Settings modal with persistent localSettings object
const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, theme }) => {
  const [settings, setSettings] = useState<LocalSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState<Record<string, any>>({});
  const config = useConfig();

  // Load once when modal first opens
  useEffect(() => {
    if (open && !loaded) {
      const ls = loadSettings();
      setSettings(ls);
      setLoaded(true);
    }
  }, [open, loaded]);

  // Refresh snapshot every 1s while open to reflect external updates (e.g., theme or zone changes)
  useEffect(() => {
    if (!open) return;
    const pull = () => {
      try {
        const raw = localStorage.getItem(LS_KEY) || '{}';
        const parsed = JSON.parse(raw);
        setLiveSnapshot(parsed);
      } catch { /* ignore */ }
    };
    pull();
    const id = setInterval(pull, 1000);
    return () => clearInterval(id);
  }, [open]);

  // Persist whenever settings change (after initial load)
  useEffect(() => {
    if (loaded) saveSettings(settings);
  }, [settings, loaded]);

  const toggle = useCallback((key: keyof LocalSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Current theme: <strong>{theme.name}</strong>
          </Typography>
          <Divider flexItem />
          <FormControlLabel
            control={<Checkbox size="small" checked={settings.showSpotifyUris} onChange={() => toggle('showSpotifyUris')} />}
            label="Spotify URIs"
          />
          <Alert severity="info" variant="outlined" sx={{ fontSize: '0.7rem', py: 0.5 }}>
            Enable to surface raw Spotify track / album / artist / playlist URIs (feature wiring pending).
          </Alert>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Canvas API</Typography>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.66rem', lineHeight: 1.3, bgcolor: 'background.default', p:0.6, borderRadius:1, border: '1px solid rgba(255,255,255,0.06)' }}>
              {config?.canvasApi ? config.canvasApi : '(unset)'}
            </Box>
          </Box>
          <Divider flexItem />
          <Typography variant="subtitle2">Stored Local Settings</Typography>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.65rem', lineHeight: 1.4, bgcolor: 'background.default', p:1, borderRadius:1, maxHeight:200, overflow:'auto', border: theme ? '1px solid rgba(255,255,255,0.08)' : undefined }}>
            {(() => {
              const keys = Array.from(new Set([...Object.keys(defaultSettings), ...Object.keys(liveSnapshot)])).sort();
              if (keys.length === 0) return <Typography variant="caption" sx={{ opacity:0.6 }}>No settings stored.</Typography>;
              return keys.map(k => {
                const rawVal = (k in liveSnapshot) ? liveSnapshot[k] : (defaultSettings as any)[k];
                const displayVal = (rawVal === '' || rawVal == null) ? '(unset)' : (typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal));
                return <div key={k}><strong>{k}</strong>: {displayVal}</div>;
              });
            })()}
          </Box>
          <Divider flexItem />
          <Typography variant="caption" color="text.secondary">
            More preferences (kaleidoscope, diffused background intensity, refresh rate, volume step size) coming soon.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsModal;
