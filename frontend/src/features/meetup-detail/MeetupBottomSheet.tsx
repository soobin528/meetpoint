import { ReactNode } from 'react';
import clsx from 'clsx';

interface MeetupBottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/** Simple bottom sheet: slides up from bottom, backdrop optional. */
export function MeetupBottomSheet({ open, onClose, children, className }: MeetupBottomSheetProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="absolute inset-0 bg-black/30 z-10"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={clsx(
          'absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-lg max-h-[55vh] overflow-auto z-20',
          className
        )}
        role="dialog"
        aria-label="모임 상세"
      >
        {children}
      </div>
    </>
  );
}
