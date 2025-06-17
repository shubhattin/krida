import {
  Noto_Sans_Devanagari,
  Roboto,
  Noto_Sans_Telugu,
  Noto_Sans_Kannada,
  Noto_Sans_Gujarati,
  Noto_Sans_Bengali,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Malayalam,
  Noto_Sans_Gurmukhi
} from 'next/font/google';

export const robotoSans = Roboto({
  variable: '--font-roboto-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700']
});

export const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-sans-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '500', '700']
});

export const notoSansTelugu = Noto_Sans_Telugu({
  variable: '--font-noto-sans-telugu',
  subsets: ['telugu'],
  weight: ['400', '500', '700']
});

export const notoSansKannada = Noto_Sans_Kannada({
  variable: '--font-noto-sans-kannada',
  subsets: ['kannada'],
  weight: ['400', '500', '700']
});

export const notoSansGujarati = Noto_Sans_Gujarati({
  variable: '--font-noto-sans-gujarati',
  subsets: ['gujarati'],
  weight: ['400', '500', '700']
});

export const notoSansBengali = Noto_Sans_Bengali({
  variable: '--font-noto-sans-bengali',
  subsets: ['bengali'],
  weight: ['400', '500', '700']
});

export const notoSansOdia = Noto_Sans_Oriya({
  variable: '--font-noto-sans-odia',
  subsets: ['oriya'],
  weight: ['400', '500', '700']
});

export const notoSansTamil = Noto_Sans_Tamil({
  variable: '--font-noto-sans-tamil',
  subsets: ['tamil'],
  weight: ['400', '500', '700']
});

export const notoSansMalayalam = Noto_Sans_Malayalam({
  variable: '--font-noto-sans-malayalam',
  subsets: ['malayalam'],
  weight: ['400', '500', '700']
});

export const notoSansGurumukhi = Noto_Sans_Gurmukhi({
  variable: '--font-noto-sans-gurumukhi',
  subsets: ['gurmukhi'],
  weight: ['400', '500', '700']
});
