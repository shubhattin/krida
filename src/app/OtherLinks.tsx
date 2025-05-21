'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { BsThreeDots } from 'react-icons/bs';
import { useSession } from '~/lib/auth-client';
import { IoIosList } from 'react-icons/io';
import { useRouter } from 'next/navigation';
import { GrLogin } from 'react-icons/gr';
import { FaRegUser } from 'react-icons/fa';

function Others() {
  const session = useSession();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <BsThreeDots className="text-lg" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!session.data?.user && (
          <DropdownMenuItem
            onClick={() => {
              window.open(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/login`, '_blank');
            }}
          >
            <GrLogin />
            सम्प्रवेशम्
          </DropdownMenuItem>
        )}
        {session.data?.user && (
          <>
            <DropdownMenuItem
              onClick={() => {
                router.push('/list');
              }}
            >
              <IoIosList className="text-lg" />
              सूचीन्दर्शतु
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                window.open(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/user`, '_blank');
              }}
            >
              <FaRegUser className="text-lg" />
              उपयोक्ताविवरणपृष्टम्
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Others;
