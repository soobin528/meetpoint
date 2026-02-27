/** Map bounds for bbox query and clustering */
export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export const DEFAULT_BBOX: BBox = {
  minLat: 37.4,
  minLng: 126.9,
  maxLat: 37.6,
  maxLng: 127.2,
};
