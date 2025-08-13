import React, { useEffect, useState } from 'react';
import PlaybackControls from './PlaybackControls';
import { Box, CircularProgress, Typography, Stack, FormControl, Select, MenuItem, IconButton, Popover, Divider, List, ListItemButton, Checkbox, ListItemText } from '@mui/material';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import MenuIcon from '@mui/icons-material/Menu';
import { Zone } from '../types';
import { API_BASE } from '../config';

import { ThemeName } from '../types';

interface Props {
  selectedZone: string;
  setSelectedZone: (z: string) => void;
  themeName: ThemeName;
  setThemeName: (t: ThemeName) => void;
  compact?: boolean;
}

export const RoomSelector: React.FC<Props> = ({ selectedZone, setSelectedZone, themeName, setThemeName, compact }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupAnchor, setGroupAnchor] = useState<HTMLElement | null>(null);
  const groupOpen = Boolean(groupAnchor);
  const [groupLoading, setGroupLoading] = useState(false);
  const [themeAnchor, setThemeAnchor] = useState<HTMLElement | null>(null);
  const themeOpen = Boolean(themeAnchor);

  // On first mount, restore selectedZone and themeName from localStorage only if not already set
  useEffect(() => {
    // On initial mount, set selectedZone and themeName from localStorage if present
    const storedZone = localStorage.getItem('selectedZone');
    if (storedZone) setSelectedZone(storedZone);
    const storedTheme = localStorage.getItem('themeName');
    if (storedTheme === 'Basic Black' || storedTheme === 'Funcicle' || storedTheme === 'full of fun' || storedTheme === 'Full cover' || storedTheme === 'New cover' || storedTheme === 'immersive art') {
      setThemeName(storedTheme);
    }
    // Only run once
    // eslint-disable-next-line
  }, []);

  // Store selectedZone to localStorage when it changes
  useEffect(() => {
    if (selectedZone) {
      localStorage.setItem('selectedZone', selectedZone);
    }
  }, [selectedZone]);

  // Store themeName to localStorage when it changes
  useEffect(() => {
    if (themeName) {
      localStorage.setItem('themeName', themeName);
    }
  }, [themeName]);

  // Persist selectedZone to localStorage when it changes
  useEffect(() => {
    if (selectedZone) {
      localStorage.setItem('selectedZone', selectedZone);
    }
  }, [selectedZone]);

  // Persist themeName to localStorage when it changes
  useEffect(() => {
    if (themeName) {
      localStorage.setItem('themeName', themeName);
    }
  }, [themeName]);

  // When selectedZone changes, persist to localStorage only if different
  useEffect(() => {
    if (selectedZone && localStorage.getItem('selectedZone') !== selectedZone) {
      localStorage.setItem('selectedZone', selectedZone);
    }
  }, [selectedZone]);

  // When themeName changes, persist to localStorage only if different
  useEffect(() => {
    if (themeName && localStorage.getItem('themeName') !== themeName) {
      localStorage.setItem('themeName', themeName);
    }
  }, [themeName]);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`${API_BASE}/zones`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setZones(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally { setLoading(false); }
    })();
  }, []);

  const mini = compact;
  return (
    <Box sx={{ p: mini ? 0.5 : 4, pt: mini ? 0.3 : 4, maxWidth: 380, mx: 'auto' }}>
      {loading ? <CircularProgress /> : error ? <Typography color="error">{error}</Typography> : (
        <Stack direction="row" spacing={mini ? 0.6 : 1} alignItems="center" justifyContent="center" sx={{ mx: 'auto' }}>
          <FormControl size="small" sx={{ mt: 0, width: mini ? '42%' : '50%' }}>
            <Select value={selectedZone || ''} displayEmpty onChange={e => setSelectedZone(e.target.value as string)} size="small" sx={{ fontSize: mini ? '0.65rem' : undefined, '.MuiSelect-select': { py: mini ? 0.4 : 0.8, px: mini ? 1 : 1.4 } }}>
              {!selectedZone && (
                <MenuItem value="" disabled>
                  <Typography component="span" sx={{ color: 'grey.500', fontStyle: 'italic', fontSize: mini ? '0.65rem' : '0.8rem' }}>
                    Select a room
                  </Typography>
                </MenuItem>
              )}
              {zones.map(zone => (
                <MenuItem key={zone.ZoneID} value={zone.Name}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: zone.Power ? 'green' : 'grey.400', display: 'inline-block', mr: 1 }} />
                    <Typography component="span" sx={{ fontSize: mini ? '0.65rem' : '0.8rem' }}>{zone.Name}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedZone && (
            <>
              <IconButton size={mini ? 'small' : 'medium'} aria-label="group rooms" onClick={async e => {
                setGroupAnchor(e.currentTarget); setGroupLoading(true);
                try { const res = await fetch(`${API_BASE}/zones`); if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setZones(data); } } catch { /* ignore */ } finally { setGroupLoading(false); }
              }} sx={{ p: mini ? 0.4 : 1 }}><GroupWorkIcon fontSize={mini ? 'small' : 'medium'} /></IconButton>
              <IconButton size={mini ? 'small' : 'medium'} aria-label="themes" onClick={e => setThemeAnchor(e.currentTarget)} sx={{ p: mini ? 0.4 : 1 }}><MenuIcon fontSize={mini ? 'small' : 'medium'} /></IconButton>
            </>
          )}
          <Popover open={groupOpen} anchorEl={groupAnchor} onClose={() => setGroupAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <Box sx={{ p: 1, minWidth: 240, maxHeight: 340 }}>
              <Typography variant="subtitle2" sx={{ px:1, py:0.5 }}>Share from {selectedZone}</Typography>
              <Divider sx={{ mb: 1 }} />
              {groupLoading && <Typography variant="caption" sx={{ px:1 }}>Loading...</Typography>}
              <List dense disablePadding>
                {zones.filter(z=> z.Name !== selectedZone).filter(z=> !(z.hidden || z.Hidden)).map(z=> {
                  const shared = z.Shared === true || z.shared === true;
                  const handleClick = () => {
                    if (shared) {
                      fetch(`${API_BASE}/zones/${encodeURIComponent(z.Name)}?Power=off`).then(()=> setZones(prev => prev.map(p => p.ZoneID === z.ZoneID ? ({...p, Shared:false, shared:false}) : p))).catch(()=>{});
                    } else {
                      fetch(`${API_BASE}/zones/${encodeURIComponent(selectedZone)}/group/${encodeURIComponent(z.Name)}`).then(()=> setZones(prev => prev.map(p => p.ZoneID === z.ZoneID ? ({...p, Shared:true}) : p))).catch(()=>{});
                    }
                  };
                  return (
                    <ListItemButton key={z.ZoneID} onClick={handleClick} sx={{ py:0.5 }}>
                      <Checkbox size="small" edge="start" checked={shared} tabIndex={-1} disableRipple />
                      <ListItemText primary={z.Name} secondary={shared ? 'Shared' : undefined} />
                    </ListItemButton>
                  );
                })}
                {zones.filter(z=> z.Name !== selectedZone && !(z.hidden || z.Hidden)).length === 0 && (<Typography variant="caption" sx={{ px:1 }}>No visible rooms</Typography>)}
              </List>
              <Typography variant="caption" color="text.secondary" sx={{ mt:1, display:'block' }}>Tap a room to share.</Typography>
            </Box>
          </Popover>
          <Popover open={themeOpen} anchorEl={themeAnchor} onClose={() => setThemeAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <Box sx={{ p:1, minWidth: 180 }}>
              <Typography variant="subtitle2" sx={{ px:1, py:0.5 }}>Theme</Typography>
              <Divider sx={{ mb:1 }} />
              <List dense disablePadding>
                {['Basic Black','Funcicle','full of fun','Full cover','New cover'].map(name => (
                  <ListItemButton key={name} onClick={() => { setThemeName(name as import('../types').ThemeName); setThemeAnchor(null);} } sx={{ py:0.5 }}>
                    <Checkbox size="small" edge="start" tabIndex={-1} disableRipple checked={themeName === name} />
                    <ListItemText primary={name} />
                  </ListItemButton>
                ))}
              </List>
              <Typography variant="caption" color="text.secondary" sx={{ mt:1, mb:1, display:'block' }}>Full of fun = animated background.</Typography>
            </Box>
          </Popover>
        </Stack>
      )}
    </Box>
  );
};

export default RoomSelector;
