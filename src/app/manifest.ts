import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Memoria Viva Pico Truncado',
    short_name: 'Memoria Viva',
    description: 'Archivo Histórico Comunitario de Pico Truncado',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdfbf7',
    theme_color: '#8b5a2b',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
