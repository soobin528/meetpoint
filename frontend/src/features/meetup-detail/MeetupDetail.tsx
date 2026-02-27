import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetupKeys, AbortRequestError } from '@/shared/api';
import { ApiError } from '@/shared/api';
import { fetchMeetupDetail, joinMeetup, leaveMeetup, finishMeetup, cancelMeetup } from '@/features/meetup/api';
import type { MeetupDetailOut, MeetupResponse, MeetupStatus } from '@/types';
import { StatusBadge } from './StatusBadge';

// TODO: Backend to provide is_host on MeetupDetailOut; until then treat current user as host for UI.
const USE_IS_HOST_FROM_API = false;

interface MeetupDetailProps {
  meetupId: number;
  onClose: () => void;
}

/** Demo user/location for join. Replace with auth + geolocation. */
const DEMO_USER_ID = 1;
const DEMO_LAT = 37.5;
const DEMO_LNG = 127.0;

export function MeetupDetail({ meetupId, onClose }: MeetupDetailProps) {
  const queryClient = useQueryClient();
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { data: meetup, isLoading, error: queryError } = useQuery({
    queryKey: meetupKeys.detail(meetupId),
    queryFn: () => fetchMeetupDetail(meetupId),
  });

  const isHost = USE_IS_HOST_FROM_API ? (meetup?.is_host ?? true) : true;

  const joinMutation = useMutation({
    mutationFn: () => joinMeetup(meetupId, { user_id: DEMO_USER_ID, lat: DEMO_LAT, lng: DEMO_LNG }),
    onSuccess: (data) => {
      // Update detail + all lists with new current_count; then refetch detail for full consistency.
      patchCurrentCount(queryClient, meetupId, data.current_count);
      queryClient.invalidateQueries({ queryKey: meetupKeys.detail(meetupId) });
      setInlineError(null);
    },
    onError: (err) => {
      if (err instanceof AbortRequestError) return;
      setInlineError(err instanceof ApiError ? (err.detail ?? err.message) : (err as Error).message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveMeetup(meetupId, { user_id: DEMO_USER_ID }),
    onSuccess: (data) => {
      patchCurrentCount(queryClient, meetupId, data.current_count);
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
  const canJoinOrLeave = status === 'RECRUITING';
  const canConfirmPoi = status === 'RECRUITING' && isHost;
  const canFinish = status === 'CONFIRMED' && isHost;
  const canCancel = status === 'RECRUITING' && isHost;

  const reasonText = getReasonText(status, isHost);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-lg truncate">{meetup.title}</h2>
        <StatusBadge status={status} />
      </div>
      {meetup.description && (
        <p className="text-sm text-slate-600 mt-1">{meetup.description}</p>
      )}
      <p className="text-sm text-slate-500 mt-1">
        {meetup.current_count} / {meetup.capacity}명
      </p>
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

      {reasonText && (
        <p className="mt-2 text-xs text-slate-500">{reasonText}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canJoinOrLeave && (
          <>
            <button
              type="button"
              className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
            >
              참여
            </button>
            <button
              type="button"
              className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 disabled:opacity-50"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
            >
              참여 취소
            </button>
          </>
        )}
        {canConfirmPoi && (
          <button
            type="button"
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={() => setInlineError('POI 확정은 POI 선택 후 별도 플로우에서 호출됩니다.')}
            disabled
          >
            POI 확정 (준비 중)
          </button>
        )}
        {canFinish && (
          <button
            type="button"
            className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
            onClick={() => finishMutation.mutate()}
            disabled={finishMutation.isPending}
          >
            모임 종료
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            className="px-3 py-1.5 border border-red-400 text-red-700 text-sm rounded hover:bg-red-50 disabled:opacity-50"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            모임 취소
          </button>
        )}
      </div>

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

function getReasonText(status: MeetupStatus, isHost: boolean): string | null {
  if (status === 'CONFIRMED') {
    return '장소가 확정되어 참여/취소가 불가합니다.';
  }
  if (status === 'FINISHED') return '종료된 모임입니다.';
  if (status === 'CANCELED') return '취소된 모임입니다.';
  if (status === 'RECRUITING' && !isHost) {
    return '호스트만 POI 확정·종료·취소할 수 있습니다.';
  }
  return null;
}

function patchCurrentCount(queryClient: ReturnType<typeof useQueryClient>, meetupId: number, currentCount: number) {
  // Detail
  queryClient.setQueryData<MeetupDetailOut | undefined>(meetupKeys.detail(meetupId), (prev) =>
    prev ? { ...prev, current_count: currentCount } : prev
  );
  // Lists
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

