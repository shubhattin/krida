'use client';

import { useAtomValue } from 'jotai';
import { MdReplay } from 'react-icons/md';
import { Play } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { completed_atom, started_atom } from './game_state';
import type { useCrossWordGame } from './useCrossWordGame';

type GameControlsProps = {
  game: ReturnType<typeof useCrossWordGame>;
};

export function GameControls({ game }: GameControlsProps) {
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);

  if (!started) {
    return (
      <Button size="lg" onClick={game.startGame} className="gap-2 shadow-lg">
        <Play data-icon="inline-start" />
        Start
      </Button>
    );
  }

  if (completed) {
    return (
      <Button size="sm" variant="outline" onClick={game.startGame} className="gap-1.5">
        <MdReplay className="size-4" />
        Play again
      </Button>
    );
  }

  return (
    <Button size="sm" variant="ghost" onClick={game.resetGame}>
      Reset
    </Button>
  );
}
