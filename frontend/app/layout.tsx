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