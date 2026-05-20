import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FitGenerations Smart TrAIner',
    short_name: 'FGST',
    description: 'AI training companion for every generation - Erasmus+ Sport 2026',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fafaf7',
    theme_color: '#16a34a',
    lang: 'en',
    categories: ['health', 'fitness', 'lifestyle'],
    icons: [
      { src: '/icon', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon1', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
