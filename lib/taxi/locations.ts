/**
 * Landmark Coordinate Directory — Lucena City & Tayabas City
 * Manual Driving Trainer — Taxi Mode
 */

import { TaxiPOI } from './types';

export const TAXI_POIS: TaxiPOI[] = [
  // --- Lucena City Landmarks ---
  {
    id: 'quezon_capitol',
    name: 'Quezon Provincial Capitol & Perez Park',
    city: 'Lucena',
    latitude: 13.9355,
    longitude: 121.6145,
    category: 'heritage',
    description: 'Provincial government center and historic public park with sunken gardens.',
  },
  {
    id: 'lucena_grand_central',
    name: 'Lucena Grand Central Terminal',
    city: 'Lucena',
    latitude: 13.9575,
    longitude: 121.5975,
    category: 'transit',
    description: 'Major regional transportation terminal connecting buses, jeepneys, and taxis.',
  },
  {
    id: 'sm_city_lucena',
    name: 'SM City Lucena',
    city: 'Lucena',
    latitude: 13.9378,
    longitude: 121.6022,
    category: 'commercial',
    description: 'Premier shopping mall and commercial center with busy passenger drop-off lanes.',
  },
  {
    id: 'sacred_heart_college',
    name: 'Sacred Heart College / Merchan St',
    city: 'Lucena',
    latitude: 13.9308,
    longitude: 121.6138,
    category: 'university',
    description: 'Historic Catholic educational institution in downtown Lucena.',
  },
  {
    id: 'mseuf_campus',
    name: 'MSEUF Main Campus',
    city: 'Lucena',
    latitude: 13.9452,
    longitude: 121.6212,
    category: 'university',
    description: 'Manuel S. Enverga University Foundation, bustling student commuter hub.',
  },
  {
    id: 'pacific_mall',
    name: 'Pacific Mall Lucena / Quezon Ave',
    city: 'Lucena',
    latitude: 13.9348,
    longitude: 121.6185,
    category: 'commercial',
    description: 'Prominent commercial complex located along Quezon Avenue.',
  },
  {
    id: 'qmc_hospital',
    name: 'Quezon Medical Center (QMC)',
    city: 'Lucena',
    latitude: 13.9385,
    longitude: 121.6130,
    category: 'hospital',
    description: 'Main provincial tertiary hospital. High urgency passenger dispatch zone.',
  },
  {
    id: 'cotta_dalahican_port',
    name: 'Lucena Cotta / Ferry Port',
    city: 'Lucena',
    latitude: 13.9180,
    longitude: 121.6280,
    category: 'transit',
    description: 'Maritime ferry gateway for passengers traveling to and from Marinduque.',
  },
  {
    id: 'lucena_diversion_junction',
    name: 'Lucena Diversion Road Junction',
    city: 'Lucena',
    latitude: 13.9585,
    longitude: 121.5850,
    category: 'transit',
    description: 'Busy junction connecting Maharlika Highway, Diversion Road, and route to Tayabas.',
  },
  {
    id: 'st_ferdinand_cathedral',
    name: 'Saint Ferdinand Cathedral',
    city: 'Lucena',
    latitude: 13.9320,
    longitude: 121.6140,
    category: 'heritage',
    description: 'The Roman Catholic Diocese cathedral in the heart of downtown Lucena.',
  },
  {
    id: 'lucena_public_market',
    name: 'Lucena City Public Market',
    city: 'Lucena',
    latitude: 13.9305,
    longitude: 121.6180,
    category: 'commercial',
    description: 'Active morning market zone with fresh produce and high vendor traffic.',
  },

  // --- Tayabas City Landmarks ---
  {
    id: 'tayabas_basilica',
    name: 'Minor Basilica of St. Michael the Archangel',
    city: 'Tayabas',
    latitude: 14.0256,
    longitude: 121.5944,
    category: 'heritage',
    description: '16th-century Spanish colonial church and the longest church nave in the Philippines.',
  },
  {
    id: 'casa_comunidad',
    name: 'Casa Comunidad de Tayabas',
    city: 'Tayabas',
    latitude: 14.0248,
    longitude: 121.5938,
    category: 'heritage',
    description: 'National Historical Landmark built during the Spanish period as a tribunal and prison.',
  },
  {
    id: 'tayabas_city_hall',
    name: 'Tayabas City Hall & Plaza',
    city: 'Tayabas',
    latitude: 14.0265,
    longitude: 121.5925,
    category: 'heritage',
    description: 'Tayabas civic square, government offices, and central town plaza.',
  },
  {
    id: 'malagonlong_bridge',
    name: 'Malagonlong Spanish Stone Bridge',
    city: 'Tayabas',
    latitude: 14.0195,
    longitude: 121.6015,
    category: 'heritage',
    description: 'Historic 136-meter Spanish-era stone arch bridge spanning the Dumaca River.',
  },
  {
    id: 'tayabas_public_market',
    name: 'Tayabas Public Market',
    city: 'Tayabas',
    latitude: 14.0278,
    longitude: 121.5950,
    category: 'commercial',
    description: 'Central trading market famous for Tayabas lambanog, budin, and local delicacies.',
  },
  {
    id: 'nawawalang_paraiso',
    name: 'Nawawalang Paraiso Resort Road',
    city: 'Tayabas',
    latitude: 14.0410,
    longitude: 121.5850,
    category: 'resort',
    description: 'Scenic winding uphill mountain route at the foothills of Mount Banahaw.',
  },
  {
    id: 'mainit_hot_springs',
    name: 'Mainit Hot Springs Junction',
    city: 'Tayabas',
    latitude: 14.0350,
    longitude: 121.5880,
    category: 'resort',
    description: 'Natural mineral hot springs destination popular with weekend tourists.',
  },
  {
    id: 'sanctuary_st_didacus',
    name: 'Sanctuary of Saint Didacus of Alcala',
    city: 'Tayabas',
    latitude: 14.0285,
    longitude: 121.5910,
    category: 'heritage',
    description: 'Historic sanctuary and pilgrimage landmark in northern Tayabas.',
  },
  {
    id: 'alitao_river_park',
    name: 'Alitao River Park & View Deck',
    city: 'Tayabas',
    latitude: 14.0210,
    longitude: 121.5960,
    category: 'transit',
    description: 'Riverside viewpoint along the southern entrance to Tayabas City from Route 607.',
  },
];

