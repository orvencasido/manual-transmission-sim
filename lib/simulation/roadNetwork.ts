/**
 * Road Vector Network & Spatial Collision Engine
 * Manual Driving Trainer — Phase 13.1 & 13.2
 *
 * Implements vector road network representation, spatial grid indexing,
 * metric coordinate projection, and perpendicular centerline distance checks.
 */

export interface RoadSegmentDefinition {
  id: string;
  name: string;
  highway: string;
  width?: number;
  coordinates: [number, number][]; // [lat, lon][]
}

export interface NearestRoadResult {
  roadId: string;
  roadName: string;
  highway: string;
  roadWidth: number;
  halfWidth: number;
  distanceToCenterline: number; // d_perp in meters
  distanceToCurb: number; // distance from vehicle center to curb (halfWidth - d_perp)
  carMargin: number; // clearance from vehicle outer edge to curb (distanceToCurb - carHalfWidth)
  isInsideCorridor: boolean; // whether vehicle center is within halfWidth
  curbContact: boolean; // whether car edge contacted/penetrated curb boundary
  closestPoint: { latitude: number; longitude: number };
  // Inward normal unit vector pointing from curb/vehicle toward road centerline (x = East, y = North)
  normal: { x: number; y: number };
  // Tangent unit vector along road direction (x = East, y = North)
  tangent: { x: number; y: number };
  segmentIndex: number;
  t: number; // projection scalar 0..1
}

