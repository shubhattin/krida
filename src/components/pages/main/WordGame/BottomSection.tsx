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
    <div className="w-full max-w-md">
      {started && !completed && (
        <h3 className="mb-2 text-lg font-semibold text-stone-800 dark:text-stone-200">
          <span className="mr-1.5">{wordMsgs.found_words} :</span>
          <span
            className={cn(
              foundWords.length === word_list.length
                ? 'text-green-700 dark:text-green-400'
                : 'text-blue-700 dark:text-blue-400'
            )}
          >
            {foundWords.length}/{word_list.length}
          </span>
        </h3>
      )}

      {completed && (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <GoStopwatch className="text-3xl" />
            <div className="text-lg font-semibold text-green-700 dark:text-green-400">
              {wordMsgs.time_taken} - <span className="font-mono">{formatTime(seconds)}</span>
            </div>
          </div>
          {typeof navigator !== 'undefined' && navigator.share && (
            // {true && (
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
              className="m-0 mt-1.5 gap-1.5 bg-green-600 px-1.5 py-1 text-lg text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              <IoShareSocialOutline className="text-lg" />
              Share
            </Button>
          )}
        </div>
      )}
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
