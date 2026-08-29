import { createFileRoute } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import LandingPage from './-Landing';

export const Route = createFileRoute('/')({
  head: () =>
    routeHeadFromPageMeta({
      title: 'Sanskrit Games | Play, Learn, Grow',
      project: 'landing_page',
      description:
        'Play Sanskrit word-search and crossword games, learn across Indian scripts, and grow your vocabulary through fun challenges. Padavali and Padajala are two Sanskrit learning apps that help you learn Sanskrit through games and puzzles.'
    }),
  component: Home
});

function Home() {
  return <LandingPage />;
}
