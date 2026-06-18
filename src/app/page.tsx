import type { Metadata } from 'next';
import LandingPage from './LandingPage';
import { getMetadata } from '@/components/tags/getPageMetaTags';

export const preferredRegion = 'bom1';

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Sanskrit Games - Learn Sanskrit Through Interactive Games',
    description:
      'Learn Sanskrit through fun, interactive games. Play Padavali word puzzles and learn across 6 Indian scripts including Devanagari, Telugu, Kannada, Gujarati, Bengali, and Odia.'
  }),
  keywords:
    'Sanskrit, learning, games, Padavali, word puzzle, Devanagari, Telugu, Kannada, Gujarati, Bengali, Odia, Indian scripts'
};
export default function Home() {
  return <LandingPage />;
}
