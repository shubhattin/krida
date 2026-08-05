'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Compass } from 'lucide-react';
import { GameShowcaseCard, GAMES } from './LandingPage';

export default function NotFoundClient() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-150 w-150 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
        <div className="absolute -bottom-45 -left-40 h-150 w-150 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-12 text-center">
        {/* Error Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="space-y-4"
        >
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20">
            <Compass
              className="h-10 w-10 animate-spin text-slate-100"
              style={{ animationDuration: '8s' }}
            />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
              404
            </span>
          </div>

          <h1 className="bg-linear-to-r from-slate-800 via-blue-600 to-indigo-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl dark:from-slate-100 dark:via-blue-400 dark:to-indigo-400">
            Lost in Sanskrit Words?
          </h1>

          <p className="mx-auto max-w-xl text-base text-slate-500 dark:text-slate-400">
            We couldn&apos;t find the page you&apos;re looking for, but you can play these
            interactive preview puzzles or return to safety.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/35"
            >
              <Home className="h-4 w-4" />
              Go Back Home
            </Link>
          </div>
        </motion.div>

        {/* Embedded Interactive Games */}
        <div className="grid w-full gap-8 text-left md:grid-cols-2">
          {GAMES.map((game, index) => (
            <GameShowcaseCard key={game.id} game={game} index={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
