// Theme names used in the app
export type ThemeName = 'Basic Black' | 'Funcicle' | 'full of fun' | 'Full cover' | 'Robust' | 'immersive art';
export interface Zone {
  ZoneID: number;
  Name: string;
  Power: boolean;
  // Optional dynamic flags from API
  [key: string]: any;
}

export interface Song {
  Title: string;
  Artists?: string;
  Artist?: string; // some APIs may use singular
  Album?: string;
  Duration?: number;
  ArtworkURI?: string;
  [key: string]: any;
}

export interface NowPlayingResponse {
  CurrSong?: Song;
  CurrProgress?: number;
  Status?: number; // 2=playing,1=paused, etc.
  NextSong?: Song;
  Queue?: Song[];
  PlayQueue?: Song[];
  [key: string]: any;
}
