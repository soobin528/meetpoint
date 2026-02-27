import { ReactNode } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  center: [number, number];
  zoom: number;
  children: ReactNode;
  className?: string;
}

/** Leaflet map container with OSM tiles. Children render markers/overlays. */
export function MapView({ center, zoom, children, className = 'h-full w-full' }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
