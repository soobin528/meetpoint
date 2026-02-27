import type { MutableRefObject } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { Marker, Popup } from 'react-leaflet';
import type { MapPoint, ClusterPoint, MeetupPoint } from './useClusters';

// Default marker icon for single meetups
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function createClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    html: `<span class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-bold border-2 border-white shadow">${count}</span>`,
    className: 'cluster-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

interface MapMarkersProps {
  points: MapPoint[];
  onSelectMeetup: (id: number) => void;
  onClusterClick?: (expansionZoom: number, lat: number, lng: number) => void;
  /** For mobile-safe background close: updated on marker/cluster clicks. */
  lastMarkerClickAtRef: MutableRefObject<number>;
  /** For smoothing cluster zoom: suppress next moveend bbox update. */
  suppressNextRef?: MutableRefObject<boolean>;
}

/** Renders cluster markers (with count) and single meetup markers. Cluster click zooms in. */
export function MapMarkers({
  points,
  onSelectMeetup,
  onClusterClick,
  lastMarkerClickAtRef,
  suppressNextRef,
}: MapMarkersProps) {
  const map = useMap();

  return (
    <>
      {points.map((point) => {
        if (point.type === 'cluster') {
          const c = point as ClusterPoint;
          return (
            <Marker
              key={`cluster-${c.id}`}
              position={[c.lat, c.lng]}
              icon={createClusterIcon(c.count)}
              eventHandlers={{
                click: () => {
                  lastMarkerClickAtRef.current = Date.now();
                  if (suppressNextRef) {
                    suppressNextRef.current = true;
                  }
                  if (onClusterClick) {
                    onClusterClick(c.expansionZoom, c.lat, c.lng);
                  } else {
                    map.setView([c.lat, c.lng], c.expansionZoom);
                  }
                },
              }}
            />
          );
        }
        const m = point as MeetupPoint;
        return (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={defaultIcon}
            eventHandlers={{
              click: () => {
                lastMarkerClickAtRef.current = Date.now();
                onSelectMeetup(m.id);
              },
            }}
          >
            <Popup>{m.meetup.title}</Popup>
          </Marker>
        );
      })}
    </>
  );
}
