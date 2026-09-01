import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Xiruo · 私人漫画与动漫馆藏',
  description: '统一浏览、阅读和观看私人内容来源的轻量 Web 应用。',
  openGraph: {
    title: 'Xiruo · 私人漫画与动漫馆藏',
    description: '统一浏览、阅读和观看私人内容来源的轻量 Web 应用。',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Xiruo 私人漫画与动漫馆藏' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xiruo · 私人漫画与动漫馆藏',
    description: '统一浏览、阅读和观看私人内容来源的轻量 Web 应用。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" className="dark"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>;
}
