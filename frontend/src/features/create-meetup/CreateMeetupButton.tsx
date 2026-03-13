interface CreateMeetupButtonProps {
  onClick: () => void;
}

/** Floating action button for creating a new meetup. */
export function CreateMeetupButton({ onClick }: CreateMeetupButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-6 right-6 z-[500] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 active:scale-95"
      aria-label="모임 만들기"
    >
      <span className="text-2xl font-light leading-none">+</span>
    </button>
  );
}
