import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { z } from 'zod';

// 👇 Verify that this messages comes from QStash
export const POST = verifySignatureAppRouter(async (req: Request) => {
  const body = await req.json();
  const { imageId } = body as { imageId: string };

  return new Response(`Image with id "${imageId}" processed successfully.`);
});
