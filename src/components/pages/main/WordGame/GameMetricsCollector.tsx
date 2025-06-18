import { useAtom } from 'jotai';
import { useContext, useEffect, useState } from 'react';
import { useTurnstile } from 'react-turnstile';
import { client_q } from '~/api/client';
import {
  completed_atom,
  correct_attempts_atom,
  seconds_atom,
  started_atom,
  total_attempts_atom
} from './game_state';
import { location_list_type } from '~/db/types';
import TurnstileWidget from '~/components/Turnstile';
import { AppContext } from '~/components/AppDataContext';

const GameMetricsCollector = ({
  puzzle_id,
  location
}: {
  puzzle_id: number;
  location: location_list_type;
}) => {
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [correctAttempts] = useAtom(correct_attempts_atom);
  const [totalAttempts] = useAtom(total_attempts_atom);
  const [seconds] = useAtom(seconds_atom);
  const { script } = useContext(AppContext);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useTurnstile();
  const submit_stats_mut = client_q.padavali.stats.submit_stats.useMutation({
    onSuccess() {
      setTurnstileToken(null);
      turnstile.reset();
      update_games_started_mut.reset();
      submit_stats_mut.reset();
    }
  });
  const update_games_started_mut = client_q.padavali.stats.update_games_started.useMutation({
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
          accuracy: Math.trunc((correctAttempts / totalAttempts) * 100),
          correct_attempts: correctAttempts,
          total_attempts: totalAttempts
        }
      });
    }
  }, [turnstileToken, update_games_started_mut, completed]);

  return <TurnstileWidget setToken={setTurnstileToken} />;
};

export default GameMetricsCollector;
