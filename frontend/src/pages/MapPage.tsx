import { useState, useCallback, useRef } from 'react';
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

export function MapPage() {
  const [bbox, setBbox] = useState(DEFAULT_BBOX);
  const [zoom, setZoom] = useState(12);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const lastMarkerClickAtRef = useRef(0);
  const suppressNextMoveendRef = useRef(false);

  const { data: meetups = [] } = useQuery({
    queryKey: meetupKeys.list(bbox),
    queryFn: ({ signal }) =>
      fetchMeetupsByBbox(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng, { signal }),
  });

  const points = useClusters(meetups, bbox, zoom);
  useMeetupStream(selectedId);

  const handleSelectMeetup = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <header className="flex-none py-2 px-4 bg-slate-800 text-white font-semibold">
        MeetPoint
      </header>

      <div className="flex-1 relative">
        <MapView center={[37.5, 127.0]} zoom={zoom}>
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