export interface IndexedSegment {
  roadId: string;
  roadName: string;
  highway: string;
  width: number;
  segmentIndex: number;
  latA: number;
  lonA: number;
  latB: number;
  lonB: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export const CAR_HALF_WIDTH_METERS = 0.75; // Standard subcompact sedan clearance (1.5m body width)
export const SHOULDER_BUFFER_METERS = 2.5; // Generous shoulder margin for realistic road corridors & cornering
export const METERS_PER_LAT_DEGREE = 111139;

export const DEFAULT_ROAD_WIDTHS: Record<string, number> = {
  motorway: 18.0,
  trunk: 18.0,
  primary: 16.0,
  secondary: 12.0,
  tertiary: 9.0,
  residential: 7.5,
  unclassified: 7.0,
  service: 6.0,
  alley: 6.0,
};

export function getRoadWidth(highway: string): number {
  return DEFAULT_ROAD_WIDTHS[highway] ?? 7.5;
}

/**
 * Built-in Lucena City road dataset embedded synchronously to ensure instant,
 * 100% offline deterministic execution across all environments.
 */
export const DEFAULT_LUCENA_ROADS: RoadSegmentDefinition[] = [
  {
    id: 'maharlika_hwy_main',
    name: 'Maharlika Highway',
    highway: 'primary',
    width: 15.0,
    coordinates: [
      [13.9550, 121.5750],
      [13.9520, 121.5830],
      [13.9480, 121.5910],
      [13.9440, 121.6000],
      [13.9400, 121.6080],
      [13.9370, 121.6140],
      [13.9350, 121.6210],
      [13.9335, 121.6270],
      [13.9315, 121.6350],
      [13.9295, 121.6420],
      [13.9280, 121.6500],
    ],
  },
  {
    id: 'lucena_diversion_rd',
    name: 'Lucena Diversion Road',
    highway: 'secondary',
    width: 13.0,
    coordinates: [
      [13.9585, 121.5850],
      [13.9565, 121.5930],
      [13.9540, 121.6010],
      [13.9530, 121.6045],
      [13.9515, 121.6110],
      [13.9490, 121.6190],
      [13.9460, 121.6270],
      [13.9425, 121.6360],
      [13.9380, 121.6440],
      [13.9315, 121.6500],
    ],
  },
  {
    id: 'quezon_ave_north',
    name: 'Quezon Avenue',
    highway: 'primary',
    width: 14.0,
    coordinates: [
      [13.9440, 121.6000],
      [13.9410, 121.6030],
      [13.9380, 121.6070],
      [13.9355, 121.6110],
      [13.9335, 121.6140],
      [13.9314, 121.6172],
      [13.9290, 121.6200],
      [13.9260, 121.6235],
      [13.9230, 121.6265],
    ],
  },
  {
    id: 'capitol_perez_loop',
    name: 'Perez Park & Capitol Loop',
    highway: 'secondary',
    width: 11.0,
    coordinates: [
      [13.9314, 121.6172],
      [13.9325, 121.6165],
      [13.9335, 121.6175],
      [13.9328, 121.6190],
      [13.9310, 121.6185],
      [13.9300, 121.6175],
      [13.9314, 121.6172],
    ],
  },
  {
    id: 'merchan_st',
    name: 'Merchan Street',
    highway: 'residential',
    width: 10.0,
    coordinates: [
      [13.9270, 121.6135],
      [13.9295, 121.6155],
      [13.9314, 121.6172],
      [13.9338, 121.6192],
      [13.9360, 121.6210],
    ],
  },
  {
    id: 'enriquez_st',
    name: 'Enriquez Street',
    highway: 'residential',
    width: 10.0,
    coordinates: [
      [13.9265, 121.6145],
      [13.9290, 121.6165],
      [13.9315, 121.6185],
      [13.9340, 121.6205],
      [13.9365, 121.6225],
    ],
  },
  {
    id: 'juarez_st',
    name: 'Juarez Street',
    highway: 'residential',
    width: 10.0,
    coordinates: [
      [13.9260, 121.6155],
      [13.9285, 121.6175],
      [13.9310, 121.6195],
      [13.9335, 121.6215],
      [13.9355, 121.6232],
    ],
  },
  {
    id: 'cabana_st',
    name: 'Cabana Street',
    highway: 'residential',
    width: 9.5,
    coordinates: [
      [13.9255, 121.6165],
      [13.9280, 121.6185],
      [13.9305, 121.6205],
      [13.9330, 121.6225],
    ],
  },
  {
    id: 'profugo_st',
    name: 'Profugo Street',
    highway: 'residential',
    width: 9.5,
    coordinates: [
      [13.9340, 121.6130],
      [13.9325, 121.6150],
      [13.9314, 121.6172],
      [13.9300, 121.6190],
      [13.9285, 121.6210],
    ],
  },
  {
    id: 'allarey_st',
    name: 'Allarey Street',
    highway: 'residential',
    width: 10.0,
    coordinates: [
      [13.9350, 121.6140],
      [13.9335, 121.6160],
      [13.9320, 121.6180],
      [13.9305, 121.6200],
      [13.9290, 121.6220],
    ],
  },
  {
    id: 'gomez_st',
    name: 'Gomez Street',
    highway: 'residential',
    width: 10.0,
    coordinates: [
      [13.9360, 121.6150],
      [13.9345, 121.6170],
      [13.9330, 121.6190],
      [13.9315, 121.6210],
      [13.9300, 121.6230],
    ],
  },
  {
    id: 'hermana_fausta_st',
    name: 'Hermana Fausta Street',
    highway: 'residential',
    width: 9.5,
    coordinates: [
      [13.9330, 121.6120],
      [13.9315, 121.6140],
      [13.9300, 121.6160],
      [13.9285, 121.6180],
      [13.9270, 121.6200],
    ],
  },
  {
    id: 'dalahican_port_rd',
    name: 'Dalahican Port Road',
    highway: 'secondary',
    width: 13.0,
    coordinates: [
      [13.9230, 121.6265],
      [13.9200, 121.6275],
      [13.9165, 121.6285],
      [13.9130, 121.6290],
      [13.9100, 121.6300],
    ],
  },
  {
    id: 'grand_central_terminal_rd',
    name: 'Grand Central Terminal Access Road',
    highway: 'tertiary',
    width: 11.0,
    coordinates: [
      [13.9530, 121.6045],
      [13.9545, 121.6055],
      [13.9555, 121.6040],
      [13.9540, 121.6025],
      [13.9530, 121.6045],
    ],
  },
  {
    id: 'route_607_lucena_tayabas',
    name: 'Lucena-Tayabas Road (Route 607)',
    highway: 'primary',
    width: 14.0,
    coordinates: [
      [13.9575, 121.5975],
      [13.9620, 121.5985],
      [13.9680, 121.6000],
      [13.9750, 121.6010],
      [13.9830, 121.6005],
      [13.9920, 121.5990],
      [14.0010, 121.5980],
      [14.0110, 121.5970],
      [14.0195, 121.5960],
      [14.0225, 121.5950],
      [14.0256, 121.5944],
    ],
  },
  {
    id: 'tayabas_downtown_loop',
    name: 'Tayabas Heritage & Plaza Loop',
    highway: 'secondary',
    width: 12.0,
    coordinates: [
      [14.0225, 121.5950],
      [14.0248, 121.5938],
      [14.0265, 121.5925],
      [14.0285, 121.5910],
      [14.0278, 121.5950],
      [14.0256, 121.5944],
      [14.0240, 121.5960],
      [14.0225, 121.5950],
    ],
  },
  {
    id: 'malagonlong_access_rd',
    name: 'Malagonlong Historic Bridge Road',
    highway: 'tertiary',
    width: 11.0,
    coordinates: [
      [14.0195, 121.5960],
      [14.0190, 121.5985],
      [14.0195, 121.6015],
      [14.0205, 121.6040],
    ],
  },
  {
    id: 'tayabas_mountain_route',
    name: 'Tayabas-Mainit Mountain Resort Road',
    highway: 'secondary',
    width: 11.5,
    coordinates: [
      [14.0278, 121.5950],
      [14.0315, 121.5920],
      [14.0350, 121.5880],
      [14.0380, 121.5865],
      [14.0410, 121.5850],
    ],
  },
];

export const DEFAULT_LUCENA_TAYABAS_ROADS = DEFAULT_LUCENA_ROADS;

export class RoadNetwork {
  private static instance: RoadNetwork | null = null;

