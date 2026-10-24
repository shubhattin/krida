import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { currentScheduleSetOptions, parseCurrentScheduleCache } from './schedule_cache_shared';

const NOW = Date.UTC(2026, 9, 24, 10, 0, 0);
const at = (offsetMs: number) => new Date(NOW + offsetMs);
const sec = (date: Date) => Math.floor(date.getTime() / 1000);

describe('current schedule cache', () => {
  const parse = parseCurrentScheduleCache(z.object({ id: z.number(), end_time: z.coerce.date() }));

  it('treats the old permanent "undefined" sentinel as a miss', () => {
    expect(parse('undefined')).toBeNull();
    expect(parse(null)).toBeNull();
  });

  it('parses live and no-live values', () => {
    expect(parse({ id: 1, end_time: '2026-10-25T00:00:00.000Z' })).toEqual({
      id: 1,
      end_time: new Date('2026-10-25T00:00:00.000Z')
    });
    expect(parse({ none_until: '2026-10-25T00:00:00.000Z' })).toEqual({
      none_until: new Date('2026-10-25T00:00:00.000Z')
    });
    expect(parse({ none_until: null })).toEqual({ none_until: null });
  });

  it('expires "nothing live" at the next start, and a live one just before it ends', () => {
    vi.useFakeTimers({ now: NOW });
    try {
      expect(currentScheduleSetOptions({ none_until: at(3_600_000) })).toEqual({
        exat: sec(at(3_600_000))
      });
      expect(currentScheduleSetOptions({ end_time: at(60_000) })).toEqual({
        exat: sec(at(58_000))
      });
      // Nothing scheduled: kept until a schedule write invalidates it.
      expect(currentScheduleSetOptions({ none_until: null })).toBeUndefined();
      // Never an expiry in the past (Redis would drop the key immediately).
      expect(currentScheduleSetOptions({ end_time: at(500) })).toEqual({ exat: sec(at(1000)) });
    } finally {
      vi.useRealTimers();
    }
  });
});
