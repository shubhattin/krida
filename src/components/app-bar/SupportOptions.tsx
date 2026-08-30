'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '~/tools/Icon';
import {
  ContributeIcon,
  PatreonIcon,
  PayPalIcon,
  RazorpayIcon,
  UPIIcon,
  YoutubeIcon
} from '../icons';
import { cn } from '~/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from '~/components/ui/dialog';
import QRCode from 'qrcode';
import ImageSpan from '../ImageSpan';
import { DialogTitle } from '~/components/ui/dialog';

// Main component
const SupportOptions = () => {
  return (
    <Dialog>
      <DialogTrigger>
        <span
          className={cn(
            '-mt-1 rounded-md px-1 py-2 font-semibold outline-hidden select-none hover:bg-gray-200 sm:px-2 dark:hover:bg-gray-700',
            'mr-3 space-x-1.5 sm:mr-3'
          )}
        >
          <Icon src={ContributeIcon} className="text-3xl text-rose-500 dark:text-rose-300" />
          <span className="hidden text-sm font-semibold sm:inline">Support Our Projects</span>
        </span>
      </DialogTrigger>
      <DialogContent className="w-80 bg-slate-200 p-3 dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>
            <div className="text-center text-lg font-bold text-amber-700 dark:text-orange-400">
              <div>Support Our Projects</div>
              <div className="text-sm">Pay as you wish</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <SupportOptionsContent />
      </DialogContent>
    </Dialog>
  );
};

export default SupportOptions;

