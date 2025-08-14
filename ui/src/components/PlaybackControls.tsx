import React from 'react';
import { IconButton, Stack, Popover, Typography, Slider, Box } from '@mui/material';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

interface PlaybackControlsProps {
  isPlaying: boolean;
  volume: number | null;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeClick: (e: React.MouseEvent<HTMLElement>) => void;
  onMute: () => void;
  volumeOpen: boolean;
  volumeAnchor: HTMLElement | null;
  onVolumeClose: () => void;
  onVolumeChange: (v: number) => void;
  palette?: { dominant: string; accent: string; text: string };
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  volume,
  onPlayPause,
  onNext,
  onPrevious,
  onVolumeClick,
  onMute,
  volumeOpen,
  volumeAnchor,
  onVolumeClose,
  onVolumeChange,
  palette = { dominant: '#444', accent: '#888', text: '#fff' },
}) => (
  <Stack direction="row" spacing={1.2} justifyContent="center" alignItems="center" sx={{ mt: 1 }}>
    <IconButton size="small" onClick={onPrevious} sx={{ color: palette.text, p: 0.5 }}>
      <SkipPreviousIcon fontSize="small" />
    </IconButton>
    <IconButton size="small" onClick={onPlayPause} sx={{ p: 0.6, bgcolor: `${palette.dominant}55`, color: palette.text, '&:hover': { bgcolor: `${palette.dominant}88` } }}>
      {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
    </IconButton>
    <IconButton size="small" onClick={onNext} sx={{ color: palette.text, p: 0.5 }}>
      <SkipNextIcon fontSize="small" />
    </IconButton>
    <IconButton size="small" onClick={onVolumeClick} sx={{ color: palette.text, p: 0.5 }}>
      <VolumeUpIcon fontSize="small" />
    </IconButton>
    <IconButton size="small" onClick={onMute} sx={{ color: palette.text, p: 0.5 }}>
      {volume === 0 ? <VolumeOffIcon fontSize="small" color="error" /> : <VolumeOffIcon fontSize="small" />}
    </IconButton>
    <Popover open={volumeOpen} anchorEl={volumeAnchor} onClose={onVolumeClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Box sx={{ p: 1.2, width: 140 }}>
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mb: 0.5, fontSize: '.6rem' }}>Vol {volume ?? '--'}</Typography>
        <Slider value={typeof volume === 'number' ? volume : 0} min={0} max={100} onChange={(_, v) => onVolumeChange(v as number)} sx={{ '& .MuiSlider-track': { bgcolor: palette.dominant, height: 4 }, '& .MuiSlider-rail': { height: 4 }, '& .MuiSlider-thumb': { bgcolor: palette.accent, width: 14, height: 14 } }} />
      </Box>
    </Popover>
  </Stack>
);

export default PlaybackControls;
