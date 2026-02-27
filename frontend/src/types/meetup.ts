/**
 * 백엔드 MeetupResponse / MeetupDetailOut 등과 1:1 매핑.
 * API 계약 변경 시 여기만 수정.
 */

export type MeetupStatus = 'RECRUITING' | 'CONFIRMED' | 'FINISHED' | 'CANCELED';

export interface MidpointOut {
  lat: number;
  lng: number;
}

export interface ConfirmedPoiOut {
  name: string;
  lat: number;
  lng: number;
  address: string;
  confirmed_at: string; // ISO datetime
}

/** 목록/bbox/nearby 응답 */
export interface MeetupResponse {
  id: number;
  status: MeetupStatus;
  title: string;
  description: string | null;
  capacity: number;
  current_count: number;
  lat: number;
  lng: number;
  midpoint: MidpointOut | null;
  confirmed_poi: ConfirmedPoiOut | null;
  distance_km: number | null;
}

/** GET /meetups/{id} 단건 상세 응답 */
export interface MeetupDetailOut {
  id: number;
  status: MeetupStatus;
  title: string;
  description: string | null;
  capacity: number;
  current_count: number;
  lat: number;
  lng: number;
  midpoint: MidpointOut | null;
  confirmed_poi: ConfirmedPoiOut | null;
  distance_km: number | null;
  /** Host can confirm POI, finish, cancel. TODO: backend to provide; until then treat as true for UI. */
  is_host?: boolean;
}
