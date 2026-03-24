import { useMemo, useLayoutEffect, type MutableRefObject } from 'react';
import L from 'leaflet';
import { Marker, useMap } from 'react-leaflet';
import type { MeetupResponse } from '@/types';

/** Pane name: rendered above default markerPane (z-index 600). */
const MIDPOINT_PANE = 'midpointPane';

/**
 * Circular divIcon — purple gradient + white ring, visually distinct from
 * default OSM pin (blue) and cluster count badges.
 */
const midpointIcon = L.divIcon({
  className: 'leaflet-div-icon midpoint-marker-root',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(160deg,#7c3aed,#5b21b6);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="width:8px;height:8px;border-radius:50%;background:#faf5ff;box-shadow:0 0 0 1px rgba(91,33,182,.4);"></span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MidpointPaneSetup() {
  const map = useMap();
  useLayoutEffect(() => {
    if (map.getPane(MIDPOINT_PANE)) return;
    const pane = map.createPane(MIDPOINT_PANE);
    pane.style.zIndex = '620';
    pane.style.pointerEvents = 'auto';
  }, [map]);
  return null;
}

export interface MidpointMarkersProps {
  meetups: MeetupResponse[];
  onSelectMeetup: (meetupId: number) => void;
  /** Optional: align with MapMarkers / MapClickCloser (suppress map background close after marker tap). */
  lastMarkerClickAtRef?: MutableRefObject<number>;
}

export function MidpointMarkers({
  meetups,
  onSelectMeetup,
  lastMarkerClickAtRef,
}: MidpointMarkersProps) {
  const validMidpointMeetups = useMemo(
    () =>
      meetups.filter(
        (m) =>
          m.midpoint != null &&
          m.current_count >= 2 &&
          m.status !== 'CANCELED'
      ),
    [meetups]
  );

  return (
    <>
      <MidpointPaneSetup />
      {validMidpointMeetups.map((meetup) => {
        const { lat, lng } = meetup.midpoint!;
        return (
          <Marker
            key={`midpoint-${meetup.id}`}
            pane={MIDPOINT_PANE}
            position={[lat, lng]}
            icon={midpointIcon}
            eventHandlers={{
              click: (e) => {
                // Defensive: midpoint marker click should never trigger page navigation.
                e.originalEvent.preventDefault();
                e.originalEvent.stopPropagation();
                if (lastMarkerClickAtRef) {
                  lastMarkerClickAtRef.current = Date.now();
                }
                onSelectMeetup(meetup.id);
              },
            }}
          />
        );
      })}
    </>
  );
}
