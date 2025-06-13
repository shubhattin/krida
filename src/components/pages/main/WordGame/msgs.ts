import { type ScriptType, DEFAULT_DATA_SCRIPT } from '~/state/script_font_data';
import { lipi_parivartak } from '~/tools/lipi_lekhika';

export const word_game_msgs = {
  play: 'क्रीड',
  replay: 'पुनः',
  stop: 'विराम',
  time_taken: 'गृहीत-कालम्',
  found_words: 'लब्ध-शब्दानि',
  time_elapsed: 'अतीत-समयः'
};

export const get_transliterated_word_game_msgs = async (script: ScriptType) => {
  const transliterated_msgs = await lipi_parivartak(
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
  const [play, replay, stop, time_taken, found_words, time_elapsed] = transliterated_msgs;
  return {
    play,
    replay,
    stop,
    time_taken,
    found_words,
    time_elapsed
  };
};
