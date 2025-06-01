import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZeroPass Firewall Simulator',
  description: 'Enterprise API Gateway Firewall Rule Simulator for testing and validating API security policies',
  keywords: ['firewall', 'API gateway', 'security', 'simulator', 'enterprise'],
  authors: [{ name: 'ZeroPass Team' }],
  viewport: 'width=device-width, initial-scale=1',
  
  // Favicon Configuration
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon/safari-pinned-tab.svg',
        color: '#2563eb',
      },
    ],
  },
  
  // PWA Manifest
  manifest: '/favicon/site.webmanifest',
  
  // Theme Colors
  themeColor: '#2563eb',
  
  // Apple Web App Configuration
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZeroPass',
  },
  
  // Microsoft Tile Configuration
  other: {
    'msapplication-TileColor': '#2563eb',
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
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 