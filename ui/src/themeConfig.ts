export type ThemeConfig = {
  name: string;
  Diffused_Background: boolean;
  Kaleidoscope_Background: boolean;
  Canvas?: boolean; // show Spotify Canvas-style vertical looping video
};

export const themes: ThemeConfig[] = [
  {
    name: 'Basic Black',
    Diffused_Background: false,
    Kaleidoscope_Background: false,
    Canvas: false,
  },
  {
    name: 'Robust',
    Diffused_Background: true,
    Kaleidoscope_Background: false,
    Canvas: false,
  },
  {
    name: 'Live', // clone of Robust for safe development/testing
    Diffused_Background: true,
    Kaleidoscope_Background: false,
    Canvas: true, // enable canvas experiment here
  },
  {
    name: 'Kaleidoscope',
    Diffused_Background: false,
    Kaleidoscope_Background: true,
    Canvas: false,
  },
];
