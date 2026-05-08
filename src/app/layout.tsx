import type { Metadata } from 'next'
import { Inter, Noto_Sans_Bengali } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/shared/providers'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  preload: true,
})

const notoBengali = Noto_Sans_Bengali({
  variable: '--font-noto-bengali',
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['sans-serif'],
  preload: true,
})

export const metadata: Metadata = {
  title: 'DigiHealth CMS — ডিজিটাল স্বাস্থ্য ব্যবস্থাপনা',
  description: 'বাংলাদেশের অগ্রণী ডিজিটাল ক্লিনিক ম্যানেজমেন্ট সিস্টেম',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${inter.variable} ${notoBengali.variable} h-full`}>
      <body className="h-full antialiased bg-slate-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
