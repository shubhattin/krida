'use client';

import * as React from 'react';
import { Moon, Sun, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SlScreenDesktop } from 'react-icons/sl';

export function MenuButton() {
  const { setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 sm:w-60" align="end">
        <div className="flex">
          <span className="text-center text-base">Set Theme</span>
          <span className="ml-4 inline-flex items-center space-x-2.5 sm:ml-4.5 sm:space-x-3">
            <button onClick={() => setTheme('system')} className="group">
              <SlScreenDesktop className="h-5 w-5 group-hover:text-blue-500 dark:group-hover:text-sky-500" />
            </button>
            <button onClick={() => setTheme('light')} className="group">
              <Sun className="h-5 w-5 dark:group-hover:text-yellow-300" />
            </button>
            <button onClick={() => setTheme('dark')} className="group">
              <Moon className="h-5 w-5 group-hover:text-purple-600 dark:group-hover:text-white" />
            </button>
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
