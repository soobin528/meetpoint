import type { MeetupCategory, MidpointOut } from '@/types';

export interface MockPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
}

const POI_TEMPLATES: Record<string, string[]> = {
  STUDY: ['스터디카페', '도서관', '조용한 카페', '학습 라운지', '코워킹 스페이스'],
  MEAL: ['맛집', '식당', '푸드코트', '한식당', '캐주얼 다이닝'],
  CAFE_CHAT: ['카페', '디저트 카페', '브런치 카페', '로스터리 카페', '대화하기 좋은 카페'],
  EXERCISE: ['공원', '헬스장', '체육시설', '러닝 코스', '실내 스포츠센터'],
  DRINK: ['포차', '술집', '와인바', '펍', '칵테일 바'],
  OUTDOOR: ['공원', '산책로', '야외광장', '한강공원', '피크닉 스팟'],
  CULTURE: ['영화관', '전시관', '공연장', '미술관', '문화센터'],
  SHOPPING: ['쇼핑몰', '백화점', '편집샵', '아울렛', '플리마켓'],
  FREE: ['추천 장소', '인기 장소', '모임 장소', '핫플레이스', '근처 스팟'],
};

const OFFSETS: Array<[number, number]> = [
  [0.0012, 0.0007],
  [0.0008, -0.0011],
  [-0.0011, 0.0009],
  [-0.0009, -0.0013],
  [0.0015, -0.0004],
];

function normalizeCategory(category?: MeetupCategory): MeetupCategory {
  return category ?? 'FREE';
}

export function getMockPois(midpoint: MidpointOut, meetupCategory?: MeetupCategory): MockPoi[] {
  const category = normalizeCategory(meetupCategory);
  const names = POI_TEMPLATES[category] ?? POI_TEMPLATES.FREE;

  return OFFSETS.map(([dLat, dLng], idx) => {
    const lat = Number((midpoint.lat + dLat).toFixed(6));
    const lng = Number((midpoint.lng + dLng).toFixed(6));
    return {
      id: `${category}-${idx + 1}`,
      name: names[idx] ?? `추천 장소 ${idx + 1}`,
      subtitle: `${names[0]} 기반 추천`,
      lat,
      lng,
    };
  });
}

