import { z } from 'zod';

export const location_list_enum = z.enum(['view_page', 'main_page', 'archive_page']);

export type location_list_type = z.infer<typeof location_list_enum>;
