import type { MeetupActionAvailability } from '@/features/meetup/logic/actionAvailability';

interface Props {
  availability: MeetupActionAvailability;
  loadingJoin?: boolean;
  loadingLeave?: boolean;
  loadingConfirm?: boolean;
  loadingFinish?: boolean;
  loadingCancel?: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onConfirmPlace: () => void;
  onFinish: () => void;
  onCancel: () => void;
}

export function MeetupActionButtons({
  availability,
  loadingJoin,
  loadingLeave,
  loadingConfirm,
  loadingFinish,
  loadingCancel,
  onJoin,
  onLeave,
  onConfirmPlace,
  onFinish,
  onCancel,
}: Props) {
  const { canJoin, canLeave, canConfirmPlace, canFinish, canCancel, reason } = availability;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {canJoin && (
        <button
          type="button"
          className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          onClick={onJoin}
          disabled={loadingJoin}
        >
          참여
        </button>
      )}

      {canLeave && (
        <button
          type="button"
          className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={onLeave}
          disabled={loadingLeave}
        >
          참여 취소
        </button>
      )}

      {canConfirmPlace && (
        <button
          type="button"
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          onClick={onConfirmPlace}
          disabled={loadingConfirm}
        >
          장소 확정
        </button>
      )}

      {canFinish && (
        <button
          type="button"
          className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
          onClick={onFinish}
          disabled={loadingFinish}
        >
          모임 종료
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          className="px-3 py-1.5 rounded border border-red-400 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50"
          onClick={onCancel}
          disabled={loadingCancel}
        >
          모임 취소
        </button>
      )}

      {reason && (
        <p className="mt-2 w-full text-xs text-slate-500">{reason}</p>
      )}
    </div>
  );
}

