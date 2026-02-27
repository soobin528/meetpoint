import type { MeetupStatus } from '@/types';
import clsx from 'clsx';

const STATUS_LABELS: Record<MeetupStatus, string> = {
  RECRUITING: '모집 중',
  CONFIRMED: '장소 확정',
  FINISHED: '종료',
  CANCELED: '취소됨',
};

const STATUS_STYLES: Record<MeetupStatus, string> = {
  RECRUITING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  FINISHED: 'bg-slate-200 text-slate-700',
  CANCELED: 'bg-red-100 text-red-800',
};

interface StatusBadgeProps {
  status: MeetupStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
