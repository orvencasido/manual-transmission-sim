import { create } from 'zustand';
import { VehicleState } from '@/lib/simulation/types';
import {
  ComfortEvent,
  FareBreakdown,
  MissionStatus,
  TaxiMission,
  TaxiShiftStats,
} from '@/lib/taxi/types';
import {
  ComfortEvaluator,
  isAtTargetZone,
  isStopAcceptableForPassenger,
} from '@/lib/taxi/comfortEvaluator';
import { calculateFare, generateMission } from '@/lib/taxi/missionGenerator';
import { saveTaxiShift } from '@/lib/supabase/queries';

export type TaxiMissionPhase =
  | 'searching'
  | 'dispatched'
  | 'boarding'
  | 'in_transit'
  | 'deboarding'
  | 'completed'
  | 'abandoned';

interface DialogueState {
  text: string;
  speaker: string;
  avatar: string;
  timestamp: number;
}

export interface TaxiState {
  isShiftActive: boolean;
  shiftStats: TaxiShiftStats;
  currentMission: TaxiMission | null;
  missionPhase: TaxiMissionPhase;
  currentComfort: number; // 0 to 100
  remainingPatienceSeconds: number;
  fareMeter: FareBreakdown;
  dialogueMessage: DialogueState | null;
  lastComfortEvent: ComfortEvent | null;
  isTargetZoneReached: boolean;
  tripDistanceKm: number;
  boardingTimer: number;

  // Actions
  startShift: (initialLat?: number, initialLon?: number) => void;
  endShift: () => Promise<void>;
  dispatchRandomMission: (currentLat?: number, currentLon?: number) => void;
  tick: (
    vehicleState: VehicleState,
    dt: number,
    currentLat: number,
    currentLon: number,
    curbContact?: boolean
  ) => void;
  acceptNextFare: (currentLat?: number, currentLon?: number) => void;
  setDialogue: (text: string, speaker?: string, avatar?: string) => void;
  clearDialogue: () => void;
  resetMission: () => void;
}

const evaluator = new ComfortEvaluator();

const INITIAL_FARE: FareBreakdown = {
  baseFare: 45.0,
  distanceFare: 0.0,
  timeFare: 0.0,
  tip: 0.0,
  totalFare: 45.0,
};

const INITIAL_SHIFT_STATS: TaxiShiftStats = {
  totalEarnings: 0,
  completedTrips: 0,
  failedTrips: 0,
  totalDistanceKm: 0,
  totalDurationSeconds: 0,
  averageComfort: 100,
  stallsCount: 0,
  smoothShiftsCount: 0,
  shiftStartTime: 0,
};

