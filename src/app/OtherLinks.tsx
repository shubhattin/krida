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
import { signOut, signIn, useSession } from '~/lib/auth-client';
import { IoIosList } from 'react-icons/io';
import { useRouter } from 'next/navigation';
import { GrLogin } from 'react-icons/gr';
import { FaRegUser } from 'react-icons/fa';
import { BiLogOut } from 'react-icons/bi';
import { ScriptSelector } from '~/components/pages/main/WordGame/ScriptSelector';

function Others() {
  const session = useSession();
  const router = useRouter();

  return (
    <div className="mb-2 flex items-center justify-between sm:mb-3.5">
      <ScriptSelector />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <BsThreeDots className="text-lg" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!session.data?.user && (
            <DropdownMenuItem
              onClick={async () => {
                await signIn.social({
                  provider: 'google',
                  callbackURL: window.location.href
                });
              }}
            >
              <GrLogin />
              सम्प्रवेशः
            </DropdownMenuItem>
          )}
          {session.data?.user && (
            <>
              {session.data.user.role === 'admin' && session.data.user.is_approved ? (
                <DropdownMenuItem
                  onClick={() => {
                    router.push('/list');
                  }}
                >
                  <IoIosList className="text-lg" />
                  सूची
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem>Unauthorized Account !</DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  window.open(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/user`, '_blank');
                }}
              >
                <FaRegUser className="text-lg" />
                उपयोक्तरम्
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  signOut();
                }}
              >
                <BiLogOut className="text-lg" />
                निर्प्रवेशः
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default Others;
