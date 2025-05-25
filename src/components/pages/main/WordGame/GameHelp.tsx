import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';

export const GameHelp = () => {
  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>How to Play ?</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Swipe up, down, forward, backward, or diagonally, to form words inside the grid that
                match the Hint.
              </li>
              <li>Find all the words to complete the Puzzle.</li>
              <li>
                Share your puzzle solving time with Friends, and on Social Media. Tag us
                <span className="mx-1 text-blue-500 dark:text-blue-400">@thesanskritchannel</span>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
};
