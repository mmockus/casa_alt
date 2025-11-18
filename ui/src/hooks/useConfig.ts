import { useState, useEffect } from 'react';
import { CANVAS_API_PROMISE, CANVAS_DEFAULT_VIDEO_PROMISE } from '../config';

interface Config {
  canvasApi: string;
  canvasDefaultVideo: string;
}

export const useConfig = (): Config | null => {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const [canvasApi, canvasDefaultVideo] = await Promise.all([
        CANVAS_API_PROMISE,
        CANVAS_DEFAULT_VIDEO_PROMISE,
      ]);
      setConfig({ canvasApi, canvasDefaultVideo });
    };
    loadConfig();
  }, []);

  return config;
};