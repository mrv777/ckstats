'use client'

import './globals.css'
import { Inter } from 'next/font/google'
import Header from '../components/Header'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <html lang="en">
      <QueryClientProvider client={queryClient}>
        <body className={inter.className}>
          <Header />
          {children}
        </body>
      </QueryClientProvider>
    </html>
  )
}