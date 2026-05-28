import type { SimulationResult, PhysicsProblem, ModelType } from 'physics-core';

// ========== 场景参数 ==========

export interface SceneParameter {
  name: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  default: number;
  description: string;
}

export interface SceneConfig {
  id: string;
  name: string;
  model: ModelType;
  parameters: SceneParameter[];
  buildProblem: (params: Record<string, number>) => PhysicsProblem;
}

// ========== 渲染相关 ==========

export interface Vec2 {
  x: number;
  y: number;
}

export interface RenderBody {
  id: string;
  position: Vec2;
  velocity: Vec2;
  acceleration?: Vec2;
  radius: number;
  color: string;
  label?: string;
}

export interface RenderFrame {
  t: number;
  bodies: RenderBody[];
  forces?: Array<{ name: string; vector: Vec2; origin: Vec2 }>;
}

// ========== 图层可见性 ==========

export interface VisibleLayers {
  axes: boolean;
  grid: boolean;
  trajectory: boolean;
  velocityVector: boolean;
  accelerationVector: boolean;
  forceVector: boolean;
  energyLabels: boolean;
  bodyLabels: boolean;
}

// ========== 曲线图 ==========

export type GraphType = 'x_t' | 'y_t' | 'vx_t' | 'vy_t' | 'a_t' | 'ke_t' | 'pe_t' | 'total_e_t' | 'p_t' | 'F_t';

export interface GraphSeries {
  label: string;
  data: Array<{ t: number; value: number }>;
  unit: string;
  color: string;
}

// ========== 主题 ==========

export type Theme = 'light' | 'dark';

// ========== 状态 ==========

export interface SimulationState {
  currentScene: string;
  parameters: Record<string, number>;
  simulationResult: SimulationResult | null;
  currentTime: number;
  currentFrameIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  visibleLayers: VisibleLayers;
  selectedGraph: GraphType;
  errorMessage: string | null;
  theme: Theme;

  // Actions
  setScene: (sceneId: string) => void;
  setParameter: (name: string, value: number) => void;
  setSimulationResult: (result: SimulationResult) => void;
  setCurrentTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleLayer: (layer: keyof VisibleLayers) => void;
  setSelectedGraph: (graph: GraphType) => void;
  setErrorMessage: (msg: string | null) => void;
  toggleTheme: () => void;
  runSimulation: () => void;
}
