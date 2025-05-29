import Turnstile from 'react-turnstile';
import type { Dispatch, SetStateAction } from 'react';

type Props = {
  setToken: Dispatch<SetStateAction<string>>;
};

export default function TurnstileWidget({ setToken }: Props) {
  const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
  const PROD = process.env.NODE_ENV === 'production';
  //   const browser = typeof window !== 'undefined';

  //   if (!browser || !SITE_KEY || !PROD) return <></>;
  if (!SITE_KEY || PROD) return <></>; // for dev mode testing

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
