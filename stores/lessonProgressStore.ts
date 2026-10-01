import { create } from 'zustand';

export interface LessonProgress {
  lessonId: number;
  completed: boolean;
  stars: number; // 1 to 3
  smoothnessScore: number; // 0 to 100
  stalls: number;
  maxRollbackMeters: number;
  bestTimeSeconds: number;
  completedAt?: string;
}

interface LessonProgressStore {
  records: Record<number, LessonProgress>;
  saveResult: (
    lessonId: number,
    result: {
      stars: number;
      smoothnessScore: number;
      stalls: number;
      maxRollbackMeters: number;
      timeSeconds: number;
    }
  ) => void;
  getRecord: (lessonId: number) => LessonProgress | undefined;
  isUnlocked: (lessonId: number) => boolean;
  resetAll: () => void;
}

const STORAGE_KEY = 'manual_sim_lesson_progress';

const loadSavedRecords = (): Record<number, LessonProgress> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const persistRecords = (records: Record<number, LessonProgress>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
};

export const useLessonProgressStore = create<LessonProgressStore>((set, get) => ({
  records: {},
  saveResult: (lessonId, result) => {
    set((state) => {
      const existing = state.records[lessonId];
      const newStars = existing ? Math.max(existing.stars, result.stars) : result.stars;
      const newSmoothness = existing
        ? Math.max(existing.smoothnessScore, result.smoothnessScore)
        : result.smoothnessScore;
      const bestTime = existing
        ? Math.min(existing.bestTimeSeconds, result.timeSeconds)
        : result.timeSeconds;
      const lowestStalls = existing
        ? Math.min(existing.stalls, result.stalls)
        : result.stalls;

      const updatedRecord: LessonProgress = {
        lessonId,
        completed: true,
        stars: newStars,
        smoothnessScore: newSmoothness,
        stalls: lowestStalls,
        maxRollbackMeters: result.maxRollbackMeters,
        bestTimeSeconds: Math.round(bestTime * 10) / 10,
        completedAt: new Date().toISOString(),
      };

      const newRecords = {
        ...state.records,
        [lessonId]: updatedRecord,
      };

      persistRecords(newRecords);
      return { records: newRecords };
    });
  },
  getRecord: (lessonId) => {
    return get().records[lessonId];
  },
  isUnlocked: (lessonId) => {
    if (lessonId === 1) return true;
    const prev = get().records[lessonId - 1];
    return prev ? prev.completed : false;
  },
  resetAll: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    set({ records: {} });
  },
}));

// Initialize from localStorage on client-side
if (typeof window !== 'undefined') {
  const loaded = loadSavedRecords();
  useLessonProgressStore.setState({ records: loaded });
}
