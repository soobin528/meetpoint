import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { config } from '@/config';
import {
  applyMidpointUpdated,
  applyPoiUpdated,
  applyPoiConfirmed,
  applyMeetupStatusChanged,
} from '../events';
import type { SSEMidpointUpdated, SSEPoiConfirmed, SSEMeetupStatusChanged } from '@/types/sse';
import type { SSEPoiUpdated } from '@/types/sse';

const STREAM_PATH = '/meetups';
const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * SSE stream for a single meetup. Patches TanStack Query cache on events.
 * Reconnects on error/close with exponential backoff; cleanup on unmount.
 */
export function useMeetupStream(meetupId: number | null): void {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const connectionIdRef = useRef(0);

  useEffect(() => {
    if (meetupId == null || meetupId <= 0) return;

    const connectionId = ++connectionIdRef.current;
    const debug = config.debugSse;
    const base = config.streamBaseUrl || '';
    const url = `${base}${STREAM_PATH}/${meetupId}/midpoint/stream`;

    function connect() {
      if (connectionIdRef.current !== connectionId) {
        return;
      }
      const es = new EventSource(url);
      eventSourceRef.current = es;
      if (debug) {
        // eslint-disable-next-line no-console
        console.debug('[SSE] open meetup stream', { meetupId, connectionId });
      }

      es.addEventListener('midpoint_updated', (e: MessageEvent) => {
        const data = parseJsonSafe<SSEMidpointUpdated>(e.data);
        if (data) applyMidpointUpdated(queryClient, data);
      });

      es.addEventListener('poi_updated', (e: MessageEvent) => {
        const data = parseJsonSafe<SSEPoiUpdated>(e.data);
        if (data) applyPoiUpdated(queryClient, data);
      });

      es.addEventListener('poi_confirmed', (e: MessageEvent) => {
        const data = parseJsonSafe<SSEPoiConfirmed>(e.data);
        if (data) applyPoiConfirmed(queryClient, data);
      });

      es.addEventListener('meetup_status_changed', (e: MessageEvent) => {
        const data = parseJsonSafe<SSEMeetupStatusChanged>(e.data);
        if (data) applyMeetupStatusChanged(queryClient, data);
      });

      es.onopen = () => {
        attemptRef.current = 0;
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        const delay = Math.min(
          MIN_RECONNECT_MS * 2 ** attemptRef.current,
          MAX_RECONNECT_MS
        );
        attemptRef.current += 1;
        if (connectionIdRef.current !== connectionId) {
          return;
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (connectionIdRef.current !== connectionId) return;
          if (debug) {
            // eslint-disable-next-line no-console
            console.debug('[SSE] reconnect meetup stream', { meetupId, connectionId, delay });
          }
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        if (config.debugSse) {
          // eslint-disable-next-line no-console
          console.debug('[SSE] close meetup stream', { meetupId, connectionId });
        }
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [meetupId, queryClient]);
}
