'use client';

import type { HubData } from './hub_data';
import HubLibrary from './HubLibrary';

/** Home is the library: search, filter, and play. */
export default function HubHome({ data }: { data: HubData }) {
  return <HubLibrary data={data} />;
}
