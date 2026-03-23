import { MEETUP_CATEGORY_LABEL, type MeetupCategory } from '@/types';

export type CategoryFilterValue = MeetupCategory | 'ALL';

interface CategoryFilterBarProps {
  selectedCategory: CategoryFilterValue;
  onChange: (category: CategoryFilterValue) => void;
}

const OPTIONS: CategoryFilterValue[] = [
  'ALL',
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

function getLabel(category: CategoryFilterValue): string {
  if (category === 'ALL') return '전체';
  return MEETUP_CATEGORY_LABEL[category];
}

export function CategoryFilterBar({ selectedCategory, onChange }: CategoryFilterBarProps) {
  return (
    <div className="absolute top-3 left-1/2 z-[1100] w-[calc(100%-1rem)] max-w-[720px] -translate-x-1/2 px-1">
      <div className="rounded-full bg-white/95 shadow-sm ring-1 ring-slate-200 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto p-2">
          {OPTIONS.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onChange(category)}
                className={[
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                ].join(' ')}
              >
                {getLabel(category)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

