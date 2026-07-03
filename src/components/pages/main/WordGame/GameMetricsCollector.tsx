import { useAtom } from 'jotai';
import { useContext, useEffect, useState } from 'react';
import { useTurnstile } from 'react-turnstile';
import { client_q } from '~/api/client';
import {
  completed_atom,
  original_word_list_atom,
  seconds_atom,
  started_atom,
  total_attempts_atom,
  practice_mode_atom
} from './game_state';
import { location_list_type } from '~/db/types';
import TurnstileWidget from '~/components/Turnstile';
import { AppContext } from '~/components/AppDataContext';
import { load_posthog } from '~/components/tags/PosthogInit';

const GameMetricsCollector = ({
  puzzle_id,
  location
}: {
  puzzle_id: number;
  location: location_list_type;
}) => {
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [totalAttempts] = useAtom(total_attempts_atom);
  const [seconds] = useAtom(seconds_atom);
  const [wordList] = useAtom(original_word_list_atom);
  const [practiceMode] = useAtom(practice_mode_atom);
  const { script } = useContext(AppContext);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useTurnstile();
  const submit_stats_mut = client_q.puzzle.stats.submit_stats.useMutation({
    onSuccess() {
      setTurnstileToken(null);
      turnstile.reset();
      update_games_started_mut.reset();
      submit_stats_mut.reset();
    }
  });
  const update_games_started_mut = client_q.puzzle.stats.update_games_started.useMutation({
    onSuccess() {
      setTurnstileToken(null);
      turnstile.reset();
    }
  });
  useEffect(() => {
    if (started && !completed && turnstileToken && !update_games_started_mut.isSuccess) {
      // only update games started if not already done
      update_games_started_mut.mutate({
        turnstile_token: turnstileToken,
        id: puzzle_id,
        location,
        script: script
      });
      load_posthog((posthog) => {
        posthog.capture('gameplay_started', {
          puzzle_id: puzzle_id,
          location: location,
          script: script
        });
      });
    }
  }, [started, turnstileToken, completed]);
  useEffect(() => {
    if (
      completed &&
      turnstileToken &&
      !update_games_started_mut.isPending &&
      update_games_started_mut.isSuccess &&
      !submit_stats_mut.isPending &&
      !submit_stats_mut.isSuccess
    ) {
      submit_stats_mut.mutateAsync({
        turnstile_token: turnstileToken,
        info: {
          puzzle_id: puzzle_id,
          session_id: update_games_started_mut.data.session_id,
          time_taken: seconds,
          accuracy: Math.trunc((wordList.length / totalAttempts) * 100),
          correct_attempts: wordList.length,
          total_attempts: totalAttempts,
          practice_mode: practiceMode
        }
      });
      load_posthog((posthog) => {
        posthog.capture('gameplay_completed', {
          puzzle_id: puzzle_id,
          time_taken: seconds,
          accuracy: Math.trunc((wordList.length / totalAttempts) * 100),
          correct_attempts: wordList.length,
          total_attempts: totalAttempts,
          practice_mode: practiceMode
        });
      });
    }
  }, [
    turnstileToken,
    update_games_started_mut,
    completed,
    practiceMode,
    puzzle_id,
    seconds,
    totalAttempts,
    wordList
  ]);

  return <TurnstileWidget setToken={setTurnstileToken} />;
};

export default GameMetricsCollector;
