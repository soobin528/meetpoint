import { ReactNode, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/** Neighborhood-level zoom when centering on user's current location. */
const LOCAL_ZOOM = 15;

interface MapViewProps {
  /** Used only for initial map creation; not synced after mount. */
  initialCenter: [number, number];
  zoom: number;
  /** If set, map moves here once with LOCAL_ZOOM and is not forced again. */
  userLocationToApply: [number, number] | null;
  children: ReactNode;
  className?: string;
}

function UserLocationApplier({ userLocationToApply }: { userLocationToApply: [number, number] | null }) {
  const map = useMap();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!userLocationToApply || appliedRef.current) return;
    map.setView(userLocationToApply, LOCAL_ZOOM);
    appliedRef.current = true;
  }, [userLocationToApply, map]);

  return null;
}

/** Leaflet map container with OSM tiles. Children render markers/overlays. */
export function MapView({
  initialCenter,
  zoom,
  userLocationToApply,
  children,
  className = 'h-full w-full',
}: MapViewProps) {
  return (
    <MapContainer
      center={initialCenter}
      zoom={zoom}
      className={className}
      scrollWheelZoom
    >
      <UserLocationApplier userLocationToApply={userLocationToApply} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
