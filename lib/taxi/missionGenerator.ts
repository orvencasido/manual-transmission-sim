/**
 * Procedural Passenger & Mission Generator
 * Manual Driving Trainer — Taxi Mode
 */

import {
  FareBreakdown,
  Passenger,
  PassengerArchetype,
  TaxiMission,
  TaxiPOI,
} from './types';
import {
  calculateDistanceKm,
  findNearestPOI,
  getRandomPair,
  getRandomPOI,
  TAXI_POIS,
} from './locations';

interface ArchetypeProfile {
  archetype: PassengerArchetype;
  names: string[];
  avatars: string[];
  patienceFactor: number;
  tipMultiplier: number;
  dialogueTemplates: {
    greeting: (dest: string) => string;
    onStall: string[];
    onSmoothShift: string[];
    onArrival: (fare: number) => string;
  };
}

const ARCHETYPES: Record<PassengerArchetype, ArchetypeProfile> = {
  commuter: {
    archetype: 'commuter',
    names: ['Kuya Bong', 'Aling Nena', 'Tatay Rene', 'Ate Marites', 'Kuya Mark'],
    avatars: ['👨', '👩', '🧑', '💼', '🧳'],
    patienceFactor: 1.0,
    tipMultiplier: 0.15,
    dialogueTemplates: {
      greeting: (dest) => `Magandang araw boss! Sa ${dest} lang po tabi.`,
      onStall: [
        'Naku kuya, namatayan tayo ng makina! Ayos lang, relax ka lang.',
        'Hala, na-stall! Dahan-dahan lang po sa clutch.',
      ],
      onSmoothShift: [
        'Galing mag-drive ah, banayad ang pasok ng kambiyo.',
        'Napakaginhawa ng takbo kuya, sanay na sanay ka.',
      ],
      onArrival: (fare) =>
        `Salamat po kuya! Eto po ang ₱${Math.round(fare)}, keep the change!`,
    },
  },
  student: {
    archetype: 'student',
    names: ['Mia', 'Joshua', 'Nicole', 'Paulo', 'Christian', 'Andrea'],
    avatars: ['🎒', '🧑‍🎓', '👩‍🎓', '🎧', '📚'],
    patienceFactor: 0.85,
    tipMultiplier: 0.1,
    dialogueTemplates: {
      greeting: (dest) => `Kuya, sa ${dest} po! Late na po ako sa klase!`,
      onStall: [
        'Hala kuya na-stall! Baka mag-start na yung quiz namin!',
        'Kuya bilisan po natin mag-start ulit, strikto po prof ko!',
      ],
      onSmoothShift: [
        'Ang bilis at suwabe kuya ah! Parang karera pero safe!',
        'Astig naman mag-kambiyo, parang automatic sa kinis!',
      ],
      onArrival: (fare) =>
        `Yehey umabot ako sa klase! Salamat po kuya, eto po ang ₱${Math.round(fare)}!`,
    },
  },
  elderly: {
    archetype: 'elderly',
    names: ['Lola Carmen', 'Lolo Berting', 'Lola Remedios', 'Lolo Carding'],
    avatars: ['👵', '👴', '👓', '🧣'],
    patienceFactor: 1.35,
    tipMultiplier: 0.25,
    dialogueTemplates: {
      greeting: (dest) =>
        `Magandang hapon iho. Pakidala ako sa ${dest}. Dahan-dahan lang po ha.`,
      onStall: [
        'Aray ko po! Biglang tumigil! Dahan-dahan lang sa clutch iho, maselan ang likod ko.',
        'Jusko, nanginig ang sasakyan! Ingat po sa pagbitaw ng clutch.',
      ],
      onSmoothShift: [
        'Napakabait at banayad mong magmaneho iho, walang alog.',
        'Napakaswabe, halos hindi ko naramdaman ang pagpalit ng kambiyo.',
      ],
      onArrival: (fare) =>
        `Maraming salamat iho, napakabuti mong drayber. Eto ang ₱${Math.round(fare)} at dagdag na tip.`,
    },
  },
  enthusiast: {
    archetype: 'enthusiast',
    names: ['Boss Jojo', 'Kenji', 'Kuya Dennis', 'Jun-Jun', 'Coach Mike'],
    avatars: ['🏎️', '😎', '🚘', '🏁', '🔧'],
    patienceFactor: 1.1,
    tipMultiplier: 0.35,
    dialogueTemplates: {
      greeting: (dest) =>
        `Uy paps! Manual ba 'to? Ayos ah! Sa ${dest} tayo paps, patingin ng diskarte!`,
      onStall: [
        'Aray paps, nabitawan mo clutch agad! Timplahin mo maigi sa bite point!',
        'Nag-lugging ka paps bago namatay! Shift down agad pag bumababa ang RPM!',
      ],
      onSmoothShift: [
        'Solid ng pasok ng segunda mo paps! Ganda ng rev-match, walang jerk!',
        'Pang-pro driver ang clutch control paps! Walang shudder sa flywheel!',
      ],
      onArrival: (fare) =>
        `Astig ng driving mo paps! Manual transmission supremacy! Eto ₱${Math.round(fare)}, sobra para sa galing mo!`,
    },
  },
  rush: {
    archetype: 'rush',
    names: ['Doc Ramos', 'Nurse Angela', 'Kapitan Greg', 'Dra. Santos'],
    avatars: ['🩺', '🚨', '🏃', '⏱️', '⚡'],
    patienceFactor: 0.7,
    tipMultiplier: 0.3,
    dialogueTemplates: {
      greeting: (dest) =>
        `Kuya, pakibilisan po papuntang ${dest}! Emergency po ito!`,
      onStall: [
        'Diyos ko po kuya, huwag ngayon mag-stall! Nagmamadali po tayo!',
        'Kuya, crank mo ulit agad! Bawat segundo mahalaga!',
      ],
      onSmoothShift: [
        'Salamat sa mabilis at maingat na pagpapatakbo!',
        'Ayos kuya, tuloy-tuloy lang ang arangkada!',
      ],
      onArrival: (fare) =>
        `Salamat kuya sa mabilis na biyahe! Life saver ka po! Eto ₱${Math.round(fare)}!`,
    },
  },
};

