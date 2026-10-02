/**
 * Taxi Simulation Mode — Type Definitions
 * Manual Driving Trainer
 * Bounded exclusively to Lucena City and Tayabas City corridor.
 */

export type PassengerArchetype =
  | 'commuter'
  | 'student'
  | 'elderly'
  | 'enthusiast'
  | 'rush';

export interface TaxiPOI {
  id: string;
  name: string;
  city: 'Lucena' | 'Tayabas';
  latitude: number;
  longitude: number;
  category:
    | 'transit'
    | 'commercial'
    | 'heritage'
    | 'university'
    | 'hospital'
    | 'residential'
    | 'resort';
  description?: string;
}

export interface PassengerDialogue {
  greeting: string;
  onStall: string;
  onSmoothShift: string;
  onArrival: string;
}

export interface Passenger {
  id: string;
  name: string;
  avatar: string;
  archetype: PassengerArchetype;
  patienceSeconds: number;
  maxPatienceSeconds: number;
  tipMultiplier: number;
  dialogue: PassengerDialogue;
}

export type MissionStatus =
  | 'dispatched'
  | 'boarding'
  | 'in_transit'
  | 'completed'
  | 'abandoned';

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  tip: number;
  totalFare: number;
}

export interface TaxiMission {
  id: string;
  passenger: Passenger;
  pickupPOI: TaxiPOI;
  dropoffPOI: TaxiPOI;
  estimatedDistanceKm: number;
  baseFare: number;
  status: MissionStatus;
  currentComfort: number; // 0 to 100
  elapsedSeconds: number;
  pickupTime?: number;
  completionTime?: number;
  fareBreakdown?: FareBreakdown;
}

export interface TaxiShiftStats {
  totalEarnings: number;
  completedTrips: number;
  failedTrips: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  averageComfort: number;
  stallsCount: number;
  smoothShiftsCount: number;
  shiftStartTime: number;
}

export type ComfortEventType =
  | 'stall'
  | 'clutch_dump'
  | 'riding_clutch'
  | 'severe_rollback'
  | 'curb_strike'
  | 'smooth_bite'
  | 'rev_match'
  | 'proper_stop';

export interface ComfortEvent {
  id: string;
  type: ComfortEventType;
  comfortDelta: number; // Positive for bonus, negative for deduction
  patienceDelta?: number; // Seconds to add/deduct from passenger patience
  message: string;
  timestamp: number;
}
