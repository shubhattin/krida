import { Receiver } from '@upstash/qstash';
import { qstashTargetUrl, type QstashPath } from '~/effect/qstash';

type VerifyOk = { ok: true; body: unknown };
type VerifyFail = { ok: false; response: Response };
export type VerifyQstashResult = VerifyOk | VerifyFail;

/**
 * Verify QStash signature and return parsed JSON body, or an error Response.
 * `path` binds the signature to this endpoint (JWT `sub`), so a message signed for another
 * route — or another app on the same Upstash account — is rejected.
 */
export async function verifyQstashRequest(
  request: Request,
  path: QstashPath
): Promise<VerifyQstashResult> {
  try {
    const siteUrl = process.env.VITE_SITE_URL;
    if (!siteUrl) throw new Error('VITE_SITE_URL is not set');
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!
    });
    const signature = request.headers.get('upstash-signature') ?? '';
    const body = await request.text();
    await receiver.verify({ signature, body, url: qstashTargetUrl(siteUrl, path) });
    return { ok: true, body: JSON.parse(body) };
  } catch (err) {
    console.error(
      '[qstash] signature verification failed',
      err instanceof Error ? err.message : 'unknown error'
    );
    return {
      ok: false,
      response: new Response('Unauthorized', { status: 401 })
    };
  }
}
