import { type word_game_msgs } from './word_game_msgs';
import { type Selection, formatTime } from './GameController';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { IoShareSocialOutline } from 'react-icons/io5';
import { GoStopwatch } from 'react-icons/go';

type Props = {
  started: boolean;
  completed: boolean;
  seconds: number;
  wordMsgs: typeof word_game_msgs;
  foundWords: Selection[];
  word_list: string[];
  title: string;
};

export const GameBottom = ({
  completed,
  foundWords,
  seconds,
  started,
  wordMsgs,
  word_list,
  title
}: Props) => {
  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="text-center">
        <h2 className="mb-1.5 text-base font-semibold text-slate-800 sm:mb-4 sm:text-lg dark:text-slate-200">
          Progress
        </h2>

        {started && !completed && (
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-3 sm:rounded-2xl sm:p-6 dark:border-slate-700 dark:from-slate-900 dark:to-blue-950">
            <div className="space-y-2 text-center sm:space-y-3">
              <p className="text-xs font-medium tracking-wide text-slate-600 uppercase sm:text-sm dark:text-slate-400">
                {wordMsgs.found_words}
              </p>
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2">
                <span className="text-2xl font-bold text-blue-600 sm:text-3xl dark:text-blue-400">
                  {foundWords.length}
                </span>
                <span className="text-xl font-bold text-slate-400 sm:text-2xl dark:text-slate-600">
                  /
                </span>
                <span className="text-2xl font-bold text-slate-600 sm:text-3xl dark:text-slate-400">
                  {word_list.length}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 sm:h-3 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${(foundWords.length / word_list.length) * 100}%` }}
                />
              </div>

              {/* <p className="text-xs text-slate-500 dark:text-slate-400">
                {Math.round((foundWords.length / word_list.length) * 100)}% Complete
              </p> */}
            </div>
          </div>
        )}

        {completed && (
          <div className="space-y-2 sm:space-y-4">
            <div
              className={cn(
                'rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:rounded-2xl sm:p-6 dark:border-green-800 dark:from-green-950 dark:to-emerald-950',
                completed && 'px-1'
              )}
            >
              <div className="space-y-3 text-center sm:space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 sm:h-16 sm:w-16">
                  <GoStopwatch className="text-lg text-white sm:text-2xl" />
                </div>

                <div>
                  <p className="mb-0.5 text-center text-base font-semibold text-green-700 sm:mb-1 sm:text-lg dark:text-green-300">
                    {/* 🎉 {wordMsgs.time_taken} 🎉 */}
                    🎉 {wordMsgs.time_taken} 🎉
                  </p>
                  <p className="font-mono text-2xl font-bold text-green-800 sm:text-3xl dark:text-green-200">
                    {formatTime(seconds)}
                  </p>
                </div>

                {typeof navigator !== 'undefined' && navigator.share && (
                  <Button
                    onClick={async () => {
                      if (navigator?.share) {
                        await navigator
                          .share({
                            title: `${title} - पदावलीशब्दक्रीडनम्`,
                            text: get_share_msg(title, formatTime(seconds))
                          })
                          .catch((err) => console.log('Error sharing:', err));
                      }
                    }}
                    className="flex transform items-center space-x-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg active:scale-95 sm:space-x-2 sm:rounded-xl sm:px-6 sm:py-3 sm:shadow-lg sm:hover:shadow-xl"
                  >
                    <IoShareSocialOutline className="text-base sm:text-lg" />
                    <span className="text-sm sm:text-base">Share Achievement</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const get_share_msg = (name: string, time_taken: string) => {
  const msg = [
    `✨I just solved a Super Fun, Interactive, Sanskrit Puzzle - 'Padavali'`,
    `'${name}' in a record ${time_taken} sec.s`,
    `💪🏽I challenge you to beat my record!`,
    `Play it NOW at https://krida.thesanskritchannel.org`,
    `Playable in Devanagari/Telugu/Kannada/Gujarati/Bengali!`,
    `नमस्ते - నమస్తే - ನಮಸ್ತೇ - નમસ્તે - নমস্তে`
  ].join('\n');

  return msg;
};
