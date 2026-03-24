import type { MutableRefObject } from 'react';
import { useMapEvents } from 'react-leaflet';

interface MapClickCloserProps {
  onMapClick: () => void;
  /** Updated by marker clicks so we can ignore the next background click on mobile. */
  lastMarkerClickAtRef: MutableRefObject<number>;
}

/** Closes bottom sheet when background map is clicked, but ignores immediate marker clicks. */
export function MapClickCloser({ onMapClick, lastMarkerClickAtRef }: MapClickCloserProps) {
  const MARKER_CLICK_GUARD_MS = 700;

  useMapEvents({
    click: (e) => {
      const now = Date.now();
      const elapsed = now - lastMarkerClickAtRef.current;

      // Marker/cluster DOM safety: if event target is still from marker layer, do not close.
      const target = e.originalEvent?.target;
      if (target instanceof Element) {
        const fromMarkerLayer = !!target.closest(
          '.leaflet-marker-pane, .leaflet-marker-icon, .midpoint-marker-root, .cluster-marker'
        );
        if (fromMarkerLayer) return;
      }

      if (elapsed <= MARKER_CLICK_GUARD_MS) {
        // Treat as marker click; ignore background close.
        return;
      }
      onMapClick();
    },
  });
  return null;
}

