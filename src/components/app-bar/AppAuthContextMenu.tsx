import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '~/components/ui/context-menu';
import { useContext } from 'react';
import { AppContext } from '../AppDataContext';
import { List, LogIn, LogOut, User, Calendar, Edit } from 'lucide-react';
import Link from 'next/link';
import { signIn, signOut } from '~/lib/auth-client';

const AppAuthContextMenu = ({
  children,
  id,
  uuid
}: {
  children: React.ReactNode;
  id: number;
  uuid: string;
}) => {
  const { user_info } = useContext(AppContext);

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52 space-y-3">
        {/* Account Section */}

        {user_info ? (
          <>
            <div className="flex items-center gap-2 p-1 pt-2 pl-2">
              <User className="-mt-1 size-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {user_info.name}
              </span>
            </div>

            {/* Admin Actions */}
            {user_info.role === 'admin' && (
              <>
                <ContextMenuItem
                  className="flex items-start justify-start gap-2"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/padavali/edit/${id}`}
                      className="gap-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                    />
                  }
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-amber-600">
                    <Edit className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">Edit</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Edit/View Stats
                    </div>
                  </div>
                </ContextMenuItem>
                <ContextMenuItem
                  className="flex items-start justify-start gap-2"
                  nativeButton={false}
                  render={
                    <Link
                      href="/padavali/list"
                      className="gap-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                    />
                  }
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-violet-600">
                    <List className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">Puzzle List</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Padavali List</div>
                  </div>
                </ContextMenuItem>
                <ContextMenuItem
                  className="flex items-start justify-start gap-2"
                  nativeButton={false}
                  render={
                    <Link
                      href="/padavali/schedules"
                      className="gap-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                    />
                  }
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">Schedules</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Schedules</div>
                  </div>
                </ContextMenuItem>
              </>
            )}

            {/* Profile */}
            <ContextMenuItem
              className="flex items-start justify-start gap-2"
              nativeButton={false}
              render={
                <a
                  href={`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/user`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                />
              }
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-cyan-600">
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-medium">User Profile</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">User Profile</div>
              </div>
            </ContextMenuItem>

            {/* Sign Out */}
            <ContextMenuItem
              className="flex w-full items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm font-medium text-red-700 transition-all duration-200 hover:scale-[1.02] hover:border-red-300 hover:bg-red-100 active:scale-[0.98] dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-900/30"
              onClick={() => {
                signOut();
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-red-500 to-rose-600">
                <LogOut className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-medium">Log out</div>
                <div className="text-xs text-red-500 dark:text-red-400">Log out</div>
              </div>
            </ContextMenuItem>

            {user_info && user_info.role !== 'admin' && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
                <div className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  Unauthorized Account
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  Contact admin for approval
                </div>
              </div>
            )}
          </>
        ) : (
          <ContextMenuItem
            inset
            onClick={async () => {
              await signIn.social({
                provider: 'google',
                callbackURL: window.location.href
              });
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
          >
            <LogIn className="h-3 w-3" />
            <span>Sign in</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default AppAuthContextMenu;
