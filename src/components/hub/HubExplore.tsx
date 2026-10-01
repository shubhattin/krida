'use client';

import type { HubData } from './hub_data';
import HubLibrary from './HubLibrary';

/** `/explore` is the same library as `/`, so shared URLs and filters keep working. */
export default function HubExplore({ data }: { data: HubData }) {
  return <HubLibrary data={data} />;
}