  private segments: IndexedSegment[] = [];
  private grid: Map<string, number[]> = new Map(); // cellKey -> segment index array
  private readonly cellSize = 0.002; // ~220 meters grid cell size

  constructor(roads: RoadSegmentDefinition[] = DEFAULT_LUCENA_TAYABAS_ROADS) {
    this.loadRoads(roads);
  }

  public static getInstance(): RoadNetwork {
    if (!RoadNetwork.instance) {
      RoadNetwork.instance = new RoadNetwork();
    }
    return RoadNetwork.instance;
  }

  /**
   * Load and index road segments into spatial bucketing structures.
   */
  public loadRoads(roads: RoadSegmentDefinition[]): void {
    this.segments = [];
    this.grid.clear();

    for (const road of roads) {
      const roadWidth = road.width ?? getRoadWidth(road.highway);
      const coords = road.coordinates;
      if (!coords || coords.length < 2) continue;

      for (let i = 0; i < coords.length - 1; i++) {
        const [latA, lonA] = coords[i];
        const [latB, lonB] = coords[i + 1];

        const minLat = Math.min(latA, latB);
        const maxLat = Math.max(latA, latB);
        const minLon = Math.min(lonA, lonB);
        const maxLon = Math.max(lonA, lonB);

        const segIndex = this.segments.length;
        const segment: IndexedSegment = {
          roadId: road.id,
          roadName: road.name,
          highway: road.highway,
          width: roadWidth,
          segmentIndex: i,
          latA,
          lonA,
          latB,
          lonB,
          minLat,
          maxLat,
          minLon,
          maxLon,
        };

        this.segments.push(segment);

        // Spatial grid bucketing: add segment to all overlapping cells
        const padDegrees = 0.0005; // ~50m safety margin around segment bbox
        const minCellX = Math.floor((minLon - padDegrees) / this.cellSize);
        const maxCellX = Math.floor((maxLon + padDegrees) / this.cellSize);
        const minCellY = Math.floor((minLat - padDegrees) / this.cellSize);
        const maxCellY = Math.floor((maxLat + padDegrees) / this.cellSize);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
          for (let cy = minCellY; cy <= maxCellY; cy++) {
            const key = `${cx},${cy}`;
            let bucket = this.grid.get(key);
            if (!bucket) {
              bucket = [];
              this.grid.set(key, bucket);
            }
            bucket.push(segIndex);
          }
        }
      }
    }
  }

