import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import './globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZeroPass - Firewall Simulator',
  description: 'A sophisticated firewall rule simulator and testing platform',
  
  // Favicon and icons configuration
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon.ico' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { rel: 'mask-icon', url: '/favicon/safari-pinned-tab.svg', color: '#3b82f6' },
    ],
  },
  
  // Additional metadata for better SEO and PWA support
  keywords: 'firewall, simulator, security, rules, testing, zeropass',
  authors: [{ name: 'ZeroPass Team' }],
  creator: 'ZeroPass',
  publisher: 'ZeroPass',
  
  // Theme configuration
  themeColor: '#3b82f6',
  colorScheme: 'light',
  
  // Viewport
  viewport: 'width=device-width, initial-scale=1',
  
  // Open Graph
  openGraph: {
    title: 'ZeroPass - Firewall Simulator',
    description: 'A sophisticated firewall rule simulator and testing platform',
    type: 'website',
    locale: 'en_US',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'ZeroPass - Firewall Simulator',
    description: 'A sophisticated firewall rule simulator and testing platform',
  },
  
  // PWA manifest
  manifest: '/favicon/site.webmanifest',
  
  // Additional tags
  other: {
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/favicon/browserconfig.xml',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Additional favicon fallbacks */}
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
} 