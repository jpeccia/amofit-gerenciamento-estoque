import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Poppins } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Amo Fit — Estoque e Vendas',
  description: 'Se ame, se mova. Controle de estoque e vendas da Amo Fit.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/logoamofit.jpeg', type: 'image/jpeg' },
    ],
    shortcut: '/logoamofit.jpeg',
    apple: '/logoamofit.jpeg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#34a06a' },
    { media: '(prefers-color-scheme: dark)', color: '#1b2620' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <PwaRegister />
        {children}
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
