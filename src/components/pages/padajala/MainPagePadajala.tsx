'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import PadajalaGameRoot from '~/components/pages/padajala/PadajalaGame/PadajalaGameRoot';
import type { PadajalaPuzzleType } from '~/util/cache.server/padajala_cache';

type Props = {
  word_puzzle: PadajalaPuzzleType;
};

export default function MainPagePadajala({ word_puzzle }: Props) {
  return (
    <div className="px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full border-b border-slate-200/60 bg-linear-to-r from-emerald-50 via-blue-50 to-indigo-50 dark:border-slate-700/60 dark:from-emerald-950/30 dark:via-blue-950/30 dark:to-indigo-950/30"
      >
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="-mt-1 size-5" />
            </motion.div>
            <h2 className="bg-linear-to-r from-slate-800 to-blue-600 bg-clip-text text-base font-bold text-transparent sm:text-lg dark:from-slate-100 dark:to-blue-400">
              Current Puzzle
            </h2>
          </div>
        </div>
      </motion.div>
      <PadajalaGameRoot
        puzzle={word_puzzle}
        location="main_page"
        attachments={word_puzzle.attachments}
        image={word_puzzle.image}
      />
    </div>
  );
}
