/**
 * SSE 이벤트별 캐시 패치 로직.
 * queryClient는 useMeetupStream에서 주입.
 */

import type { QueryClient } from '@tanstack/react-query';
import { meetupKeys, poiKeys } from '@/shared/api';
import type { MeetupDetailOut, MeetupResponse } from '@/types';
import type { SSEMidpointUpdated, SSEPoiUpdated, SSEPoiConfirmed, SSEMeetupStatusChanged } from '@/types/sse';

function patchDetail(
  queryClient: QueryClient,
  meetupId: number,
  patch: Partial<MeetupDetailOut>
): void {
  const key = meetupKeys.detail(meetupId);
  const prev = queryClient.getQueryData<MeetupDetailOut>(key);
  if (prev) {
    queryClient.setQueryData<MeetupDetailOut>(key, { ...prev, ...patch });
  }
}

/** midpoint_updated: detail 캐시의 midpoint만 갱신 */
export function applyMidpointUpdated(queryClient: QueryClient, data: SSEMidpointUpdated): void {
  patchDetail(queryClient, data.meetup_id, { midpoint: data.midpoint });
}

/** poi_updated: detail의 midpoint + pois 리스트 캐시 */
export function applyPoiUpdated(queryClient: QueryClient, data: SSEPoiUpdated): void {
  patchDetail(queryClient, data.meetup_id, { midpoint: data.midpoint });
  queryClient.setQueryData(poiKeys.list(data.meetup_id), data.pois);
}

/** poi_confirmed: detail에 confirmed_poi + status=CONFIRMED */
export function applyPoiConfirmed(queryClient: QueryClient, data: SSEPoiConfirmed): void {
  const confirmed_poi = {
    name: data.poi.name,
    lat: data.poi.lat,
    lng: data.poi.lng,
    address: data.poi.address,
    confirmed_at: data.ts,
  };
  patchDetail(queryClient, data.meetup_id, {
    confirmed_poi,
    status: 'CONFIRMED',
  });
}

/** meetup_status_changed: detail + 모든 list 캐시에서 해당 id의 status 갱신 */
export function applyMeetupStatusChanged(queryClient: QueryClient, data: SSEMeetupStatusChanged): void {
  const { meetup_id, status } = data;
  patchDetail(queryClient, meetup_id, { status: status as MeetupDetailOut['status'] });

  const listQueries = queryClient.getQueriesData<MeetupResponse[]>({ queryKey: meetupKeys.lists() });
  listQueries.forEach(([queryKey, list]) => {
    if (!Array.isArray(list)) return;
    const updated = list.map((m) =>
      m.id === meetup_id ? { ...m, status: status as MeetupResponse['status'] } : m
    );
    queryClient.setQueryData(queryKey, updated);
  });
}