// Support options content as a separate component
const SupportOptionsContent: React.FC = () => {
  const UPI_ID = 'thesanskritchannel@okicici';
  const UPI_ID_LINK = (() => {
    const name = encodeURIComponent('The Sanskrit Channel');
    return `upi://pay?pa=${UPI_ID}&pn=${name}&cu=INR`;
  })();

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const darkColor = '#000000';
  const lightColor = '#ffffff';
  const CANVAS_SIZE = 146;

  const tsc_icon_24_base64 =
    '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9uaX/imOs4Nao0YbBXacPUqYKAw0Os4YLebe3jVBxSnEGYvLfVZafZTSDLoBhx4/gpEo2jH0IkXTkUgt0GroCDUqUewPDPVVMaZ3lsd5hWnyUuD7OU/8PmuYFzppEzhBEyCfznoc+DUhxM125F+tnvrRXHig9Ei4bv1j3vjIprFGccK2ZKVec8xDiyGXry9SkppxT+Boi36iWV0ZkCUZSkC60sUJY+ZMjaE1SIFn5PHeQq5m6H1U09nypDILJX2uEEzx40PbRznFsbk1TY0V37//eBDmyTuwvwS8VQreYIe9q/TTT7Tj/fau0yLxDxeut9v7MjmVJszYJWd7oWjqs8ac4kIm5ZOLCX6akcSKokrxBiGZgS7ZRtbup+1U6Z1NT4rYUf6WM3Sr2mTatbOXIqihmSefDvsE/zcHJ4+n5xidvRG4Btgq8rrJYqLYOYjFwcgtFh54vP3UaTON9bFtbfzW3tBcjeVgqRunM3FQbaTJHmFnfrNsFCpFBjumLafqyjNMky1S0NT5kNgu8vD2af5fjc6+ABDw4+HpK8mzr6eJfLJUyXzwopspIp03by6K3MmPmzJPBANVoKg1Quf2vAd4kDyH9//P8PRJAHF0fP4s8kasC8gTEuPk4erZaIk85P6IfMLjUf6Lx+f/D6JN3UmsaF+mAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI1LTAxLTI4VDA4OjM3OjU4KzAwOjAwberw9AAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNS0wMS0yOFQwODozNzo1OCswMDowMBy3SEgAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjUtMDEtMjhUMDg6Mzg6MDUrMDA6MDCTnl2+AAAAE3RFWHRkYzpmb3JtYXQAaW1hZ2UvcG5n/7kbPgAAABV0RVh0cGhvdG9zaG9wOkNvbG9yTW9kZQAzVgKzQAAAABR0RVh0eG1wOkNvbG9yU3BhY2UANjU1MzU7VE3yAAAAKHRFWHR4bXA6Q3JlYXRlRGF0ZQAyMDE4LTEwLTE5VDEwOjI3OjExKzA1OjMwZCimVAAAADF0RVh0eG1wOkNyZWF0b3JUb29sAEFkb2JlIFBob3Rvc2hvcCBDQyAyMDE3IChXaW5kb3dzKaupQygAAAAqdEVYdHhtcDpNZXRhZGF0YURhdGUAMjAxOC0xMC0yNVQxMToxMjoxMCswNTozMBzgPusAAAAodEVYdHhtcDpNb2RpZnlEYXRlADIwMTgtMTAtMjVUMTE6MTI6MTArMDU6MzAgRG1VAAAAF3RFWHR4bXA6UGl4ZWxYRGltZW5zaW9uADMyNoTsHjkAAAAXdEVYdHhtcDpQaXhlbFlEaW1lbnNpb24AMzI2GeP/TwAAAEt0RVh0eG1wTU06RG9jdW1lbnRJRABhZG9iZTpkb2NpZDpwaG90b3Nob3A6YTY0ZGMyYjUtZDgxOC0xMWU4LThhMWQtYzNiM2Q4MGFhMzIzw7Tn1QAAAD10RVh0eG1wTU06SW5zdGFuY2VJRAB4bXAuaWlkOmYyZWViMmI0LTcyZmYtNGM0Mi05ZWQzLTY3YzJiNjc4MzlkYQPOEDAAAABFdEVYdHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRAB4bXAuZGlkOmFlZWQ2YmU0LWU1NTMtNzc0My04MzNmLWViYmQ5YTlhODcwZlFFJfUAAAAASUVORK5CYII=';

  useEffect(() => {
    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, UPI_ID_LINK, {
        width: CANVAS_SIZE,
        margin: 1.2,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });
    }
  }, [UPI_ID_LINK]);

  return (
    <div>
      <div className="text-sm font-semibold underline">One-Time Contributions :</div>
      <div className="mt-2">
        <div className="mb-0.5 flex justify-center text-center text-sm">
          <a
            href={UPI_ID_LINK}
            target="_blank"
            className="ml-1 outline-hidden select-none"
            rel="noopener noreferrer"
          >
            <Icon src={UPIIcon} className="-mt-1.5 text-3xl" /> UPI :{' '}
            <span className="text-sm text-blue-600 outline-hidden hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              {UPI_ID}
            </span>
          </a>
        </div>
        <div className="flex justify-center">
          <canvas
            ref={qrCanvasRef}
            className="block h-auto w-full"
            height={CANVAS_SIZE}
            width={CANVAS_SIZE}
          ></canvas>
          <div
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            className="absolute flex items-center justify-center"
          >
            <ImageSpan
              src={`data:image/png;base64,${tsc_icon_24_base64}`}
              className="size-10 rounded-full bg-white p-1 shadow-md"
            />
          </div>
        </div>
        <div className="mt-0 space-y-1">
          <a
            href="https://pages.razorpay.com/thesanskritchannel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
            title="Support us on Razorpay"
          >
            <Icon src={RazorpayIcon} className="-my-12 -mt-3 text-7xl" />
            <span className="mt-2 ml-1 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              rzp.com/thesanskritchannel
            </span>
          </a>
          <a
            href="https://www.paypal.me/thesanskritchannel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
            title="Support us on Paypal"
          >
            <Icon src={PayPalIcon} className="-mt-3 text-2xl" />
            <span className="ml-1 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              paypal.me/thesanskritchannel
            </span>
          </a>
        </div>
      </div>

      <div className="mt-4 text-sm font-semibold underline">Monthly Memberships :</div>
      <div className="mt-[0.2rem] space-y-1">
        <a
          href="https://www.patreon.com/thesanskritchannel"
          target="_blank"
          className="flex items-center justify-center space-x-2.5 pt-1"
          title="Support us on Patreon"
        >
          <Icon src={PatreonIcon} className="-mt-1 inline-block text-xl dark:bg-white" />
          <span className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            Join on Patreon
          </span>
        </a>
        <a
          href="https://www.youtube.com/channel/UCqFg6QnwgtVHo1iFgpxrx-A/join"
          target="_blank"
          title="Support us on Youtube"
          className="flex items-center justify-center space-x-2"
        >
          <Icon src={YoutubeIcon} className="text-2xl text-[red]" />
          <span className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            Join on YouTube
          </span>
        </a>
      </div>
    </div>
  );
};
