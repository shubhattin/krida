import { z } from 'zod';

const notifications_options_schema = z.object({
  name: z.string(),
  headings: z.record(z.string(), z.string()),
  contents: z.record(z.string(), z.string()),
  target_channel: z.string().optional().default('push'),
  included_segments: z.array(z.string()).optional().default(['All']),
  chrome_web_image: z.string().optional(),
  url: z.string().optional().nullable()
});

type NotificationArgs = z.input<typeof notifications_options_schema>;

export async function sendOneSignalNotification(options: NotificationArgs) {
  const body = notifications_options_schema.parse(options);

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify({
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      ...body
    })
  });

  return response.json();
}
