import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock API_BASE to a simple predictable value
jest.mock('./config', () => ({ API_BASE: 'http://test/api/v1' }));

// Silence config warnings in tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  (console.warn as jest.Mock).mockRestore();
});

interface FetchCall { url: string; options?: RequestInit }

const zones = [
  { ZoneID: 1, Name: 'Living Room', Power: true },
  { ZoneID: 2, Name: 'Kitchen', Power: false }
];

const nowPlayingPayload = {
  Status: 2, // playing
  CurrProgress: 42,
  CurrSong: {
    Title: 'Test Song',
    Artists: 'Test Artist',
    Album: 'Test Album',
    Duration: 200,
    ArtworkURI: 'http://example/art.jpg'
  }
};

const zoneStatePayload = { Volume: 35 };

beforeEach(() => {
  // Reset localStorage between tests
  window.localStorage.clear();
  // Mock fetch
  (global.fetch as any) = jest.fn(async (input: RequestInfo, options?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.endsWith('/api/v1/zones')) {
      return { ok: true, status: 200, json: async () => zones } as any;
    }
    if (url.includes('/nowplaying')) {
      return { ok: true, status: 200, json: async () => nowPlayingPayload } as any;
    }
    // Zone state for volume
    const zoneMatch = url.match(/\/api\/v1\/zones\/([^/?]+)/);
    if (zoneMatch && !url.includes('/player/') && !url.includes('/group/')) {
      return { ok: true, status: 200, json: async () => zoneStatePayload } as any;
    }
    // Player / control endpoints
    if (url.includes('/player/')) {
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }
    return { ok: false, status: 404, json: async () => ({}) } as any;
  });
});

test('loads zones and shows them in the selector', async () => {
  render(<App />);
  const select = await screen.findByRole('combobox');
  // MUI needs mouseDown on the element to open
  await userEvent.click(select);
  const listbox = await screen.findByRole('listbox');
  expect(within(listbox).getByText('Living Room')).toBeInTheDocument();
  expect(within(listbox).getByText('Kitchen')).toBeInTheDocument();
});

test('selecting a zone renders now playing song title', async () => {
  render(<App />);
  const select = await screen.findByRole('combobox');
  await userEvent.click(select);
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(within(listbox).getByText('Living Room'));
  await waitFor(() => expect(screen.getByText('Test Song')).toBeInTheDocument());
  expect(screen.getByText(/Test Artist/)).toBeInTheDocument();
});

