/**
 * 백엔드 MeetupResponse / MeetupDetailOut 등과 1:1 매핑.
 * API 계약 변경 시 여기만 수정.
 */

export type MeetupStatus = 'RECRUITING' | 'CONFIRMED' | 'FINISHED' | 'CANCELED';
export type MeetupCategory = 'STUDY' | 'MEAL' | 'CAFE_CHAT' | 'EXERCISE' | 'DRINK' | 'OUTDOOR' | 'CULTURE' | 'SHOPPING' | 'FREE';

export const MEETUP_CATEGORY_LABEL: Record<MeetupCategory, string> = {
  STUDY: '스터디',
  MEAL: '식사',
  CAFE_CHAT: '카페',
  EXERCISE: '운동',
  DRINK: '술',
  OUTDOOR: '야외',
  CULTURE: '문화',
  SHOPPING: '쇼핑',
  FREE: '자유',
};

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
  category?: MeetupCategory;
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
  category?: MeetupCategory;
  title: string;
  description: string | null;
  capacity: number;
  current_count: number;
  lat: number;
  lng: number;
  midpoint: MidpointOut | null;
  confirmed_poi: ConfirmedPoiOut | null;
  distance_km: number | null;
  /** Host can confirm POI, finish, cancel. */
  is_host?: boolean;
  /** Whether current user is already participating in this meetup. */
  is_participating?: boolean;
}
