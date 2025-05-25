import { type ScriptType, DEFAULT_DATA_SCRIPT } from '~/state/script_font_data';
import { lipi_parivartak } from '~/tools/lipi_lekhika';

export const word_game_msgs = {
  play: 'क्रीड',
  replay: 'पुनः',
  time_taken: 'क्रीडनाय गृहीतकालम्',
  found_words: 'लब्धशब्दानि'
};

export const get_transliterated_word_game_msgs = async (script: ScriptType) => {
  const transliterated_msgs = await lipi_parivartak(
    [
      word_game_msgs.play,
      word_game_msgs.replay,
      word_game_msgs.time_taken,
      word_game_msgs.found_words
    ],
    DEFAULT_DATA_SCRIPT,
    script
  );
  const [play, replay, time_taken, found_words] = transliterated_msgs;
  return {
    play,
    replay,
    time_taken,
    found_words
  };
};
