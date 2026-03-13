import { apiGet, apiPost, apiDelete } from '@/shared/api';
import type { MeetupDetailOut, MeetupResponse } from '@/types';

const BASE = '/meetups';

export async function createMeetup(body: {
  title: string;
  description?: string;
  capacity: number;
  lat: number;
  lng: number;
}): Promise<MeetupResponse> {
  return apiPost<MeetupResponse>(BASE, body);
}

export async function fetchMeetupsByBbox(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  init?: { signal?: AbortSignal }
): Promise<MeetupResponse[]> {
  const params = new URLSearchParams({
    min_lat: String(minLat),
    min_lng: String(minLng),
    max_lat: String(maxLat),
    max_lng: String(maxLng),
  });
  return apiGet<MeetupResponse[]>(`${BASE}/bbox?${params}`, init);
}

export async function fetchMeetupDetail(id: number, userId?: number): Promise<MeetupDetailOut> {
  const params = userId != null ? `?${new URLSearchParams({ user_id: String(userId) })}` : '';
  return apiGet<MeetupDetailOut>(`${BASE}/${id}${params}`);
}

export async function confirmPoi(
  meetupId: number,
  body: { name: string; lat: number; lng: number; address: string }
): Promise<{ message: string; status: string; poi: unknown; confirmed_at: string | null }> {
  return apiPost(`${BASE}/${meetupId}/confirm-poi`, body);
}

export async function finishMeetup(meetupId: number): Promise<{ message: string; status: string }> {
  return apiPost(`${BASE}/${meetupId}/finish`);
}

export async function cancelMeetup(meetupId: number): Promise<{ message: string; status: string }> {
  return apiPost(`${BASE}/${meetupId}/cancel`);
}

export async function joinMeetup(
  meetupId: number,
  body: { user_id: number; lat: number; lng: number }
): Promise<{ message: string; current_count: number }> {
  return apiPost(`${BASE}/${meetupId}/join`, body);
}

export async function leaveMeetup(
  meetupId: number,
  body: { user_id: number }
): Promise<{ message: string; current_count: number }> {
  return apiDelete(`${BASE}/${meetupId}/leave`, body);
}
