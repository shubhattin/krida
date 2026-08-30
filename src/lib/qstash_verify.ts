import { Receiver } from '@upstash/qstash';

type VerifyOk = { ok: true; body: unknown };
type VerifyFail = { ok: false; response: Response };
export type VerifyQstashResult = VerifyOk | VerifyFail;

/** Verify QStash signature and return parsed JSON body, or an error Response. */
export async function verifyQstashRequest(request: Request): Promise<VerifyQstashResult> {
  try {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!
    });
    const signature = request.headers.get('upstash-signature') ?? '';
    const body = await request.text();
    await receiver.verify({ signature, body });
    return { ok: true, body: JSON.parse(body) };
  } catch (err) {
    console.error('[qstash] signature verification failed', err);
    return {
      ok: false,
      response: new Response('Unauthorized', { status: 401 })
    };
  }
}

/** @deprecated Prefer verifyQstashRequest */
export async function verifyAndParseQstashBody(request: Request): Promise<unknown> {
  const verified = await verifyQstashRequest(request);
  if (!verified.ok) throw new Error('QStash verification failed');
  return verified.body;
}
