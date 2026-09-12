'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { client } from '~/api/client';
import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { cn } from '~/lib/utils';

export type SelectedUser = {
  id: string;
  name: string;
};

const USER_FETCH_LIMIT = 8;

type UserSelectorProps = {
  game: 'padavali' | 'padajala';
  selectedUsers: SelectedUser[];
  onSelectedUsersChange: (users: SelectedUser[]) => void;
};

function useDebouncedSearchPager(search: string) {
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [search]);

  return { debouncedSearch, page, setPage };
}

function useUserSelectorListQuery(
  game: UserSelectorProps['game'],
  page: number,
  search: string,
  open: boolean
) {
  const userListQ = useQuery({
    queryKey: ['analytics_user_selector', game, page, search],
    queryFn: () => {
      const input = {
        page,
        size: USER_FETCH_LIMIT,
        search: search !== '' ? search : undefined
      };
      return game === 'padavali'
        ? client.puzzle.stats.get_user_list_page.query(input)
        : client.crossword.stats.get_user_list_page.query(input);
    },
    enabled: open,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  return {
    isLoading: userListQ.isLoading,
    isSuccess: userListQ.isSuccess,
    isFetching: userListQ.isFetching,
    userList: userListQ.data?.list ?? [],
    hasPrev: userListQ.data?.hasPrev ?? false,
    hasNext: userListQ.data?.hasNext ?? false
  };
}

const SelectedUserChips = ({
  selectedUsers,
  onRemove
}: {
  selectedUsers: SelectedUser[];
  onRemove: (id: string) => void;
}) =>
  selectedUsers.length === 0 ? (
    <span className="px-1 text-sm text-muted-foreground">All users (combined)</span>
  ) : (
    selectedUsers.map((user) => (
      <span
        key={user.id}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-sm dark:border-slate-600/60 dark:bg-slate-700/60"
      >
        <span className="max-w-48 truncate">{user.name}</span>
        <button
          type="button"
          onClick={() => onRemove(user.id)}
          className="rounded-full p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-600"
          aria-label={`Remove ${user.name}`}
        >
          <XIcon className="size-3.5" />
        </button>
      </span>
    ))
  );

const SelectorPagination = ({
  page,
  hasPrev,
  hasNext,
  isFetching,
  onPageChange
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}) => {
  if (!(hasPrev || hasNext)) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Prev"
            onClick={(e) => {
              e.preventDefault();
              if (hasPrev && !isFetching) onPageChange(page - 1);
            }}
            aria-disabled={!hasPrev || isFetching}
            className={cn(!hasPrev || isFetching ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="px-2 text-xs text-muted-foreground">Page {page}</span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (hasNext && !isFetching) onPageChange(page + 1);
            }}
            aria-disabled={!hasNext || isFetching}
            className={cn(!hasNext || isFetching ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

const UserPickerPopover = ({
  game,
  open,
  onOpenChange,
  selectedIds,
  onAdd
}: {
  game: UserSelectorProps['game'];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onAdd: (user: SelectedUser) => void;
}) => {
  const [search, setSearch] = useState('');
  const { debouncedSearch, page, setPage } = useDebouncedSearchPager(search);
  const { isLoading, isSuccess, isFetching, userList, hasPrev, hasNext } = useUserSelectorListQuery(
    game,
    page,
    debouncedSearch,
    open
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" />
        }
      >
        <ChevronDownIcon className="size-3.5" />
        Add user
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 sm:w-96" align="start">
        <div className="flex flex-col gap-3">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              className="text-sm"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search players"
            />
          </InputGroup>

          <div className="max-h-52 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              {isSuccess &&
                userList.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => onAdd({ id: item.id, name: item.name })}
                      className={cn(
                        'flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        isSelected
                          ? 'cursor-not-allowed bg-muted/60 text-muted-foreground'
                          : 'hover:bg-accent'
                      )}
                    >
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.plays} play{item.plays === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              {isSuccess && userList.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No players found</p>
              )}
            </div>
          </div>

          <SelectorPagination
            page={page}
            hasPrev={hasPrev}
            hasNext={hasNext}
            isFetching={isFetching}
            onPageChange={setPage}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function UserSelector({ game, selectedUsers, onSelectedUsersChange }: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedIds = new Set(selectedUsers.map((user) => user.id));

  function addUser(user: SelectedUser) {
    if (selectedIds.has(user.id)) return;
    onSelectedUsersChange([...selectedUsers, user]);
  }

  function removeUser(id: string) {
    onSelectedUsersChange(selectedUsers.filter((user) => user.id !== id));
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2 rounded-lg border border-slate-200/60 bg-white/50 px-2 py-1.5 dark:border-slate-700/40 dark:bg-slate-800/30">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Users</span>
      <SelectedUserChips selectedUsers={selectedUsers} onRemove={removeUser} />
      <UserPickerPopover
        game={game}
        open={open}
        onOpenChange={setOpen}
        selectedIds={selectedIds}
        onAdd={addUser}
      />
      {selectedUsers.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => onSelectedUsersChange([])}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