const ARCHETYPE_KEYS: PassengerArchetype[] = [
  'commuter',
  'student',
  'elderly',
  'enthusiast',
  'rush',
];

/**
 * Pick random element from an array.
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Calculate fare according to tariff rules:
 * - Base Fare: ₱45.00
 * - Distance: ₱13.50 / km
 * - Time: ₱2.00 / minute
 * - Tip: Base Fare * (Comfort / 100) * TipMultiplier
 */
export function calculateFare(
  distanceKm: number,
  durationMinutes: number,
  comfortScore: number,
  archetype: PassengerArchetype
): FareBreakdown {
  const profile = ARCHETYPES[archetype];
  const baseFare = 45.0;
  const distanceFare = Math.round(distanceKm * 13.5 * 100) / 100;
  const timeFare = Math.round(durationMinutes * 2.0 * 100) / 100;

  const normalizedComfort = Math.max(0, Math.min(100, comfortScore)) / 100;
  const rawTip = baseFare * normalizedComfort * profile.tipMultiplier;
  const tip = Math.round(rawTip * 100) / 100;

  const totalFare = Math.round((baseFare + distanceFare + timeFare + tip) * 100) / 100;

  return {
    baseFare,
    distanceFare,
    timeFare,
    tip,
    totalFare,
  };
}

/**
 * Procedurally synthesize a passenger based on archetype.
 */
export function generatePassenger(
  destinationName: string,
  estimatedDistanceKm: number,
  forcedArchetype?: PassengerArchetype
): Passenger {
  const archetypeKey = forcedArchetype || randomChoice(ARCHETYPE_KEYS);
  const profile = ARCHETYPES[archetypeKey];

  const name = randomChoice(profile.names);
  const avatar = randomChoice(profile.avatars);

  // Compute patience in seconds: ~60s baseline + ~65s per km, modulated by personality
  const baseSeconds = Math.max(75, estimatedDistanceKm * 65);
  const patienceSeconds = Math.round(baseSeconds * profile.patienceFactor);

  const estimatedFare = 45 + estimatedDistanceKm * 13.5;

  return {
    id: `passenger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    avatar,
    archetype: archetypeKey,
    patienceSeconds,
    maxPatienceSeconds: patienceSeconds,
    tipMultiplier: profile.tipMultiplier,
    dialogue: {
      greeting: profile.dialogueTemplates.greeting(destinationName),
      onStall: randomChoice(profile.dialogueTemplates.onStall),
      onSmoothShift: randomChoice(profile.dialogueTemplates.onSmoothShift),
      onArrival: profile.dialogueTemplates.onArrival(estimatedFare),
    },
  };
}

export interface GenerateMissionOptions {
  currentPosition?: { latitude: number; longitude: number };
  forceInterCity?: boolean; // Force pickup in one city and drop-off in the other
  forcedArchetype?: PassengerArchetype;
}

/**
 * Generate a complete procedural Taxi Mission.
 */
export function generateMission(options?: GenerateMissionOptions): TaxiMission {
  let pickupPOI: TaxiPOI;
  let dropoffPOI: TaxiPOI;
  let distanceKm: number;

  if (options?.forceInterCity) {
    const lucenaPOIs = TAXI_POIS.filter((p) => p.city === 'Lucena');
    const tayabasPOIs = TAXI_POIS.filter((p) => p.city === 'Tayabas');

    const fromLucena = Math.random() > 0.5;
    pickupPOI = fromLucena ? randomChoice(lucenaPOIs) : randomChoice(tayabasPOIs);
    dropoffPOI = fromLucena ? randomChoice(tayabasPOIs) : randomChoice(lucenaPOIs);
    distanceKm = calculateDistanceKm(
      pickupPOI.latitude,
      pickupPOI.longitude,
      dropoffPOI.latitude,
      dropoffPOI.longitude
    );
  } else if (options?.currentPosition) {
    pickupPOI = findNearestPOI(
      options.currentPosition.latitude,
      options.currentPosition.longitude
    );
    dropoffPOI = getRandomPOI(pickupPOI.id);
    distanceKm = calculateDistanceKm(
      pickupPOI.latitude,
      pickupPOI.longitude,
      dropoffPOI.latitude,
      dropoffPOI.longitude
    );

    // If too close, pick another dropoff
    let attempts = 0;
    while (distanceKm < 0.9 && attempts < 10) {
      dropoffPOI = getRandomPOI(pickupPOI.id);
      distanceKm = calculateDistanceKm(
        pickupPOI.latitude,
        pickupPOI.longitude,
        dropoffPOI.latitude,
        dropoffPOI.longitude
      );
      attempts++;
    }
  } else {
    const pair = getRandomPair(1.0);
    pickupPOI = pair.pickup;
    dropoffPOI = pair.dropoff;
    distanceKm = pair.distanceKm;
  }

  const passenger = generatePassenger(
    dropoffPOI.name,
    distanceKm,
    options?.forcedArchetype
  );

  const baseFare = Math.round((45.0 + distanceKm * 13.5) * 100) / 100;

  return {
    id: `mission_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    passenger,
    pickupPOI,
    dropoffPOI,
    estimatedDistanceKm: distanceKm,
    baseFare,
    status: 'dispatched',
    currentComfort: 100,
    elapsedSeconds: 0,
  };
}
