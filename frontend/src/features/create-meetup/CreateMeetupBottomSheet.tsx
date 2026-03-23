import { useState, useCallback } from 'react';
import { useCreateMeetup } from './useCreateMeetup.ts';
import { MEETUP_CATEGORY_LABEL, type MeetupCategory } from '@/types';

const CATEGORY_OPTIONS: MeetupCategory[] = ['STUDY', 'MEAL', 'CAFE_CHAT', 'EXERCISE', 'FREE'];

/** [임시] ?user=1 또는 ?user=2. 없거나 잘못되면 1. */
function getUserIdFromUrl(): number {
  const p = new URLSearchParams(window.location.search);
  const u = p.get('user');
  if (u == null) return 1;
  const n = parseInt(u, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

interface CreateMeetupBottomSheetProps {
  open: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
}

/** Bottom sheet for creating a new meetup. */
export function CreateMeetupBottomSheet({ open, onClose, lat, lng }: CreateMeetupBottomSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MeetupCategory>('FREE');
  const [scheduledAt, setScheduledAt] = useState('');
  const [capacity, setCapacity] = useState(10);

  const handleSuccess = useCallback(() => {
    onClose();
  }, [onClose]);

  const createMutation = useCreateMeetup(handleSuccess);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      description,
      category,
      scheduledAt,
      capacity,
      lat,
      lng,
      hostUserId: getUserIdFromUrl(),
    });
  };

  const inputClass =
    'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

  if (!open) return null;

  return (
    <>
      <div
        className="absolute inset-0 bg-black/30 z-[1000]"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-lg max-h-[55vh] overflow-auto z-[1010]"
        role="dialog"
        aria-label="모임 만들기"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold">Create Meetup</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-800 text-sm underline"
          >
            닫기
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="create-title" className="block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="create-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="모임 제목"
            />
          </div>
          <div>
            <label htmlFor="create-description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="모임 설명 (선택)"
            />
          </div>
          <div>
            <label htmlFor="create-category" className="block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              id="create-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as MeetupCategory)}
              className={inputClass}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {MEETUP_CATEGORY_LABEL[opt]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="create-scheduled-at" className="block text-sm font-medium text-slate-700">
              Scheduled At
            </label>
            <input
              id="create-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="create-capacity" className="block text-sm font-medium text-slate-700">
              Capacity
            </label>
            <input
              id="create-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value) || 1)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Meetup'}
          </button>
        </form>
      </div>
    </>
  );
}
