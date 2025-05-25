'use client';

import * as React from 'react';
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
  Palette
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut, signIn, useSession } from '~/lib/auth-client';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '~/lib/utils';

export function MenuButton() {
  const { theme, setTheme } = useTheme();
  const session = useSession();
  const router = useRouter();

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
    <Popover>
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
        className="w-80 border-slate-200/80 bg-white/95 p-0 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/95"
        align="end"
      >
        <div className="p-4">
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize your experience
              </p>
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

          {/* Account Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Account
              </span>
            </div>

            <div className="space-y-2">
              {!session.data?.user ? (
                <button
                  onClick={async () => {
                    await signIn.social({
                      provider: 'google',
                      callbackURL: window.location.href
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                    <LogIn className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">सम्प्रवेशः</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Sign in with Google
                    </div>
                  </div>
                </button>
              ) : (
                <div className="space-y-2">
                  {/* User Info */}
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 dark:border-slate-700 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {session.data.user.name || session.data.user.email}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Signed in</div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {session.data.user.role === 'admin' && session.data.user.is_approved && (
                    <button
                      onClick={() => router.push('/list')}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                        <List className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">सूची</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Admin panel
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Profile */}
                  <button
                    onClick={() => {
                      window.open(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/user`, '_blank');
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">उपयोक्तरम्</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        उपयोक्तृविवरणः
                      </div>
                    </div>
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm font-medium text-red-700 transition-all duration-200 hover:scale-[1.02] hover:border-red-300 hover:bg-red-100 active:scale-[0.98] dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-900/30"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                      <LogOut className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">निर्प्रवेशः</div>
                      <div className="text-xs text-red-500 dark:text-red-400">Sign out</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Unauthorized Message */}
              {session.data?.user &&
                session.data.user.role === 'admin' &&
                !session.data.user.is_approved && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
                    <div className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      Unauthorized Account
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">
                      Contact admin for approval
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
