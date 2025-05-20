import { Noto_Sans_Devanagari, Roboto } from 'next/font/google';

export const robotoSans = Roboto({
  variable: '--font-roboto-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700']
});

export const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-sans-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '500', '700']
});
