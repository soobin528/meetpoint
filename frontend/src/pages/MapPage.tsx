import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meetupKeys } from '@/shared/api';
import { fetchMeetupsByBbox } from '@/features/meetup/api';
import { useMeetupStream, useMeetupsStream } from '@/features/meetup-stream';
import {
  MapView,
  MapBBoxReporter,
  MapZoomReporter,
  MapMarkers,
  MapClickCloser,
  useClusters,
  DEFAULT_BBOX,
} from '@/features/map';
import { CreateMeetupButton } from '@/features/create-meetup/CreateMeetupButton';
import { CreateMeetupBottomSheet } from '@/features/create-meetup/CreateMeetupBottomSheet';
import { MeetupBottomSheet, MeetupDetail } from '@/features/meetup-detail';
import type { MeetupResponse } from '@/types';

/** Fallback center when geolocation is unavailable (e.g. Gangnam). */
const DEFAULT_CENTER: [number, number] = [37.5, 127.0];

export function MapPage() {
  const [bbox, setBbox] = useState(DEFAULT_BBOX);
  const [zoom, setZoom] = useState(12);
  /** Set once when geolocation succeeds; applied to map one time only, then not synced again. */
  const [userLocationToApply, setUserLocationToApply] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<MeetupResponse | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const lastMarkerClickAtRef = useRef(0);
  const suppressNextMoveendRef = useRef(false);

  const { data: meetups = [] } = useQuery({
    queryKey: meetupKeys.list(bbox),
    queryFn: ({ signal }) =>
      fetchMeetupsByBbox(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng, { signal }),
  });

  const points = useClusters(meetups, bbox, zoom);
  useMeetupsStream();
  useMeetupStream(selectedId);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setUserLocationToApply([latitude, longitude]);
        }
      },
      () => {
        // 실패/거부 시 기본 중심 유지 (userLocationToApply stays null)
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

  const handleCreateMeetup = useCallback(() => {
    setCreateSheetOpen(true);
  }, []);

  const handleCloseCreateSheet = useCallback(() => {
    setCreateSheetOpen(false);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <header className="flex-none py-2 px-4 bg-slate-800 text-white font-semibold">
        MeetPoint
      </header>

      <div className="flex-1 relative">
        <MapView
          initialCenter={DEFAULT_CENTER}
          zoom={zoom}
          userLocationToApply={userLocationToApply}
        >
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

        <CreateMeetupBottomSheet open={createSheetOpen} onClose={handleCloseCreateSheet} />
        <CreateMeetupButton onClick={handleCreateMeetup} />
      </div>
    </div>
  );
}
