'use client';

import type { z } from 'zod';
import { FaLink } from 'react-icons/fa';
import { FiYoutube } from 'react-icons/fi';
import { IoLogoYoutube } from 'react-icons/io5';
import { RiPlayList2Fill } from 'react-icons/ri';
import { attachment_schema } from '~/db/db_shared_vals';
import { cn } from '~/lib/utils';

const getYouTubeVideoId = (url: string): string | null => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|live\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export function MediaAttachments({
  attachments,
  className
}: {
  attachments: z.infer<typeof attachment_schema>[];
  className?: string;
}) {
  const PROD = import.meta.env.PROD;

  return (
    <div
      className={cn(
        'w-full space-y-1.5 p-1 sm:space-y-2',
        'flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="text=start flex items-start justify-center gap-2">
        <FiYoutube className="-mt-1 size-7 text-red-600 dark:text-red-400" />
        <span className="bg-linear-to-r from-orange-500 via-amber-500 to-yellow-600 bg-clip-text text-center text-base font-extrabold text-transparent drop-shadow-sm dark:from-amber-300 dark:via-orange-300 dark:to-yellow-200">
          Solve Together & Discuss the Puzzle
        </span>
      </div>
      <div className="space-y-1.5 sm:space-y-3">
        {attachments.map((attachment) => (
          <div key={attachment.id}>
            {attachment.type === 'link' && (
              <div className="w-full">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-x-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FaLink className="size-4.5" />
                  {attachment.title ?? attachment.url}
                </a>
              </div>
            )}
            {attachment.type === 'youtube_video' && (
              <div className="w-full">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-x-2"
                >
                  <IoLogoYoutube className="size-5 text-red-600 group-hover:text-red-500 dark:text-red-400 dark:group-hover:text-red-300" />
                  <span className="text-blue-500 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300">
                    {attachment.title ?? attachment.url}
                  </span>
                </a>
              </div>
            )}
            {attachment.type === 'youtube_playlist' && (
              <div className="w-full">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-x-2"
                >
                  <RiPlayList2Fill className="size-5 text-red-600 group-hover:text-red-500 dark:text-red-400 dark:group-hover:text-red-300" />
                  <span className="text-blue-500 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300">
                    {attachment.title ?? attachment.url}
                  </span>
                </a>
              </div>
            )}
            {attachment.type === 'youtube_embed' &&
              (() => {
                const videoId = getYouTubeVideoId(attachment.url);
                if (!videoId) return null;
                return PROD ? (
                  <div className="w-full max-w-md gap-0.5 overflow-hidden rounded-lg shadow-lg">
                    {attachment.title && (
                      <div className="flex items-center justify-center font-semibold">
                        {attachment.title}
                      </div>
                    )}
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="Discussion Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="aspect-video w-full border-0"
                    />
                  </div>
                ) : (
                  <div className="text-sm">Youtube Embed ID: {videoId}</div>
                );
              })()}
          </div>
        ))}
      </div>
    </div>
  );
}