  /**
   * Append additional road segments into the active spatial grid without clearing existing roads.
   */
  public appendRoads(newRoads: RoadSegmentDefinition[]): void {
    const existingIds = new Set(this.segments.map((s) => s.roadId));

    for (const road of newRoads) {
      if (existingIds.has(road.id)) continue;
      existingIds.add(road.id);

      const roadWidth = road.width ?? getRoadWidth(road.highway);
      const coords = road.coordinates;
      if (!coords || coords.length < 2) continue;

      for (let i = 0; i < coords.length - 1; i++) {
        const [latA, lonA] = coords[i];
        const [latB, lonB] = coords[i + 1];

        const minLat = Math.min(latA, latB);
        const maxLat = Math.max(latA, latB);
        const minLon = Math.min(lonA, lonB);
        const maxLon = Math.max(lonA, lonB);

        const segIndex = this.segments.length;
        const segment: IndexedSegment = {
          roadId: road.id,
          roadName: road.name,
          highway: road.highway,
          width: roadWidth,
          segmentIndex: i,
          latA,
          lonA,
          latB,
          lonB,
          minLat,
          maxLat,
          minLon,
          maxLon,
        };

        this.segments.push(segment);

        const padDegrees = 0.0005;
        const minCellX = Math.floor((minLon - padDegrees) / this.cellSize);
        const maxCellX = Math.floor((maxLon + padDegrees) / this.cellSize);
        const minCellY = Math.floor((minLat - padDegrees) / this.cellSize);
        const maxCellY = Math.floor((maxLat + padDegrees) / this.cellSize);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
          for (let cy = minCellY; cy <= maxCellY; cy++) {
            const key = `${cx},${cy}`;
            let bucket = this.grid.get(key);
            if (!bucket) {
              bucket = [];
              this.grid.set(key, bucket);
            }
            bucket.push(segIndex);
          }
        }
      }
    }
  }

  private fetchedAreaKeys = new Set<string>();

  /**
   * Dynamically fetch vector road network for any highway across Luzon / Philippines
   * using the OpenStreetMap Overpass API, caching visited bounding boxes in memory.
   */
  public async fetchRoadsAround(lat: number, lon: number, radiusMeters: number = 1200): Promise<void> {
    if (typeof fetch !== 'function') return;

    // Discretize to ~1.5km zone key to prevent duplicate network calls
    const zoneKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (this.fetchedAreaKeys.has(zoneKey)) return;
    this.fetchedAreaKeys.add(zoneKey);

    try {
      const query = `[out:json][timeout:8];way["highway"](around:${radiusMeters},${lat},${lon});out geom;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const json = await res.json();
      if (!json || !Array.isArray(json.elements)) return;

      const newRoads: RoadSegmentDefinition[] = [];
      for (const el of json.elements) {
        if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 2) {
          const highwayType = el.tags?.highway || 'residential';
          const roadName = el.tags?.name || 'Highway';
          const coords: [number, number][] = el.geometry.map(
            (pt: { lat: number; lon: number }) => [pt.lat, pt.lon] as [number, number]
          );
          newRoads.push({
            id: `osm_${el.id}`,
            name: roadName,
            highway: highwayType,
            width: getRoadWidth(highwayType),
            coordinates: coords,
          });
        }
      }

      if (newRoads.length > 0) {
        this.appendRoads(newRoads);
      }
    } catch {
      // Gracefully ignore network errors; simulation continues with existing corridors
    }
  }

  /**
   * Asynchronously load road definitions from a JSON resource or URL.
   */
  public async loadFromUrl(url: string = '/data/roads-lucena.json'): Promise<void> {
    try {
      if (typeof fetch === 'function') {
        const res = await fetch(url);
        if (res.ok) {
          const data: RoadSegmentDefinition[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            this.loadRoads(data);
          }
        }
      }
    } catch {
      // Fallback silently to existing default roads
    }
  }

  public getRoadWidth(highway: string): number {
    return getRoadWidth(highway);
  }

  public getSegmentCount(): number {
    return this.segments.length;
  }

  /**
   * Find nearest road segment to given coordinate using sub-millisecond spatial projection.
   *
   * @param lat Latitude in degrees
   * @param lon Longitude in degrees
   * @returns NearestRoadResult or null if network is empty
   */
  public findNearestRoad(lat: number, lon: number): NearestRoadResult | null {
    if (this.segments.length === 0) return null;

    const cellX = Math.floor(lon / this.cellSize);
    const cellY = Math.floor(lat / this.cellSize);

    // Query 3x3 surrounding cells
    const candidateIndices = new Set<number>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const bucket = this.grid.get(key);
        if (bucket) {
          for (const idx of bucket) {
            candidateIndices.add(idx);
          }
        }
      }
    }

    // If query point falls outside local grid buckets, check all segments
    const candidateList =
      candidateIndices.size > 0
        ? Array.from(candidateIndices).map((idx) => this.segments[idx])
        : this.segments;

    let bestDistSq = Infinity;
    let bestResult: NearestRoadResult | null = null;

    const latRad = (lat * Math.PI) / 180;
    const cosLat = Math.cos(latRad);

    for (const seg of candidateList) {
      // Metric conversion centered at point A
      const vBx = (seg.lonB - seg.lonA) * METERS_PER_LAT_DEGREE * cosLat;
      const vBy = (seg.latB - seg.latA) * METERS_PER_LAT_DEGREE;
      const uPx = (lon - seg.lonA) * METERS_PER_LAT_DEGREE * cosLat;
      const uPy = (lat - seg.latA) * METERS_PER_LAT_DEGREE;

      const vLenSq = vBx * vBx + vBy * vBy;
      if (vLenSq < 1e-9) continue;

      // Projection scalar t = ((P - A) . (B - A)) / |B - A|^2
      const t = (uPx * vBx + uPy * vBy) / vLenSq;
      const tClamped = Math.max(0, Math.min(1, t));

      // Closest point C relative to A in meters
      const cPx = tClamped * vBx;
      const cPy = tClamped * vBy;

      // Perpendicular vector from C to vehicle P
      const dX = uPx - cPx;
      const dY = uPy - cPy;
      const distSq = dX * dX + dY * dY;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        const dPerp = Math.sqrt(distSq);

        const vLen = Math.sqrt(vLenSq);
        const tangentX = vBx / vLen;
        const tangentY = vBy / vLen;

        // Inward normal vector pointing from vehicle toward centerline (C - P)
        let normalX = 0;
        let normalY = 0;
        if (dPerp > 1e-4) {
          normalX = -dX / dPerp;
          normalY = -dY / dPerp;
        } else {
          // Exactly on centerline: default to standard left perpendicular
          normalX = -tangentY;
          normalY = tangentX;
        }

        const halfWidth = seg.width / 2;
        const effectiveHalfWidth = halfWidth + SHOULDER_BUFFER_METERS;
        const distanceToCurb = effectiveHalfWidth - dPerp;
        const carMargin = distanceToCurb - CAR_HALF_WIDTH_METERS;
        const isInsideCorridor = dPerp <= effectiveHalfWidth;
        const curbContact = carMargin <= 0;

        const closestLat = seg.latA + tClamped * (seg.latB - seg.latA);
        const closestLon = seg.lonA + tClamped * (seg.lonB - seg.lonA);

        bestResult = {
          roadId: seg.roadId,
          roadName: seg.roadName,
          highway: seg.highway,
          roadWidth: seg.width,
          halfWidth,
          distanceToCenterline: dPerp,
          distanceToCurb,
          carMargin,
          isInsideCorridor,
          curbContact,
          closestPoint: { latitude: closestLat, longitude: closestLon },
          normal: { x: normalX, y: normalY },
          tangent: { x: tangentX, y: tangentY },
          segmentIndex: seg.segmentIndex,
          t: tClamped,
        };
      }
    }

    return bestResult;
  }
}
