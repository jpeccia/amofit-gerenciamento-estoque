import type { MetadataRoute } from 'next'

/**
 * Generates the web manifest configuration for the PWA.
 *
 * @returns Next.js manifest metadata object.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Amo Fit — Estoque e Vendas',
    short_name: 'Amo Fit',
    description: 'Se ame, se mova. Controle de estoque e vendas da Amo Fit.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9fb',
    theme_color: '#34a06a',
    icons: [
      {
        src: '/logoamofit.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
      {
        src: '/logoamofit.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
    ],
  }
}
