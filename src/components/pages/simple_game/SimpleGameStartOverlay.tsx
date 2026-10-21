'use client';

import { FaPlay } from 'react-icons/fa';
import playStyles from '~/components/pages/padavali/WordGame/play-button.module.css';
import { cn } from '~/lib/utils';
import type { SimpleGameKind } from '~/util/games/kinds';
import { playGradient } from './play/theme';

/**
 * Centered start button over a blurred board — same pattern as Padāvalī / Padajāla.
 * The board itself handles the blur and pointer lock until started.
 */
export function SimpleGameStartOverlay({
  kind,
  onStart
}: {
  kind: SimpleGameKind;
  onStart: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        'group absolute inset-0 z-20 m-auto flex size-fit items-center gap-2.5 overflow-hidden rounded-2xl px-6 py-3 text-xl font-bold text-white shadow-lg sm:text-2xl',
        'transform transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95',
        playStyles.playButton
      )}
      style={{ backgroundImage: playGradient(kind) }}
    >
      <span className={playStyles.playButtonShine} aria-hidden />
      <FaPlay className="relative size-5" />
      <span className="relative">Start</span>
    </button>
  );
}
