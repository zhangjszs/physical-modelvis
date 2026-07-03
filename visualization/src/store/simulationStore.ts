import { create } from 'zustand';
import type { SimulationState, VisibleLayers } from '../types/visualization';
import { getTotalDuration } from '../utils/frameUtils';

const DEFAULT_LAYERS: VisibleLayers = {
  axes: true,
  grid: true,
  trajectory: true,
  velocityVector: true,
  accelerationVector: false,
  forceVector: false,
  energyLabels: false,
  bodyLabels: true,
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  currentScene: 'projectile',
  parameters: {},
  parametersSceneId: null,
  sceneLoadVersion: 0,
  simulationResult: null,
  currentTime: 0,
  currentFrameIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  visibleLayers: { ...DEFAULT_LAYERS },
  selectedGraph: 'y_t',
  errorMessage: null,
  theme: 'dark',
  experimentData: null,

  setScene: (sceneId) => {
    set((s) => ({
      currentScene: sceneId,
      parameters: {},
      parametersSceneId: null,
      sceneLoadVersion: s.sceneLoadVersion + 1,
      isPlaying: false,
      currentTime: 0,
      currentFrameIndex: 0,
      simulationResult: null,
      errorMessage: null,
      experimentData: null,
      // 气垫导轨是 1D 水平运动，默认显示 x-t 图
      selectedGraph: sceneId === 'air-track' ? 'x_t' : s.selectedGraph,
    }));
  },

  setSceneWithParameters: (sceneId, parameters) => {
    set((s) => ({
      currentScene: sceneId,
      parameters: { ...parameters },
      parametersSceneId: sceneId,
      sceneLoadVersion: s.sceneLoadVersion + 1,
      isPlaying: false,
      currentTime: 0,
      currentFrameIndex: 0,
      simulationResult: null,
      errorMessage: null,
      experimentData: null,
      selectedGraph: sceneId === 'air-track' ? 'x_t' : s.selectedGraph,
    }));
  },

  ensureSceneParameters: (sceneId, defaults) => {
    set((s) => {
      if (s.currentScene !== sceneId || s.parametersSceneId === sceneId) return s;
      return {
        ...s,
        parameters: { ...defaults },
        parametersSceneId: sceneId,
      };
    });
  },

  setParameter: (name, value) => {
    set((s) => ({ parameters: { ...s.parameters, [name]: value } }));
  },

  setSimulationResult: (result) => {
    set({ simulationResult: result, currentTime: 0, currentFrameIndex: 0, errorMessage: null, experimentData: null });
  },

  setExperimentData: (data) => {
    set({ experimentData: data });
  },

  setCurrentTime: (t) => {
    const { simulationResult } = get();
    if (!simulationResult) return;
    const trajectories = simulationResult.trajectories;
    const totalDuration = getTotalDuration(trajectories);
    const clamped = Math.max(0, Math.min(t, totalDuration));
    const points = trajectories[0] ?? [];
    let idx = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i]!.t <= clamped) idx = i;
      else break;
    }
    set({ currentTime: clamped, currentFrameIndex: idx });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  reset: () => {
    set({ currentTime: 0, currentFrameIndex: 0, isPlaying: false });
  },

  stepForward: () => {
    const { simulationResult, currentFrameIndex } = get();
    if (!simulationResult) return;
    const points = simulationResult.trajectories[0] ?? [];
    const next = Math.min(currentFrameIndex + 1, points.length - 1);
    set({ currentFrameIndex: next, currentTime: points[next]?.t ?? 0 });
  },

  stepBackward: () => {
    const { simulationResult, currentFrameIndex } = get();
    if (!simulationResult) return;
    const points = simulationResult.trajectories[0] ?? [];
    const prev = Math.max(currentFrameIndex - 1, 0);
    set({ currentFrameIndex: prev, currentTime: points[prev]?.t ?? 0 });
  },

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  toggleLayer: (layer) => {
    set((s) => ({
      visibleLayers: { ...s.visibleLayers, [layer]: !s.visibleLayers[layer] },
    }));
  },

  setSelectedGraph: (graph) => set({ selectedGraph: graph }),

  setErrorMessage: (msg) => set({ errorMessage: msg }),

  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}));
