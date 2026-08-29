import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { HelpCircle, Sparkles, Users, Trophy } from 'lucide-react';

export const GameHelp = () => {
  return (
    <div className="h-full">
      <div className="lg:py-6.5 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-5 dark:border-slate-700">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <HelpCircle className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Game Guide</h3>
        </div>
      </div>

      <div className="px-3 pb-2 pt-1.5 sm:pb-3 lg:px-2 lg:pb-4 xl:px-6">
        <Accordion className="space-y-2">
          <AccordionItem
            value="how-to-play"
            className="rounded-lg border border-slate-200 px-4 dark:border-slate-700"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="text-left font-medium">How to Play?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      1
                    </span>
                  </div>
                  <p>
                    Swipe up, down, forward, backward, or diagonally to form words inside the grid
                    that match the Hint.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                  </div>
                  <p>Find all the words to complete the puzzle and beat your best time!</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="share"
            className="rounded-lg border border-slate-200 px-4 dark:border-slate-700"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-left font-medium">Share & Challenge</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <Trophy className="mt-1 h-4 w-4 shrink-0 text-yellow-500" />
                  <p>
                    Share your puzzle solving time and accuracy with friends and on social media.
                    Tag us{' '}
                    <span className="font-medium text-blue-500 dark:text-blue-400">
                      @thesanskritchannel
                    </span>{' '}
                    and challenge others to beat your record!
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};
