import type { MetadataRoute } from 'next'

/**
 * Generates the web manifest configuration for the PWA using the brand logo.
 *
 * @returns Next.js manifest metadata object.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Amo Fit — Gerenciamento de Estoque',
    short_name: 'AmôFit',
    description: 'Se ame, se mova. Controle de estoque e vendas da Amo Fit.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#7c3aed',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/logoamofit.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/logoamofit.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/logoamofit.jpeg',
        sizes: '192x192 512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  }
}
