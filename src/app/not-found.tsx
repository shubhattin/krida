import { Metadata } from 'next';
import NotFoundClient from './NotFoundClient';

export const metadata: Metadata = {
  title: 'Page Not Found | Padāvalī & Padajāla Sanskrit Word Games',
  description:
    "Oops! We couldn't find the page you are looking for. Reconnect with Sanskrit by playing our interactive mini word search and crossword preview puzzles.",
  keywords: ['404', 'not found', 'Sanskrit', 'word games', 'crossword', 'word search', 'puzzle']
};

export default function NotFound() {
  return <NotFoundClient />;
}
