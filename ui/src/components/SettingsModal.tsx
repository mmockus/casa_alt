import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Divider, FormControlLabel, Checkbox, Alert } from '@mui/material';
import { ThemeConfig } from '../themeConfig';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  setTheme: (t: ThemeConfig) => void;
}

// Shape of persisted local settings (extend here as new options are added)
interface LocalSettings {
  showSpotifyUris: boolean;
  // future: kaleidoscopeEnabled?: boolean; diffusedBackground?: boolean; refreshMs?: number; etc.
}

const LS_KEY = 'localSettings';

const defaultSettings: LocalSettings = { showSpotifyUris: false };

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

  // Load once when modal first opens
  useEffect(() => {
    if (open && !loaded) {
      setSettings(loadSettings());
      setLoaded(true);
    }
  }, [open, loaded]);

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
