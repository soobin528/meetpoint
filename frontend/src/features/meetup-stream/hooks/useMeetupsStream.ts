import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { config } from '@/config';
import { meetupKeys } from '@/shared/api';
import type { MeetupDetailOut, MeetupResponse } from '@/types';
import type { SSEMeetupStatusChanged, SSEMidpointUpdated } from '@/types/sse';

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Optional global meetups SSE stream (e.g. /meetups/stream).
 * If VITE_MEETUPS_STREAM_URL is not set, this hook is a no-op.
 */
export function useMeetupsStream(): void {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = config.meetupsStreamUrl;
    if (!url) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('meetup_status_changed', (e: MessageEvent) => {
      const data = parseJsonSafe<SSEMeetupStatusChanged>(e.data);
      if (!data) return;
      const { meetup_id, status } = data;
      // Detail
      queryClient.setQueryData<MeetupDetailOut | undefined>(meetupKeys.detail(meetup_id), (prev) =>
        prev ? { ...prev, status: status as MeetupDetailOut['status'] } : prev
      );
      // Lists
      const lists = queryClient.getQueriesData<MeetupResponse[]>({ queryKey: meetupKeys.lists() });
      lists.forEach(([key, list]) => {
        if (!Array.isArray(list)) return;
        const updated = list.map((m) =>
          m.id === meetup_id ? { ...m, status: status as MeetupResponse['status'] } : m
        );
        queryClient.setQueryData(key, updated);
      });
    });

    es.addEventListener('midpoint_updated', (e: MessageEvent) => {
      const data = parseJsonSafe<SSEMidpointUpdated>(e.data);
      if (!data) return;
      const { meetup_id, midpoint } = data;
      queryClient.setQueryData<MeetupDetailOut | undefined>(meetupKeys.detail(meetup_id), (prev) =>
        prev ? { ...prev, midpoint: midpoint ?? null } : prev
      );
    });

    es.onerror = () => {
      // For now, let browser reconnect automatically; this is best-effort optional stream.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [queryClient]);
}

