/**
 * SSE 이벤트 payload 타입.
 * event: midpoint_updated | poi_updated | poi_confirmed | meetup_status_changed
 */

export interface SSEMidpointUpdated {
  type: 'midpoint_updated';
  meetup_id: number;
  midpoint: { lat: number; lng: number } | null;
  ts: string;
}

export interface SSEPoiUpdated {
  meetup_id: number;
  midpoint: { lat: number; lng: number } | null;
  pois: Array<{ place_name?: string; lat?: number; lng?: number; [key: string]: unknown }>;
  ts: string;
}

export interface SSEPoiConfirmed {
  type: 'poi_confirmed';
  meetup_id: number;
  poi: { name: string; lat: number; lng: number; address: string };
  ts: string;
}

export interface SSEMeetupStatusChanged {
  type: 'meetup_status_changed';
  meetup_id: number;
  status: string;
  ts: string;
}

export type SSEPayload =
  | SSEMidpointUpdated
  | SSEPoiUpdated
  | SSEPoiConfirmed
  | SSEMeetupStatusChanged;
