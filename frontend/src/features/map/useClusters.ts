import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { MeetupResponse } from '@/types';
import type { BBox } from './types';

export interface ClusterPoint {
  type: 'cluster';
  id: string;
  lat: number;
  lng: number;
  count: number;
  expansionZoom: number;
}

export interface MeetupPoint {
  type: 'meetup';
  id: number;
  lat: number;
  lng: number;
  meetup: MeetupResponse;
}

export type MapPoint = ClusterPoint | MeetupPoint;

const indexOptions: { radius: number; maxZoom: number } = {
  radius: 60,
  maxZoom: 16,
};

/**
 * Returns clusters + individual meetups for current bounds and zoom.
 * Used to render cluster markers (with count) and single meetup markers; cluster click zooms in.
 */
export function useClusters(
  meetups: MeetupResponse[],
  bbox: BBox,
  zoom: number
): MapPoint[] {
  const index = useMemo(() => {
    const sc = new Supercluster<MeetupResponse, MeetupResponse>(indexOptions);
    const points = meetups.map((m) => ({
      type: 'Point' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [m.lng, m.lat] as [number, number],
      },
      properties: m,
    }));
    sc.load(points);
    return sc;
  }, [meetups]);

  return useMemo(() => {
    const [minLng, minLat, maxLng, maxLat] = [
      bbox.minLng,
      bbox.minLat,
      bbox.maxLng,
      bbox.maxLat,
    ];
    const clusters = index.getClusters([minLng, minLat, maxLng, maxLat], zoom);
    type ClusterFeature = {
      geometry: { coordinates: [number, number] };
      properties: MeetupResponse & { cluster?: boolean; cluster_id?: number; point_count?: number };
    };
    return (clusters as ClusterFeature[]).map((c) => {
      const [lng, lat] = c.geometry.coordinates;
      const props = c.properties as MeetupResponse & { cluster?: boolean; cluster_id?: number; point_count?: number };
      if (props.cluster && props.point_count != null) {
        const expansionZoom = index.getClusterExpansionZoom(props.cluster_id!);
        return {
          type: 'cluster' as const,
          id: String(props.cluster_id),
          lat,
          lng,
          count: props.point_count,
          expansionZoom,
        };
      }
      const meetup = c.properties as MeetupResponse;
      return {
        type: 'meetup' as const,
        id: meetup.id,
        lat,
        lng,
        meetup,
      };
    });
  }, [index, bbox, zoom]);
}
