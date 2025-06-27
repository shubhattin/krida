'use client';

import { useContext, useState } from 'react';
import {
  Moon,
  Sun,
  Menu,
  Monitor,
  User,
  LogIn,
  LogOut,
  List,
  Settings,
  Palette,
  ExternalLink,
  Book,
  Music
} from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import { useTheme } from 'next-themes';
import { signOut, signIn } from '~/lib/auth-client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '~/lib/utils';
import Link from 'next/link';
import { AppContext } from '../AppDataContext';
import { pwa_state_atom } from '../PWA/pwa_state';
import { useAtom } from 'jotai';

export function MenuButton() {
  const { theme, setTheme } = useTheme();
  const { user_info } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [pwa_state] = useAtom(pwa_state_atom);

  const themeOptions = [
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow system preference'
    },
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light theme'
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Dark theme'
    }
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative overflow-hidden border-slate-300/60 bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-slate-100/80 dark:border-slate-600/60 dark:bg-slate-800/80 dark:hover:bg-slate-700/80"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="scrollbar-hide w-80 border-slate-200/80 bg-white/95 p-0 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/95"
        align="end"
        // Add max-h and overflow for scrollability on small screens, and hide scrollbar
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE and Edge
        }}
        // @ts-ignore
        // Hide scrollbar for Webkit browsers
        css={{
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Settings</h3>
              {/* <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize your experience
              </p> */}
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl p-3 text-xs font-medium transition-all duration-200',
                      'border-2 hover:scale-105 active:scale-95',
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700/50'
                    )}
                    title={option.description}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

          {pwa_state.install_event_fired && (
            <>
              {/* App Installation Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    App Installation
                  </span>
                </div>

                <button
                  onClick={async () => {
                    setOpen(false);
                    if (pwa_state.event_triggerer) pwa_state.event_triggerer.prompt();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 text-left text-sm font-medium text-green-700 transition-all duration-200 hover:scale-[1.02] hover:border-green-300 hover:from-green-100 hover:to-emerald-100 hover:shadow-md active:scale-[0.98] dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/30 dark:text-green-300 dark:hover:border-green-700 dark:hover:from-green-900/40 dark:hover:to-emerald-900/40"
                  title="Install PWA App for offline access"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
                    <LogIn className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Install App</div>
                    {/* <div className="text-xs text-green-600 dark:text-green-400">
                      Get offline access & faster loading
                    </div> */}
                  </div>
                </button>
              </div>
              <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />
            </>
          )}
          {/* Links Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Links</span>
            </div>

            <div className="flex justify-center gap-8">
              <a
                href="https://github.com/shubhattin/padavali/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-800/20 bg-gray-50 text-gray-800 transition-all duration-200 hover:scale-105 hover:border-gray-800/40 hover:bg-gray-100 hover:shadow-md active:scale-95 dark:border-gray-300/20 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-gray-300/40 dark:hover:bg-gray-700/50"
                title="GitHub"
              >
                <SiGithub className="h-6 w-6" />
              </a>
              <a
                href="https://www.youtube.com/@TheSanskritChannel"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-red-500/20 bg-red-50 text-red-600 transition-all duration-200 hover:scale-105 hover:border-red-500/40 hover:bg-red-100 hover:shadow-md active:scale-95 dark:border-red-400/20 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-400/40 dark:hover:bg-red-900/40"
                title="YouTube"
              >
                <FaYoutube className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/thesanskritchannel/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-pink-500/20 bg-gradient-to-br from-pink-50 to-purple-50 text-pink-600 transition-all duration-200 hover:scale-105 hover:border-pink-500/40 hover:from-pink-100 hover:to-purple-100 hover:shadow-md active:scale-95 dark:border-pink-400/20 dark:from-pink-950/30 dark:to-purple-950/30 dark:text-pink-400 dark:hover:border-pink-400/40 dark:hover:from-pink-900/40 dark:hover:to-purple-900/40"
                title="Instagram"
              >
                <FaInstagram className="h-6 w-6" />
              </a>
            </div>

            {/* Project Links */}
            <div className="mt-4 space-y-2">
              <a
                href="http://projects.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                  <Book className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Projects</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Sanskrit Channel Projects
                  </div>
                </div>
              </a>
              <a
                href="https://svara.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Music className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Svara Darshini</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Understand Principles of Music
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
