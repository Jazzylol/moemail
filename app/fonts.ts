import { Nunito } from 'next/font/google'
import localFont from 'next/font/local'

// 圆润可爱的 Nunito 字体
export const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// 保留原来的像素字体作为备选
export const zpix = localFont({
  src: '../public/fonts/zpix.ttf',
  variable: '--font-zpix',
  display: 'swap',
}) 