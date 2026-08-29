import Turnstile from 'react-turnstile';
import { useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';

type Props = {
  setToken: Dispatch<SetStateAction<string | null>>;
};

const subscribe = () => () => {};

export default function TurnstileWidget({ setToken }: Props) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY!;
  const PROD = import.meta.env.PROD;

  if (!mounted || !SITE_KEY || !PROD) return <></>;
  // if (!mounted || !SITE_KEY || PROD) return <></>; // for dev mode testing

  return (
    <Turnstile
      sitekey={SITE_KEY}
      onVerify={(token) => {
        // console.log('token', token);
        setToken(token);
      }}
    />
  );
}
