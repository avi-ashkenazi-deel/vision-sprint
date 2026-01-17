import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { Navigation } from '@/components/Navigation'
import './globals.css'

export const metadata: Metadata = {
  title: 'VisionSprint - Hackathon Project Hub',
  description: 'Submit and vote on hackathon project ideas for our vision sprint',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-mesh min-h-screen">
        <Providers>
          <Navigation />
          <main className="pt-20">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
