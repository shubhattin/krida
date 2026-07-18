import type { Metadata } from 'next';
import LandingPage from './LandingPage';
import { getMetadata } from '@/components/tags/getPageMetaTags';

export const preferredRegion = 'bom1';

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Sanskrit Games - Padavali & Padajala',
    description:
      'Learn Sanskrit through interactive games. Play Padavali word search and Padajala crossword puzzles across 6+ Indian scripts including Devanagari, Telugu, Kannada, Gujarati, Bengali, and Odia.'
  }),
  keywords:
    'Sanskrit, learning, games, Padavali, Padajala, word puzzle, crossword, Devanagari, Telugu, Kannada, Gujarati, Bengali, Odia, Indian scripts'
};
export default function Home() {
  return <LandingPage />;
}
