declare module 'supercluster' {
  interface Options<P = unknown, C = unknown> {
    radius?: number;
    maxZoom?: number;
    minZoom?: number;
    minPoints?: number;
    extent?: number;
    nodeSize?: number;
  }
  export default class Supercluster<P = unknown, C = unknown> {
    constructor(options?: Options<P, C>);
    load(points: Array<{ type: 'Point'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: P }>): this;
    getClusters(bbox: [number, number, number, number], zoom: number): Array<{
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: (P & { cluster?: boolean; cluster_id?: number; point_count?: number }) | P;
    }>;
    getClusterExpansionZoom(clusterId: number): number;
  }
}
