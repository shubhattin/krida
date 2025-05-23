import {
  Noto_Sans_Devanagari,
  Roboto,
  Noto_Sans_Telugu,
  Noto_Sans_Kannada,
  Noto_Sans_Gujarati,
  Noto_Sans_Bengali
} from 'next/font/google';

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

export const notoSansTelugu = Noto_Sans_Telugu({
  variable: '--font-noto-serif-telugu',
  subsets: ['telugu'],
  weight: ['400', '500', '700']
});

export const notoSansKannada = Noto_Sans_Kannada({
  variable: '--font-noto-serif-kannada',
  subsets: ['kannada'],
  weight: ['400', '500', '700']
});

export const notoSansGujarati = Noto_Sans_Gujarati({
  variable: '--font-noto-serif-gujarati',
  subsets: ['gujarati'],
  weight: ['400', '500', '700']
});

export const notoSansBengali = Noto_Sans_Bengali({
  variable: '--font-noto-serif-bengali',
  subsets: ['bengali'],
  weight: ['400', '500', '700']
});
