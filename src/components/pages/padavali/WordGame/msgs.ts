import { type ScriptType, DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { transliterate_custom } from '~/tools/transliterator';

export const word_game_msgs = {
  play: 'क्रीड',
  replay: 'पुनः',
  stop: 'विरमतु',
  reveal: 'प्रकाशयतु',
  time_taken: 'गृहीत-कालम्',
  found_words: 'लब्ध-शब्दाः',
  time_elapsed: 'अतीत-समयः'
};

export const get_transliterated_word_game_msgs = async (
  script: ScriptType,
  transliterate_fn?: Parameters<typeof transliterate_custom>[4]
) => {
  const [play, replay, stop, reveal, time_taken, found_words, time_elapsed] =
    await transliterate_custom(
      [
        word_game_msgs.play,
        word_game_msgs.replay,
        word_game_msgs.stop,
        word_game_msgs.reveal,
        word_game_msgs.time_taken,
        word_game_msgs.found_words,
        word_game_msgs.time_elapsed
      ],
      DEFAULT_DATA_SCRIPT,
      script,
      undefined,
      transliterate_fn
    );
  return {
    play,
    replay,
    stop,
    reveal,
    time_taken,
    found_words,
    time_elapsed
  };
};
