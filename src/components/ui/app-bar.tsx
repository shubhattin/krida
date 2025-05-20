import React from 'react';
import { ModeToggle } from '@/components/theme-toggle';
import { notoSansDevanagari } from '../fonts';

export default function AppBar({ title }: { title: string }) {
  return (
    <header className="w-full bg-white shadow-sm dark:bg-gray-900">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3.5">
        <div className={`text-2xl font-bold ${notoSansDevanagari.className}`}>{title}</div>
        <ModeToggle />
      </div>
    </header>
  );
}
