import type { Metadata } from 'next';
import LandingPage from './LandingPage';
import { getMetadata } from '@/components/tags/getPageMetaTags';

export const preferredRegion = 'bom1';

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Sanskrit Games | Play, Learn, Grow',
    project: 'landing_page',
    description:
      'Play Sanskrit word-search and crossword games, learn across Indian scripts, and grow your vocabulary through fun challenges. Padavali and Padajala are two Sanskrit learning apps that help you learn Sanskrit through games and puzzles.'
  }),
  keywords:
    'Sanskrit, learning, games, Padavali, Padajala, word puzzle, crossword, Devanagari, Telugu, Kannada, Gujarati, Bengali, Odia, Indian scripts'
};
export default function Home() {
  return <LandingPage />;
}