export const useTaxiStore = create<TaxiState>((set, get) => ({
  isShiftActive: false,
  shiftStats: INITIAL_SHIFT_STATS,
  currentMission: null,
  missionPhase: 'searching',
  currentComfort: 100,
  remainingPatienceSeconds: 120,
  fareMeter: INITIAL_FARE,
  dialogueMessage: null,
  lastComfortEvent: null,
  isTargetZoneReached: false,
  tripDistanceKm: 0,
  boardingTimer: 0,

  startShift: (initialLat, initialLon) => {
    evaluator.reset();
    const stats: TaxiShiftStats = {
      ...INITIAL_SHIFT_STATS,
      shiftStartTime: Date.now(),
    };

    set({
      isShiftActive: true,
      shiftStats: stats,
      currentMission: null,
      missionPhase: 'searching',
      currentComfort: 100,
      remainingPatienceSeconds: 120,
      fareMeter: INITIAL_FARE,
      dialogueMessage: {
        text: 'Radio: "Shift started! Dispatching fares across Lucena & Tayabas corridor."',
        speaker: 'Taxi Dispatcher',
        avatar: '📻',
        timestamp: Date.now(),
      },
      lastComfortEvent: null,
      isTargetZoneReached: false,
      tripDistanceKm: 0,
      boardingTimer: 0,
    });

    // Auto-dispatch first fare after 1.5 seconds
    setTimeout(() => {
      if (get().isShiftActive && get().missionPhase === 'searching') {
        get().dispatchRandomMission(initialLat, initialLon);
      }
    }, 1500);
  },

  endShift: async () => {
    const { shiftStats } = get();
    set({ isShiftActive: false });

    // Calculate final duration
    const finalStats: TaxiShiftStats = {
      ...shiftStats,
      totalDurationSeconds: Math.max(
        1,
        Math.round((Date.now() - shiftStats.shiftStartTime) / 1000)
      ),
    };

    try {
      await saveTaxiShift(finalStats);
    } catch (err) {
      console.warn('Failed to save taxi shift to Supabase:', err);
    }
  },

  dispatchRandomMission: (currentLat, currentLon) => {
    evaluator.reset();
    const mission = generateMission({
      currentPosition:
        currentLat !== undefined && currentLon !== undefined
          ? { latitude: currentLat, longitude: currentLon }
          : undefined,
    });

    set({
      currentMission: mission,
      missionPhase: 'dispatched',
      currentComfort: 100,
      remainingPatienceSeconds: mission.passenger.patienceSeconds,
      fareMeter: {
        ...INITIAL_FARE,
        baseFare: mission.baseFare,
        totalFare: mission.baseFare,
      },
      isTargetZoneReached: false,
      tripDistanceKm: 0,
      boardingTimer: 0,
      dialogueMessage: {
        text: `Radio: "New fare! Pickup ${mission.passenger.name} at ${mission.pickupPOI.name}, ${mission.pickupPOI.city}."`,
        speaker: 'Dispatch',
        avatar: '🚖',
        timestamp: Date.now(),
      },
    });
  },

  acceptNextFare: (currentLat, currentLon) => {
    set({
      currentMission: null,
      missionPhase: 'searching',
      isTargetZoneReached: false,
      tripDistanceKm: 0,
      boardingTimer: 0,
      dialogueMessage: null,
      lastComfortEvent: null,
    });

    get().dispatchRandomMission(currentLat, currentLon);
  },

  setDialogue: (text, speaker = 'Passenger', avatar = '💬') => {
    set({
      dialogueMessage: {
        text,
        speaker,
        avatar,
        timestamp: Date.now(),
      },
    });
  },

  clearDialogue: () => {
    set({ dialogueMessage: null });
  },

  resetMission: () => {
    evaluator.reset();
    set({
      currentMission: null,
      missionPhase: 'searching',
      currentComfort: 100,
      fareMeter: INITIAL_FARE,
      dialogueMessage: null,
      lastComfortEvent: null,
      isTargetZoneReached: false,
      tripDistanceKm: 0,
      boardingTimer: 0,
    });
  },

  tick: (vehicleState, dt, currentLat, currentLon, curbContact) => {
    const state = get();
    if (!state.isShiftActive) return;

    const {
      currentMission,
      missionPhase,
      currentComfort,
      remainingPatienceSeconds,
      tripDistanceKm,
      boardingTimer,
      shiftStats,
      dialogueMessage,
    } = state;

    // Auto-fade dialogue after 5.5 seconds
    if (dialogueMessage && Date.now() - dialogueMessage.timestamp > 5500) {
      set({ dialogueMessage: null });
    }

    if (!currentMission) return;

    // =========================================================================
    // PHASE 1: DISPATCHED (Driving towards passenger pickup POI)
    // =========================================================================
    if (missionPhase === 'dispatched') {
      const atPickup = isAtTargetZone(
        currentLat,
        currentLon,
        currentMission.pickupPOI.latitude,
        currentMission.pickupPOI.longitude,
        22
      );

      const isStopValid = isStopAcceptableForPassenger(vehicleState);

      if (atPickup) {
        if (!state.isTargetZoneReached) {
          set({ isTargetZoneReached: true });
        }

        if (isStopValid) {
          // Passenger begins boarding
          set({
            missionPhase: 'boarding',
            boardingTimer: 2.5,
            dialogueMessage: {
              text: currentMission.passenger.dialogue.greeting,
              speaker: currentMission.passenger.name,
              avatar: currentMission.passenger.avatar,
              timestamp: Date.now(),
            },
          });
        }
      } else {
        if (state.isTargetZoneReached) {
          set({ isTargetZoneReached: false });
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 2: BOARDING (Passenger entering car, opening/closing door)
    // =========================================================================
    if (missionPhase === 'boarding') {
      const newTimer = boardingTimer - dt;
      if (newTimer <= 0) {
        // Deboarding complete, commence active transit!
        set({
          missionPhase: 'in_transit',
          boardingTimer: 0,
          currentComfort: 100,
          remainingPatienceSeconds: currentMission.passenger.patienceSeconds,
          isTargetZoneReached: false,
          tripDistanceKm: 0,
        });
      } else {
        set({ boardingTimer: newTimer });
      }
      return;
    }

    // =========================================================================
    // PHASE 3: IN_TRANSIT (Passenger in back seat, judging clutch technique)
    // =========================================================================
    if (missionPhase === 'in_transit') {
      // 1. Accumulate distance driven
      const speedMs = Math.abs(vehicleState.dynamics.speed);
      const addedKm = (speedMs * dt) / 1000;
      const newDistanceKm = tripDistanceKm + addedKm;

      // 2. Accumulate trip elapsed seconds & passenger patience
      const newElapsedSeconds = currentMission.elapsedSeconds + dt;
      const newPatience = Math.max(0, remainingPatienceSeconds - dt);

      // 3. Evaluate manual driving comfort technique
      const events = evaluator.evaluate(vehicleState, dt, curbContact);

      let updatedComfort = currentComfort;
      let patienceDeltaTotal = 0;
      let newDialogue = state.dialogueMessage;
      let latestEvent: ComfortEvent | null = state.lastComfortEvent;
      let newStalls = shiftStats.stallsCount;
      let newSmoothShifts = shiftStats.smoothShiftsCount;

      for (const ev of events) {
        latestEvent = ev;
        updatedComfort = Math.max(0, Math.min(100, updatedComfort + ev.comfortDelta));

        if (ev.patienceDelta) {
          patienceDeltaTotal += ev.patienceDelta;
        }

        if (ev.type === 'stall') {
          newStalls++;
          newDialogue = {
            text: currentMission.passenger.dialogue.onStall,
            speaker: currentMission.passenger.name,
            avatar: currentMission.passenger.avatar,
            timestamp: Date.now(),
          };
        } else if (ev.type === 'smooth_bite' || ev.type === 'rev_match') {
          newSmoothShifts++;
          newDialogue = {
            text: currentMission.passenger.dialogue.onSmoothShift,
            speaker: currentMission.passenger.name,
            avatar: currentMission.passenger.avatar,
            timestamp: Date.now(),
          };
        } else if (ev.type === 'curb_strike') {
          newDialogue = {
            text: 'Aray ko po! Sumampa sa bangketa! Ingat naman po sa manibela!',
            speaker: currentMission.passenger.name,
            avatar: currentMission.passenger.avatar,
            timestamp: Date.now(),
          };
        }
      }

      const finalPatience = Math.max(0, newPatience + patienceDeltaTotal);

      // 4. Update live fare calculation
      const liveFare = calculateFare(
        newDistanceKm,
        newElapsedSeconds / 60,
        updatedComfort,
        currentMission.passenger.archetype
      );

      // 5. Check Abandonment (Patience run out or comfort hit 0)
      if (finalPatience <= 0 || updatedComfort <= 0) {
        set({
          missionPhase: 'abandoned',
          currentComfort: 0,
          remainingPatienceSeconds: 0,
          dialogueMessage: {
            text: 'Ayoko na! Bababa na ako! Hindi ka marunong mag-drive ng manual!',
            speaker: currentMission.passenger.name,
            avatar: currentMission.passenger.avatar,
            timestamp: Date.now(),
          },
          shiftStats: {
            ...shiftStats,
            failedTrips: shiftStats.failedTrips + 1,
            stallsCount: newStalls,
            smoothShiftsCount: newSmoothShifts,
          },
        });
        return;
      }

      // 6. Check arrival at destination POI
      const atDropoff = isAtTargetZone(
        currentLat,
        currentLon,
        currentMission.dropoffPOI.latitude,
        currentMission.dropoffPOI.longitude,
        22
      );

      const isStopValid = isStopAcceptableForPassenger(vehicleState);

      if (atDropoff) {
        if (!state.isTargetZoneReached) {
          set({ isTargetZoneReached: true });
        }

        if (isStopValid) {
          // Passenger begins deboarding
          set({
            missionPhase: 'deboarding',
            boardingTimer: 2.0,
            dialogueMessage: {
              text: currentMission.passenger.dialogue.onArrival,
              speaker: currentMission.passenger.name,
              avatar: currentMission.passenger.avatar,
              timestamp: Date.now(),
            },
            currentMission: {
              ...currentMission,
              elapsedSeconds: newElapsedSeconds,
              currentComfort: updatedComfort,
              fareBreakdown: liveFare,
            },
            fareMeter: liveFare,
            tripDistanceKm: newDistanceKm,
          });
          return;
        }
      } else {
        if (state.isTargetZoneReached) {
          set({ isTargetZoneReached: false });
        }
      }

      set({
        tripDistanceKm: newDistanceKm,
        currentComfort: updatedComfort,
        remainingPatienceSeconds: finalPatience,
        fareMeter: liveFare,
        lastComfortEvent: latestEvent,
        dialogueMessage: newDialogue,
        currentMission: {
          ...currentMission,
          elapsedSeconds: newElapsedSeconds,
          currentComfort: updatedComfort,
          fareBreakdown: liveFare,
        },
        shiftStats: {
          ...shiftStats,
          stallsCount: newStalls,
          smoothShiftsCount: newSmoothShifts,
        },
      });
      return;
    }

    // =========================================================================
    // PHASE 4: DEBOARDING (Passenger stepping out and paying fare)
    // =========================================================================
    if (missionPhase === 'deboarding') {
      const newTimer = boardingTimer - dt;
      if (newTimer <= 0) {
        // Complete the trip!
        const finalFare = state.fareMeter;
        const prevTrips = shiftStats.completedTrips;
        const newTotalTrips = prevTrips + 1;
        const newAvgComfort = Math.round(
          (shiftStats.averageComfort * prevTrips + currentComfort) / newTotalTrips
        );

        const updatedStats: TaxiShiftStats = {
          ...shiftStats,
          totalEarnings:
            Math.round((shiftStats.totalEarnings + finalFare.totalFare) * 100) / 100,
          completedTrips: newTotalTrips,
          totalDistanceKm:
            Math.round((shiftStats.totalDistanceKm + tripDistanceKm) * 10) / 10,
          averageComfort: newAvgComfort,
        };

        set({
          missionPhase: 'completed',
          boardingTimer: 0,
          shiftStats: updatedStats,
          currentMission: {
            ...currentMission,
            fareBreakdown: finalFare,
            completionTime: Date.now(),
          },
        });
      } else {
        set({ boardingTimer: newTimer });
      }
      return;
    }
  },
}));
