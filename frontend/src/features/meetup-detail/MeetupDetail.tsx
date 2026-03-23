import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetupKeys, AbortRequestError, ApiError } from '@/shared/api';
import { fetchMeetupDetail, joinMeetup, leaveMeetup, finishMeetup, cancelMeetup } from '@/features/meetup/api';
import { MEETUP_CATEGORY_LABEL, type MeetupDetailOut, type MeetupResponse, type MeetupStatus } from '@/types';
import { StatusBadge } from '@/features/meetup/components/StatusBadge';
import { getMeetupActionAvailability } from '@/features/meetup/logic/actionAvailability';
import { MeetupActionButtons } from '@/features/meetup/components/MeetupActionButtons';

interface MeetupDetailProps {
  meetupId: number;
  onClose: () => void;
}

/** Demo user/location for join. Replace with auth + geolocation. */
const DEMO_LAT = 37.5;
const DEMO_LNG = 127.0;

/** [임시] ?user=1 또는 ?user=2 로 두 사용자 테스트. 없거나 잘못되면 1. */
function getUserIdFromUrl(): number {
  const p = new URLSearchParams(window.location.search);
  const u = p.get('user');
  if (u == null) return 1;
  const n = parseInt(u, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function MeetupDetail({ meetupId, onClose }: MeetupDetailProps) {
  const queryClient = useQueryClient();
  const [inlineError, setInlineError] = useState<string | null>(null);
  const userId = getUserIdFromUrl();

  const { data: meetup, isLoading, error: queryError } = useQuery({
    queryKey: meetupKeys.detail(meetupId),
    queryFn: () => fetchMeetupDetail(meetupId, userId),
  });

  const isHost = !!meetup?.is_host;
  const isParticipating = !!meetup?.is_participating;

  const joinMutation = useMutation({
    mutationFn: () => joinMeetup(meetupId, { user_id: userId, lat: DEMO_LAT, lng: DEMO_LNG }),
    onSuccess: (data) => {
      // Update detail + all lists with new current_count; then refetch detail for full consistency.
      patchCurrentCount(queryClient, meetupId, data.current_count, { is_participating: true });
      queryClient.invalidateQueries({ queryKey: meetupKeys.detail(meetupId) });
      setInlineError(null);
    },
    onError: (err) => {
      if (err instanceof AbortRequestError) return;
      setInlineError(err instanceof ApiError ? (err.detail ?? err.message) : (err as Error).message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveMeetup(meetupId, { user_id: userId }),
    onSuccess: (data) => {
      patchCurrentCount(queryClient, meetupId, data.current_count, { is_participating: false });
      queryClient.invalidateQueries({ queryKey: meetupKeys.detail(meetupId) });
      setInlineError(null);
    },
    onError: (err) => {
      if (err instanceof AbortRequestError) return;
      setInlineError(err instanceof ApiError ? (err.detail ?? err.message) : (err as Error).message);
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => finishMeetup(meetupId),
    onSuccess: (data) => {
      patchStatus(queryClient, meetupId, data.status as MeetupStatus);
      queryClient.invalidateQueries({ queryKey: meetupKeys.detail(meetupId) });
      setInlineError(null);
    },
    onError: (err) => {
      if (err instanceof AbortRequestError) return;
      setInlineError(err instanceof ApiError ? (err.detail ?? err.message) : (err as Error).message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelMeetup(meetupId),
    onSuccess: (data) => {
      patchStatus(queryClient, meetupId, data.status as MeetupStatus);
      queryClient.invalidateQueries({ queryKey: meetupKeys.detail(meetupId) });
      setInlineError(null);
    },
    onError: (err) => {
      if (err instanceof AbortRequestError) return;
      setInlineError(err instanceof ApiError ? (err.detail ?? err.message) : (err as Error).message);
    },
  });

  if (isLoading || !meetup) {
    return (
      <div className="p-4">
        <p className="text-slate-500">로딩 중…</p>
        <button type="button" className="mt-2 text-sm text-slate-600 underline" onClick={onClose}>
          닫기
        </button>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="p-4">
        <p className="text-red-600">모임을 불러올 수 없습니다.</p>
        <button type="button" className="mt-2 text-sm text-slate-600 underline" onClick={onClose}>
          닫기
        </button>
      </div>
    );
  }

  const status = meetup.status;
  const availability = getMeetupActionAvailability(status, isHost, isParticipating);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-lg font-semibold">{meetup.title}</h2>
        <StatusBadge status={status} />
      </div>
      {meetup.category && (
        <p className="text-sm text-slate-500 mt-1">카테고리: {MEETUP_CATEGORY_LABEL[meetup.category]}</p>
      )}
      {meetup.description && (
        <p className="text-sm text-slate-600 mt-1">{meetup.description}</p>
      )}
      <p className="text-sm text-slate-500 mt-1">
        {meetup.current_count} / {meetup.capacity}명
      </p>
      <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
        <span className="font-medium">🎯 중간지점</span>
        {meetup.midpoint ? (
          <>
            <br />
            <span className="text-slate-600">현재 참여자 기준 중간지점이에요</span>
            <br />
            <span className="text-slate-600">
              Latitude {meetup.midpoint.lat.toFixed(6)} / Longitude {meetup.midpoint.lng.toFixed(6)}
            </span>
          </>
        ) : (
          <>
            <br />
            <span className="text-slate-600">참여자가 더 모이면 중간지점이 표시돼요</span>
          </>
        )}
      </div>
      {meetup.confirmed_poi && (
        <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
          <span className="font-medium">확정 장소</span>: {meetup.confirmed_poi.name}
          <br />
          <span className="text-slate-600">{meetup.confirmed_poi.address}</span>
        </div>
      )}

      {inlineError && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded" role="alert">
          {inlineError}
        </div>
      )}

      <MeetupActionButtons
        availability={availability}
        loadingJoin={joinMutation.isPending}
        loadingLeave={leaveMutation.isPending}
        loadingConfirm={false}
        loadingFinish={finishMutation.isPending}
        loadingCancel={cancelMutation.isPending}
        onJoin={() => joinMutation.mutate()}
        onLeave={() => leaveMutation.mutate()}
        onConfirmPlace={() =>
          setInlineError('POI 확정은 POI 선택 후 별도 플로우에서 호출됩니다.')
        }
        onFinish={() => finishMutation.mutate()}
        onCancel={() => cancelMutation.mutate()}
      />

      <button
        type="button"
        className="mt-4 text-sm text-slate-600 underline"
        onClick={onClose}
      >
        닫기
      </button>
    </div>
  );
}

function patchCurrentCount(
  queryClient: ReturnType<typeof useQueryClient>,
  meetupId: number,
  currentCount: number,
  detailOverrides?: Partial<Pick<MeetupDetailOut, 'is_participating'>>
) {
  queryClient.setQueryData<MeetupDetailOut | undefined>(meetupKeys.detail(meetupId), (prev) =>
    prev ? { ...prev, current_count: currentCount, ...detailOverrides } : prev
  );
  const lists = queryClient.getQueriesData<MeetupResponse[]>({ queryKey: meetupKeys.lists() });
  lists.forEach(([key, list]) => {
    if (!Array.isArray(list)) return;
    const updated = list.map((m) => (m.id === meetupId ? { ...m, current_count: currentCount } : m));
    queryClient.setQueryData(key, updated);
  });
}

function patchStatus(queryClient: ReturnType<typeof useQueryClient>, meetupId: number, status: MeetupStatus) {
  queryClient.setQueryData<MeetupDetailOut | undefined>(meetupKeys.detail(meetupId), (prev) =>
    prev ? { ...prev, status } : prev
  );
  const lists = queryClient.getQueriesData<MeetupResponse[]>({ queryKey: meetupKeys.lists() });
  lists.forEach(([key, list]) => {
    if (!Array.isArray(list)) return;
    const updated = list.map((m) => (m.id === meetupId ? { ...m, status } : m));
    queryClient.setQueryData(key, updated);
  });
}

