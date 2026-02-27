import type { MutableRefObject } from 'react';
import { useMapEvents } from 'react-leaflet';

interface MapClickCloserProps {
  onMapClick: () => void;
  /** Updated by marker clicks so we can ignore the next background click on mobile. */
  lastMarkerClickAtRef: MutableRefObject<number>;
}

/** Closes bottom sheet when background map is clicked, but ignores immediate marker clicks. */
export function MapClickCloser({ onMapClick, lastMarkerClickAtRef }: MapClickCloserProps) {
  useMapEvents({
    click: () => {
      const now = Date.now();
      if (now - lastMarkerClickAtRef.current <= 150) {
        // Treat as marker click; ignore background close.
        return;
      }
      onMapClick();
    },
  });
  return null;
}

