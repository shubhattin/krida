'use client';

import { useEffect, useState } from 'react';
import pretty_ms from 'pretty-ms';

export function HubCountdown({ end }: { end: Date | string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, new Date(end).getTime() - now);
  if (remaining <= 0) {
    return <span className="text-muted-foreground tabular-nums">Ended</span>;
  }

  return (
    <span className="text-muted-foreground tabular-nums">
      {pretty_ms(remaining, { secondsDecimalDigits: 0, compact: true })} left
    </span>
  );
}
