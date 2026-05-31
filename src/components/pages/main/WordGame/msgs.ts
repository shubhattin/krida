import { type ScriptType, DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate } from 'lipilekhika';

export const word_game_msgs = {
  play: 'क्रीड',
  replay: 'पुनः',
  stop: 'विरमतु',
  time_taken: 'गृहीत-कालम्',
  found_words: 'लब्ध-शब्दाः',
  time_elapsed: 'अतीत-समयः'
};

export const get_transliterated_word_game_msgs = async (script: ScriptType) => {
  const [play, replay, stop, time_taken, found_words, time_elapsed] = await transliterate(
    [
      word_game_msgs.play,
      word_game_msgs.replay,
      word_game_msgs.stop,
      word_game_msgs.time_taken,
      word_game_msgs.found_words,
      word_game_msgs.time_elapsed
    ],
    DEFAULT_DATA_SCRIPT,
    script
  );
  return {
    play,
    replay,
    stop,
    time_taken,
    found_words,
    time_elapsed
  };
};
