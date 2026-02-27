import { useRef } from 'react';
import { useMapEvents, useMap } from 'react-leaflet';
import type { MutableRefObject } from 'react';
import type { BBox } from './types';
import { normalizeBbox } from './bbox';

interface MapBBoxReporterProps {
  onBBoxChange: (bbox: BBox) => void;
  /** When true, next moveend is ignored once and then cleared (used for cluster zoom). */
  suppressNextRef?: MutableRefObject<boolean>;
}

/** Reports map bounds on moveend so parent can refetch bbox query or update clusters. Debounced. */
export function MapBBoxReporter({ onBBoxChange, suppressNextRef }: MapBBoxReporterProps) {
  const map = useMap();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    moveend: () => {
      if (suppressNextRef?.current) {
        suppressNextRef.current = false;
        return;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        const raw: BBox = {
          minLat: b.getSouthWest().lat,
          minLng: b.getSouthWest().lng,
          maxLat: b.getNorthEast().lat,
          maxLng: b.getNorthEast().lng,
        };
        onBBoxChange(normalizeBbox(raw));
      }, 200);
    },
  });
  return null;
}

