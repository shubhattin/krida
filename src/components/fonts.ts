import {
  Inter,
  Noto_Sans_Devanagari,
  Roboto,
  Noto_Sans_Telugu,
  Noto_Sans_Kannada,
  Noto_Sans_Gujarati,
  Noto_Sans_Bengali,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Malayalam,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Brahmi,
  Noto_Sans_Siddham,
  Noto_Sans_Sinhala,
  Noto_Sans_Sharada,
  Noto_Sans_Grantha
} from 'next/font/google';
import localFont from 'next/font/local';

export const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800']
});

export const robotoSans = Roboto({
  variable: '--font-roboto-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700']
});

export const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-sans-devanagari',
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansTelugu = Noto_Sans_Telugu({
  variable: '--font-noto-sans-telugu',
  subsets: ['telugu', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansKannada = Noto_Sans_Kannada({
  variable: '--font-noto-sans-kannada',
  subsets: ['kannada', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansGujarati = Noto_Sans_Gujarati({
  variable: '--font-noto-sans-gujarati',
  subsets: ['gujarati', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansBengali = Noto_Sans_Bengali({
  variable: '--font-noto-sans-bengali',
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansOdia = Noto_Sans_Oriya({
  variable: '--font-noto-sans-odia',
  subsets: ['oriya', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansTamil = Noto_Sans_Tamil({
  variable: '--font-noto-sans-tamil',
  subsets: ['tamil', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansMalayalam = Noto_Sans_Malayalam({
  variable: '--font-noto-sans-malayalam',
  subsets: ['malayalam', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansGurumukhi = Noto_Sans_Gurmukhi({
  variable: '--font-noto-sans-gurumukhi',
  subsets: ['gurmukhi', 'latin'],
  weight: ['400', '500', '600', '700']
});

export const notoSansSinhala = Noto_Sans_Sinhala({
  variable: '--font-noto-sans-sinhala',
  subsets: ['sinhala', 'latin'],
  weight: ['400', '500', '600', '700']
});

// Ancient Scripts

export const notoSansBrahmi = Noto_Sans_Brahmi({
  variable: '--font-noto-sans-brahmi',
  subsets: ['brahmi'],
  weight: ['400']
});

export const notoSansSiddham = Noto_Sans_Siddham({
  variable: '--font-noto-sans-siddham',
  subsets: ['siddham'],
  weight: ['400']
});

export const notoSansSharada = Noto_Sans_Sharada({
  variable: '--font-noto-sans-sharada',
  subsets: ['sharada'],
  weight: ['400']
});

export const notoSansGrantha = Noto_Sans_Grantha({
  variable: '--font-noto-sans-grantha',
  subsets: ['grantha'],
  weight: ['400']
});

export const segoiUIHistoric = localFont({
  src: [
    {
      path: '../fonts/variable/woff2/SegoiUIHistoric.woff2',
      weight: '100 900',
      style: 'normal'
    }
  ],
  variable: '--font-segoi-ui-historic',
  display: 'swap'
});