/**
 * Calculates Great-Circle distance in kilometers between two GPS coordinates using Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Retrieve a random POI, optionally excluding a specific ID.
 */
export function getRandomPOI(excludeId?: string): TaxiPOI {
  const available = excludeId
    ? TAXI_POIS.filter((p) => p.id !== excludeId)
    : TAXI_POIS;
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

/**
 * Retrieve a random pair of distinct POIs with minimum distance.
 */
export function getRandomPair(minDistanceKm = 0.8): {
  pickup: TaxiPOI;
  dropoff: TaxiPOI;
  distanceKm: number;
} {
  const pickup = getRandomPOI();
  let dropoff = getRandomPOI(pickup.id);
  let distanceKm = calculateDistanceKm(
    pickup.latitude,
    pickup.longitude,
    dropoff.latitude,
    dropoff.longitude
  );

  let attempts = 0;
  while (distanceKm < minDistanceKm && attempts < 15) {
    dropoff = getRandomPOI(pickup.id);
    distanceKm = calculateDistanceKm(
      pickup.latitude,
      pickup.longitude,
      dropoff.latitude,
      dropoff.longitude
    );
    attempts++;
  }

  return { pickup, dropoff, distanceKm };
}

/**
 * Filter POIs by city.
 */
export function getPOIsByCity(city: 'Lucena' | 'Tayabas'): TaxiPOI[] {
  return TAXI_POIS.filter((p) => p.city === city);
}

/**
 * Find POI by its unique ID.
 */
export function getPOIById(id: string): TaxiPOI | undefined {
  return TAXI_POIS.find((p) => p.id === id);
}

/**
 * Find the nearest POI to a given geographic coordinate.
 */
export function findNearestPOI(latitude: number, longitude: number): TaxiPOI {
  let nearest = TAXI_POIS[0];
  let minDistance = calculateDistanceKm(
    latitude,
    longitude,
    nearest.latitude,
    nearest.longitude
  );

  for (let i = 1; i < TAXI_POIS.length; i++) {
    const poi = TAXI_POIS[i];
    const dist = calculateDistanceKm(latitude, longitude, poi.latitude, poi.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = poi;
    }
  }

  return nearest;
}
