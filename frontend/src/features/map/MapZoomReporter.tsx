import { useEffect } from 'react';
import { useMapEvents, useMap } from 'react-leaflet';

interface MapZoomReporterProps {
  onZoomChange: (zoom: number) => void;
}

/** Reports current zoom on zoomend and once on mount so parent can pass to useClusters. */
export function MapZoomReporter({ onZoomChange }: MapZoomReporterProps) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });
  return null;
}
