/**
 * 계층적 Query Key Factory.
 * SSE 캐시 패치 시 동일 키를 사용해 setQueryData 호출.
 */

export const meetupKeys = {
  all: ['meetups'] as const,
  lists: () => [...meetupKeys.all, 'list'] as const,
  list: (bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }) =>
    [...meetupKeys.lists(), bbox] as const,
  details: () => [...meetupKeys.all, 'detail'] as const,
  detail: (id: number) => [...meetupKeys.details(), id] as const,
} as const;

export const poiKeys = {
  all: ['pois'] as const,
  list: (meetupId: number) => [...poiKeys.all, meetupId] as const,
} as const;
