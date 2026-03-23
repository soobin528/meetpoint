import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meetupKeys } from '@/shared/api';
import { fetchMeetupsByBbox } from '@/features/meetup/api';
import { useMeetupStream, useMeetupsStream } from '@/features/meetup-stream';
import {
  MapView,
  MapBBoxReporter,
  MapZoomReporter,
  MapMarkers,
  MidpointMarkers,
  CategoryFilterBar,
  MapClickCloser,
  useClusters,
  DEFAULT_BBOX,
} from '@/features/map';
import { CreateMeetupButton } from '@/features/create-meetup/CreateMeetupButton';
import { CreateMeetupBottomSheet } from '@/features/create-meetup/CreateMeetupBottomSheet';
import { MeetupBottomSheet, MeetupDetail } from '@/features/meetup-detail';
import type { MeetupCategory, MeetupResponse } from '@/types';

/** Fallback center when geolocation is unavailable (e.g. Gangnam). */
const DEFAULT_CENTER: [number, number] = [37.5, 127.0];
const ALL_MEETUP_CATEGORIES: MeetupCategory[] = [
  'STUDY',
  'MEAL',
  'CAFE_CHAT',
  'EXERCISE',
  'DRINK',
  'OUTDOOR',
  'CULTURE',
  'SHOPPING',
  'FREE',
];

export function MapPage() {
  const [bbox, setBbox] = useState(DEFAULT_BBOX);
  const [zoom, setZoom] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | MeetupCategory>('ALL');
  /** Set once when geolocation succeeds; applied to map one time only, then not synced again. */
  const [userLocationToApply, setUserLocationToApply] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const lastMarkerClickAtRef = useRef(0);
  const suppressNextMoveendRef = useRef(false);

  const { data: meetups = [] } = useQuery({
    queryKey: meetupKeys.list(bbox),
    queryFn: ({ signal }) =>
      fetchMeetupsByBbox(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng, { signal }),
  });

  const filteredMeetups = useMemo(() => {
    if (selectedCategory === 'ALL') return meetups;
    // Hot-reload/old state safety: if selectedCategory somehow contains an invalid runtime value,
    // treat it like 'ALL' to avoid hiding all meetups.
    if (!ALL_MEETUP_CATEGORIES.includes(selectedCategory as MeetupCategory)) return meetups;

    // Backward compatibility: older meetups may miss category; treat them as FREE for filtering.
    return meetups.filter((m) => (m.category ?? 'FREE') === selectedCategory);
  }, [meetups, selectedCategory]);

  const points = useClusters(filteredMeetups, bbox, zoom);
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
  }, []);

  const handleSelectMeetupById = useCallback(
    (meetupId: number) => {
      const meetup = filteredMeetups.find((m) => m.id === meetupId);
      if (meetup) handleSelectMeetup(meetup);
    },
    [filteredMeetups, handleSelectMeetup]
  );

  const handleCloseSheet = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleCreateMeetup = useCallback(() => {
    setCreateSheetOpen(true);
  }, []);

  const handleCloseCreateSheet = useCallback(() => {
    setCreateSheetOpen(false);
  }, []);

  const mapCenterLat = (bbox.minLat + bbox.maxLat) / 2;
  const mapCenterLng = (bbox.minLng + bbox.maxLng) / 2;

  return (
    <div className="h-full flex flex-col">
      <header className="flex-none py-2 px-4 bg-slate-800 text-white font-semibold">
        MeetPoint
      </header>

      <div className="flex-1 relative">
        <CategoryFilterBar selectedCategory={selectedCategory} onChange={setSelectedCategory} />
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
          <MidpointMarkers
            meetups={filteredMeetups}
            onSelectMeetup={handleSelectMeetupById}
            lastMarkerClickAtRef={lastMarkerClickAtRef}
          />
        </MapView>

        <MeetupBottomSheet open={selectedId != null} onClose={handleCloseSheet}>
          {selectedId != null && (
            <MeetupDetail meetupId={selectedId} onClose={handleCloseSheet} />
          )}
        </MeetupBottomSheet>

        <CreateMeetupBottomSheet
          open={createSheetOpen}
          onClose={handleCloseCreateSheet}
          lat={mapCenterLat}
          lng={mapCenterLng}
        />
        <CreateMeetupButton onClick={handleCreateMeetup} />
      </div>
    </div>
  );
}
