'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  BookOpen,
  Play,
  ArrowRight,
  ExternalLink,
  Book,
  Music,
  Globe,
  Languages,
  Trophy,
  Award,
  ChevronRight,
  Code2
} from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

// Mock puzzle board letters and state constants
const MOCK_GRID = [
  ['र', 'मा', 'प', 'ह'],
  ['सं', 'स्कृ', 'त', 'दा'],
  ['दे', 'व', 'व', 'लो'],
  ['ज्ञा', 'न', 'ली', 'क']
];

// Tracing path for "पदावली" (P-da-va-li)
// प: (0, 2), दा: (1, 3), व: (2, 2), ली: (3, 2)
const MOCK_PATH = [
  [0, 2],
  [1, 3],
  [2, 2],
  [3, 2]
];

const SCRIPT_SAMPLES = [
  { script: 'Devanagari', text: 'पदावली' },
  { script: 'Telugu', text: 'పదావళి' },
  { script: 'Kannada', text: 'ಪದಾವಳಿ' },
  { script: 'Gujarati', text: 'પદાવલી' },
  { script: 'Bengali', text: 'পদাবলী' },
  { script: 'Odia', text: 'ପଦାବଳୀ' },
  { script: 'Tamil', text: 'பதாவலி' }
];

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [animState, setAnimState] = useState<'idle' | 'selecting' | 'success'>('idle');
  const [scriptIndex, setScriptIndex] = useState(0);

  // Puzzle board auto-animation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isMounted = true;

    const runCycle = async () => {
      if (!isMounted) return;

      // Step 1: Idle state
      setAnimState('idle');
      setActiveStep(0);
      await new Promise((resolve) => {
        timer = setTimeout(resolve, 1500);
      });
      if (!isMounted) return;

      // Step 2: Selecting letters one-by-one
      setAnimState('selecting');
      for (let i = 0; i < MOCK_PATH.length; i++) {
        setActiveStep(i + 1);
        await new Promise((resolve) => {
          timer = setTimeout(resolve, 600);
        });
        if (!isMounted) return;
      }

      // Step 3: Success state
      setAnimState('success');
      await new Promise((resolve) => {
        timer = setTimeout(resolve, 3000);
      });
      if (!isMounted) return;

      // Restart cycle
      runCycle();
    };

    runCycle();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Script carousel auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setScriptIndex((prev) => (prev + 1) % SCRIPT_SAMPLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* Decorative Radial Background Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute top-1/3 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-400/10 blur-3xl dark:bg-purple-500/10" />
        <div className="absolute -bottom-20 left-1/3 h-[500px] w-[500px] rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
      </div>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Column 1: Value Proposition */}
            <motion.div
              className="space-y-6 text-left lg:col-span-7"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants}>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/50 px-4 py-1.5 text-xs font-semibold text-blue-600 backdrop-blur-sm dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-400">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-500 dark:text-amber-400" />
                  Sanskrit Learning Refined
                </span>
              </motion.div>

              <motion.h1
                className="bg-linear-to-r from-slate-900 via-blue-700 to-indigo-600 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl md:text-7xl dark:from-white dark:via-blue-300 dark:to-indigo-400"
                variants={itemVariants}
              >
                Learn Sanskrit <br />
                <span className="bg-linear-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-500">
                  Through Games
                </span>
              </motion.h1>

              <motion.p
                className="max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl dark:text-slate-300"
                variants={itemVariants}
              >
                Discover the elegance and depth of Sanskrit with interactive word puzzles. Switch
                instantly across 6+ Indian scripts and build your vocabulary dynamically.
              </motion.p>

              <motion.div
                className="flex flex-row items-center gap-2.5 pt-2 sm:gap-4"
                variants={itemVariants}
              >
                <Button
                  render={
                    <Link
                      href="/padavali"
                      className="flex items-center justify-center gap-1.5 font-bold sm:gap-2.5"
                    />
                  }
                  nativeButton={false}
                  size="lg"
                  className="h-auto flex-1 bg-linear-to-r from-blue-600 to-indigo-600 px-3 py-3.5 text-sm text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 sm:flex-initial sm:px-8 sm:py-5 sm:text-lg dark:from-blue-500 dark:to-indigo-500 dark:shadow-blue-500/10 dark:hover:from-blue-600 dark:hover:to-indigo-600"
                >
                  <Play className="h-4 w-4 fill-white sm:h-5 sm:w-5" />
                  <span className="truncate">Play Padavali</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                <Button
                  render={
                    <Link
                      href="/padavali/puzzles"
                      className="flex items-center justify-center gap-2 font-semibold"
                    />
                  }
                  nativeButton={false}
                  size="lg"
                  variant="outline"
                  className="h-auto flex-1 border-slate-300/80 bg-white/40 px-3 py-3.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/80 sm:flex-initial sm:px-8 sm:py-5 sm:text-lg dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/80"
                >
                  <span className="truncate">Browse Puzzles</span>
                </Button>
              </motion.div>

              {/* Connected scripts indicator */}
              <motion.div
                className="flex max-w-md items-center gap-3 border-t border-slate-200/60 pt-6 dark:border-slate-800/60"
                variants={itemVariants}
              >
                <Languages className="h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fully supports{' '}
                  <strong>Devanagari, Telugu, Kannada, Gujarati, Bengali, and Odia</strong> with
                  real-time transliteration.
                </p>
              </motion.div>
            </motion.div>

            {/* Column 2: Interactive Puzzle Showcase */}
            <div className="relative flex flex-col items-center justify-center lg:col-span-5">
              {/* Outer decorative halo glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500/10 to-purple-500/10 blur-2xl" />

              <motion.div
                className="relative w-full max-w-[380px] rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-2xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60"
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
              >
                {/* Mock Board Header */}
                <div className="mb-4 flex items-center justify-between border-b border-slate-200/50 pb-3 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      Live Demo
                    </span>
                  </div>
                  <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Find the word: <strong>पदावली</strong>
                  </div>
                </div>

                {/* 4x4 Grid representation */}
                <div className="grid aspect-square w-full grid-cols-4 gap-2.5">
                  {MOCK_GRID.map((rowArr, rIdx) =>
                    rowArr.map((letter, cIdx) => {
                      // Check if cell is in the path
                      const pathStep = MOCK_PATH.findIndex(
                        ([pr, pc]) => pr === rIdx && pc === cIdx
                      );
                      const isHighlighted = pathStep !== -1 && pathStep < activeStep;

                      let cellClass =
                        'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200';

                      if (isHighlighted) {
                        if (animState === 'success') {
                          cellClass =
                            'border-emerald-400 bg-gradient-to-br from-emerald-100 to-green-100 dark:border-emerald-500 dark:from-emerald-900/40 dark:to-green-950/25 text-emerald-700 dark:text-emerald-300 shadow-md shadow-emerald-500/10 scale-105';
                        } else if (animState === 'selecting') {
                          cellClass =
                            'border-blue-400 bg-gradient-to-br from-blue-100 to-indigo-50 dark:border-blue-500 dark:from-blue-900/40 dark:to-indigo-950/25 text-blue-700 dark:text-blue-300 shadow-md shadow-blue-500/10 scale-105';
                        }
                      }

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-lg font-bold transition-all duration-300 ${cellClass}`}
                        >
                          {letter}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Word Found Success Pop-up Card */}
                <AnimatePresence>
                  {animState === 'success' && (
                    <motion.div
                      className="absolute -bottom-6 left-1/2 w-[90%] -translate-x-1/2 rounded-2xl border border-emerald-200/80 bg-emerald-50/95 p-3.5 shadow-xl backdrop-blur-xs dark:border-emerald-800/80 dark:bg-emerald-950/95"
                      initial={{ opacity: 0, y: 10, scale: 0.95, x: '-50%' }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                      exit={{ opacity: 0, y: 5, scale: 0.95, x: '-50%' }}
                      transition={{ type: 'spring', damping: 15 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-extrabold tracking-wide text-emerald-800 uppercase dark:text-emerald-300">
                            Word Found! (पदावली)
                          </h4>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Bottom tag */}
              <div className="mt-8 text-center">
                <span className="text-xs text-slate-400 italic dark:text-slate-500">
                  Drag or swipe to connect letters and form words
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Script Multi-transliteration Showcase Section */}
      <section className="border-y border-slate-200/50 bg-slate-100/50 py-10 dark:border-slate-800/50 dark:bg-slate-900/30">
        <div className="mx-auto max-w-4xl space-y-6 px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
            <Globe className="h-3.5 w-3.5" />
            Script Agnostic Engine
          </div>
          <h2 className="text-2xl font-bold md:text-3xl">Play in your native Indian Script</h2>
          <p className="mx-auto max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Padavali uses real-time transliteration. See the word{' '}
            <span className="font-semibold text-slate-900 dark:text-white">"Padavali"</span> change
            instantly:
          </p>

          <div className="relative flex justify-center py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={scriptIndex}
                className="flex min-w-[200px] flex-col items-center gap-1 rounded-2xl border border-slate-200/60 bg-white px-8 py-5 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/80"
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {SCRIPT_SAMPLES[scriptIndex].text}
                </span>
                <span className="mt-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                  {SCRIPT_SAMPLES[scriptIndex].script} Script
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {SCRIPT_SAMPLES.map((sample, idx) => (
              <button
                key={sample.script}
                onClick={() => setScriptIndex(idx)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  scriptIndex === idx
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {sample.script}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl space-y-12 text-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Features Crafted For Learning
            </h2>
            <p className="mx-auto max-w-xl text-slate-500 dark:text-slate-400">
              Interactive puzzles combined with language tools designed to build deep vocabulary
              retention.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white/40 p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Languages className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Multiple Indian Scripts
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Adapt the letters to the script you read best. Switch between Devanagari, Telugu,
                Kannada, Gujarati, Bengali, and Odia.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white/40 p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                Listed Puzzles
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Browse and play from our full collection of listed Sanskrit word puzzles at your own
                convenience.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white/40 p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Daily Puzzles & Challenges
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Come back daily for fresh hand-curated schedules. Beat your personal time scores and
                learn Sanskrit consistently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/50 bg-white/40 p-8 shadow-xl dark:border-slate-800/50 dark:bg-slate-900/40">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { number: '8+', label: 'Indian Scripts', icon: Globe },
              { number: '100+', label: 'Sanskrit Words', icon: BookOpen },
              { number: '∞', label: 'Learning Fun', icon: Sparkles },
              { number: '100%', label: 'Free & Open', icon: Code2 }
            ].map((stat, index) => (
              <div key={index} className="space-y-1 text-center">
                <div className="mb-1 flex justify-center">
                  <stat.icon className="h-4 w-4 text-indigo-500/70" />
                </div>
                <div className="text-3xl font-extrabold text-blue-600 md:text-4xl dark:text-blue-400">
                  {stat.number}
                </div>
                <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 px-4 py-16 dark:border-slate-800/50">
        <div className="mx-auto max-w-6xl">
          {/* Main Footer Content */}
          <div className="mb-12 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/10">
                <BookOpen className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">Sanskrit Games</span>
            </div>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              An open-source interactive education project building modern tools for Sanskrit
              learning.
            </p>
          </div>

          {/* Social Media Links */}
          <div className="mb-12 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Connect with us
              </span>
            </div>

            <div className="flex justify-center gap-4">
              <a
                href="https://github.com/shubhattin/padavali/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition-all duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
                title="GitHub"
              >
                <SiGithub className="h-6 w-6" />
              </a>

              <a
                href="https://www.youtube.com/@TheSanskritChannel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50/50 text-red-600 shadow-xs transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white"
                title="YouTube"
              >
                <FaYoutube className="h-6 w-6" />
              </a>

              <a
                href="https://www.instagram.com/thesanskritchannel/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-pink-200 bg-linear-to-br from-pink-50/40 to-purple-50/40 text-pink-600 shadow-xs transition-all duration-200 hover:border-pink-500 hover:bg-pink-500 hover:text-white dark:border-pink-950 dark:bg-linear-to-br dark:from-pink-950/20 dark:to-purple-950/20 dark:text-pink-400 dark:hover:border-pink-500 dark:hover:bg-pink-500 dark:hover:text-white"
                title="Instagram"
              >
                <FaInstagram className="h-6 w-6" />
              </a>
            </div>

            {/* Project Links */}
            <div className="mx-auto flex max-w-xl flex-col justify-center gap-3 pt-4 sm:flex-row">
              <a
                href="http://www.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 text-left transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-blue-500/30 dark:hover:bg-blue-950/15"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-green-500 to-emerald-600 shadow-sm">
                  <Book className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Main Site
                    <ChevronRight className="h-3 w-3" />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    The Sanskrit Channel Website
                  </div>
                </div>
              </a>

              <a
                href="https://svara.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 text-left transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-purple-500/30 dark:hover:bg-purple-950/15"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-sm">
                  <Music className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Svara Darshini
                    <ChevronRight className="h-3 w-3" />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    Understand Principles of Music
                  </div>
                </div>
              </a>
            </div>
          </div>
          <div className="text-center text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
            © {new Date().getFullYear()} Sanskrit Games. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
