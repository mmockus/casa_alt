export type ThemeConfig = {
  name: string;
  Diffused_Background: boolean;
  Kaleidoscope_Background: boolean;
};

export const themes: ThemeConfig[] = [
  {
    name: 'Basic Black',
    Diffused_Background: false,
    Kaleidoscope_Background: false,
  },
  {
    name: 'Robust',
    Diffused_Background: true,
    Kaleidoscope_Background: false,
  },
  {
    name: 'Kaleidoscope',
    Diffused_Background: false,
    Kaleidoscope_Background: true,
  },
];
