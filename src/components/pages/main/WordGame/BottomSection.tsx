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
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200">Progress</h2>

        {started && !completed && (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-6 dark:border-slate-700 dark:from-slate-900 dark:to-blue-950">
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">
                {wordMsgs.found_words}
              </p>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {foundWords.length}
                </span>
                <span className="text-2xl font-bold text-slate-400 dark:text-slate-600">/</span>
                <span className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                  {word_list.length}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
          <div className="space-y-4">
            <div className="rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500">
                  <GoStopwatch className="text-2xl text-white" />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium tracking-wide text-green-600 uppercase dark:text-green-400">
                    🎉 Congratulations! 🎉
                  </p>
                  <p className="mb-1 text-lg font-semibold text-green-700 dark:text-green-300">
                    {wordMsgs.time_taken}
                  </p>
                  <p className="font-mono text-3xl font-bold text-green-800 dark:text-green-200">
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
                    className="flex transform items-center space-x-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl active:scale-95"
                  >
                    <IoShareSocialOutline className="text-lg" />
                    <span>Share Achievement</span>
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
