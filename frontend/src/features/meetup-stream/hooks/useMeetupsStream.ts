import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { config } from '@/config';
import {
  applyMidpointUpdated,
  applyMeetupStatusChanged,
  applyPoiConfirmed,
  applyPoiUpdated,
} from '../events';
import type {
  SSEMeetupStatusChanged,
  SSEMidpointUpdated,
  SSEPoiUpdated,
  SSEPoiConfirmed,
} from '@/types/sse';

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
      applyMeetupStatusChanged(queryClient, data);
    });

    es.addEventListener('midpoint_updated', (e: MessageEvent) => {
      const data = parseJsonSafe<SSEMidpointUpdated>(e.data);
      if (!data) return;
      applyMidpointUpdated(queryClient, data);
    });

    es.addEventListener('poi_updated', (e: MessageEvent) => {
      const data = parseJsonSafe<SSEPoiUpdated>(e.data);
      if (!data) return;
      applyPoiUpdated(queryClient, data);
    });

    es.addEventListener('poi_confirmed', (e: MessageEvent) => {
      const data = parseJsonSafe<SSEPoiConfirmed>(e.data);
      if (!data) return;
      applyPoiConfirmed(queryClient, data);
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

