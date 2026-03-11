import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meetupKeys } from '@/shared/api';
import { fetchMeetupsByBbox } from '@/features/meetup/api';
import { useMeetupStream } from '@/features/meetup-stream';
import {
  MapView,
  MapBBoxReporter,
  MapZoomReporter,
  MapMarkers,
  MapClickCloser,
  useClusters,
  DEFAULT_BBOX,
} from '@/features/map';
import { MeetupBottomSheet, MeetupDetail } from '@/features/meetup-detail';
import type { MeetupResponse } from '@/types';

const DEFAULT_CENTER: [number, number] = [37.5, 127.0];

export function MapPage() {
  const [bbox, setBbox] = useState(DEFAULT_BBOX);
  const [zoom, setZoom] = useState(12);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<MeetupResponse | null>(null);
  const lastMarkerClickAtRef = useRef(0);
  const suppressNextMoveendRef = useRef(false);

  const { data: meetups = [] } = useQuery({
    queryKey: meetupKeys.list(bbox),
    queryFn: ({ signal }) =>
      fetchMeetupsByBbox(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng, { signal }),
  });

  const points = useClusters(meetups, bbox, zoom);
  useMeetupStream(selectedId);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setCenter([latitude, longitude]);
        }
      },
      () => {
        // 실패/거부 시에는 기본 중심 유지
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, []);

  const handleSelectMeetup = useCallback((meetup: MeetupResponse) => {
    setSelectedId(meetup.id);
    setSelectedSummary(meetup);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedId(null);
    setSelectedSummary(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <header className="flex-none py-2 px-4 bg-slate-800 text-white font-semibold">
        MeetPoint
      </header>

      <div className="flex-1 relative">
        <MapView center={center} zoom={zoom}>
          <MapBBoxReporter onBBoxChange={setBbox} suppressNextRef={suppressNextMoveendRef} />
          <MapZoomReporter onZoomChange={setZoom} />
          <MapClickCloser
            onMapClick={handleCloseSheet}
            lastMarkerClickAtRef={lastMarkerClickAtRef}
          />
          <MapMarkers
            points={points}
            onSelectMeetup={handleSelectMeetup}
            lastMarkerClickAtRef={lastMarkerClickAtRef}
            suppressNextRef={suppressNextMoveendRef}
          />
        </MapView>

        <MeetupBottomSheet open={selectedId != null} onClose={handleCloseSheet}>
          {selectedId != null && (
            <MeetupDetail meetupId={selectedId} onClose={handleCloseSheet} />
          )}
        </MeetupBottomSheet>
      </div>
    </div>
  );
}
