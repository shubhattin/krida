'use client';

import { useState, type ReactNode } from 'react';
import {
  Moon,
  Sun,
  Menu,
  Monitor,
  LogIn,
  LogOut,
  Settings,
  Palette,
  ExternalLink,
  Book,
  Music,
  Check,
  User
} from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import { useTheme, type Theme } from '~/components/theme-provider';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '~/lib/utils';
import { is_ios_atom, pwa_state_atom } from '../PWA/pwa_state';
import { useAtom } from 'jotai';
import { PWAInstallButton } from '../PWA/PWAInit';
import { BsVectorPen } from 'react-icons/bs';
import { signIn, signOut, useSession } from '~/lib/auth-client';
import { accountMenuIconClass, accountMenuLinkClass } from '~/components/app-bar/GameMenuItems';

function SignInMenuButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <button
      type="button"
      onClick={async () => {
        onNavigate?.();
        await signIn.social({
          provider: 'google',
          callbackURL: window.location.href
        });
      }}
      className={accountMenuLinkClass}
    >
      <div className={`${accountMenuIconClass} from-slate-500 to-slate-600`}>
        <LogIn className="size-3 text-white" />
      </div>
      Sign in
    </button>
  );
}

function LoggedInAccountMenu({
  onNavigate,
  gameMenuItems
}: {
  onNavigate?: () => void;
  gameMenuItems?: ReactNode;
}) {
  const user_info = useSession().data?.user;
  if (!user_info) return null;

  return (
    <div className="space-y-1">
      {user_info.role === 'admin' && gameMenuItems ? (
        <div className="grid grid-cols-2 gap-1">{gameMenuItems}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-1">
        <a
          href={`${import.meta.env.VITE_BETTER_AUTH_URL}/user`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={accountMenuLinkClass}
        >
          <div className={`${accountMenuIconClass} from-blue-500 to-cyan-600`}>
            <User className="size-3 text-white" />
          </div>
          <span className="truncate">Profile</span>
        </a>

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            signOut();
          }}
          className={cn(
            accountMenuLinkClass,
            'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-900/30'
          )}
        >
          <div className={`${accountMenuIconClass} from-red-500 to-rose-600`}>
            <LogOut className="size-3 text-white" />
          </div>
          <span className="truncate">Log out</span>
        </button>
      </div>

      {user_info.role !== 'admin' && (
        <div className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 dark:border-orange-800 dark:bg-orange-950/30">
          <div className="text-xs font-medium text-orange-800 dark:text-orange-300">
            Unauthorized
          </div>
          <div className="text-[11px] text-orange-600 dark:text-orange-400">
            Contact admin for approval
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenuSection({
  onNavigate,
  gameMenuItems
}: {
  onNavigate?: () => void;
  gameMenuItems?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Account</span>
      </div>
      <LoggedInAccountMenu onNavigate={onNavigate} gameMenuItems={gameMenuItems} />
    </div>
  );
}

/** Closes the popover when any link inside game menu items is clicked. */
function GameMenuNavigateBridge({
  children,
  onNavigate
}: {
  children: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <div
      className="contents"
      onClick={(e) => {
        // SAFETY: React event targets in this menu are real DOM elements
        const target = e.target as HTMLElement | null;
        if (target?.closest('a')) onNavigate();
      }}
    >
      {children}
    </div>
  );
}

function PwaControlsSection({
  showPwaControls,
  isInstalled,
  installEventFired,
  isIos,
  onOpenChange
}: {
  showPwaControls: boolean;
  isInstalled: boolean;
  installEventFired: boolean;
  isIos: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const show = showPwaControls && (installEventFired || isInstalled || isIos);
  if (!show) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {isInstalled ? (
            <>
              <Check className="-mt-1 size-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                App Installed
              </span>
            </>
          ) : (
            <>
              <LogIn className="-mt-1 size-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                App Installation
              </span>
            </>
          )}
        </div>
        <PWAInstallButton setOpen={onOpenChange} />
      </div>
      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />
    </>
  );
}

export function MenuButton({
  showPwaControls = false,
  gameMenuItems
}: {
  showPwaControls?: boolean;
  gameMenuItems?: ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === 'admin';
  const showAccountAtTop = isLoggedIn && isAdmin;
  const showAccountAtBottom = isLoggedIn && !isAdmin;
  const [open, setOpen] = useState(false);
  const [pwa_state] = useAtom(pwa_state_atom);
  const [isIos] = useAtom(is_ios_atom);
  const closeMenu = () => setOpen(false);

  const themeOptions: {
    value: Theme;
    label: string;
    icon: typeof Monitor;
    description: string;
  }[] = [
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

  const gameMenuWithNavigate = gameMenuItems ? (
    <GameMenuNavigateBridge onNavigate={closeMenu}>{gameMenuItems}</GameMenuNavigateBridge>
  ) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative shrink-0 border-slate-300/60 bg-white/80 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-100/80 aria-expanded:bg-slate-100/80 dark:border-slate-600/60 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:aria-expanded:bg-slate-700/80"
          />
        }
      >
        <Menu className="h-5 w-5" />
      </PopoverTrigger>
      <PopoverContent
        className="scrollbar-hide w-80 border-slate-200/80 bg-white/95 p-0 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/95"
        align="end"
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <div className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Settings</h3>
            </div>
          </div>

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

          {showAccountAtTop && (
            <>
              <AccountMenuSection onNavigate={closeMenu} gameMenuItems={gameMenuWithNavigate} />
              <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />
            </>
          )}

          <PwaControlsSection
            showPwaControls={showPwaControls}
            isInstalled={pwa_state.is_installed}
            installEventFired={pwa_state.install_event_fired}
            isIos={isIos}
            onOpenChange={setOpen}
          />

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
                onClick={closeMenu}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-800/20 bg-gray-50 text-gray-800 transition-all duration-200 hover:scale-105 hover:border-gray-800/40 hover:bg-gray-100 hover:shadow-md active:scale-95 dark:border-gray-300/20 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-gray-300/40 dark:hover:bg-gray-700/50"
                title="GitHub"
              >
                <SiGithub className="h-6 w-6" />
              </a>
              <a
                href="https://www.youtube.com/@TheSanskritChannel"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-red-500/20 bg-red-50 text-red-600 transition-all duration-200 hover:scale-105 hover:border-red-500/40 hover:bg-red-100 hover:shadow-md active:scale-95 dark:border-red-400/20 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-400/40 dark:hover:bg-red-900/40"
                title="YouTube"
              >
                <FaYoutube className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/thesanskritchannel/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-pink-500/20 bg-linear-to-br from-pink-50 to-purple-50 text-pink-600 transition-all duration-200 hover:scale-105 hover:border-pink-500/40 hover:from-pink-100 hover:to-purple-100 hover:shadow-md active:scale-95 dark:border-pink-400/20 dark:from-pink-950/30 dark:to-purple-950/30 dark:text-pink-400 dark:hover:border-pink-400/40 dark:hover:from-pink-900/40 dark:hover:to-purple-900/40"
                title="Instagram"
              >
                <FaInstagram className="h-6 w-6" />
              </a>
            </div>

            <div className="mt-4 space-y-2">
              <a
                href="http://www.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-green-500 to-emerald-600">
                  <Book className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Main Site</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    The Sanskrit Channel Website
                  </div>
                </div>
              </a>
              <a
                href="https://svara.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600">
                  <Music className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Svara Darshini</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Understand Principles of Music
                  </div>
                </div>
              </a>
              <a
                href="https://akshara.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-orange-400 to-orange-600">
                  <BsVectorPen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Akshara Shikshaka</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Learn to Write Indian Scripts
                  </div>
                </div>
              </a>
              <a
                href="https://lipilekhika.in"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
              >
                <span
                  className="inline-block size-8 bg-cover bg-center bg-no-repeat px-4"
                  style={{
                    backgroundImage: "url('/lipi.svg')"
                  }}
                  title="Lipi Lekhika"
                  aria-label="Lipi Lekhika"
                ></span>
                <div>
                  <div className="font-medium">Lipi Lekhika</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Type Indian Languages with full Speed and Accuracy
                  </div>
                </div>
              </a>
            </div>
          </div>

          {(!isLoggedIn || showAccountAtBottom) && (
            <>
              <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />
              {!isLoggedIn ? (
                <SignInMenuButton onNavigate={closeMenu} />
              ) : (
                <AccountMenuSection onNavigate={closeMenu} gameMenuItems={gameMenuWithNavigate} />
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
