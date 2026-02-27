import type { BBox } from './types';

const DECIMALS = 4;
const FACTOR = 10 ** DECIMALS;

function round4(value: number): number {
  return Math.round(value * FACTOR) / FACTOR;
}

/** Normalize bbox: round coords and ensure min <= max for both lat/lng. */
export function normalizeBbox(bbox: BBox): BBox {
  let { minLat, maxLat, minLng, maxLng } = bbox;
  minLat = round4(minLat);
  maxLat = round4(maxLat);
  minLng = round4(minLng);
  maxLng = round4(maxLng);

  if (minLat > maxLat) [minLat, maxLat] = [maxLat, minLat];
  if (minLng > maxLng) [minLng, maxLng] = [maxLng, minLng];

  return { minLat, minLng, maxLat, maxLng };
}

