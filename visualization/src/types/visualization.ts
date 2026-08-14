import type { SimulationResult, PhysicsProblem, ModelType, Vector2D } from 'physics-core';
import type { PhotogateMeasurement } from '../utils/photogate';

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

export interface ScenePreset {
    id: string;
    name: string;
    parameters: Record<string, number>;
    description?: string;
}

export interface SceneConfig {
    id: string;
    name: string;
    model: ModelType;
    parameters: SceneParameter[];
    buildProblem: (params: Record<string, number>) => PhysicsProblem;
    presets?: ScenePreset[];
    liveUpdate?: boolean;
    hasTrajectory?: boolean;
}

// ========== 渲染相关 ==========

// 复用 physics-core 规范类型 Vector2D, 消除与 vector2d.ts / gapScenes 的重复定义
export type Vec2 = Vector2D;

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

export type GraphType =
    'x_t' | 'y_t' | 'vx_t' | 'vy_t' | 'a_t' | 'ke_t' | 'pe_t' | 'total_e_t' | 'p_t' | 'F_t' | 'F_theta' | 'f_N';

export interface GraphSeries {
    label: string;
    data: Array<{ t: number; value: number }>;
    unit: string;
    color: string;
}

// ========== 主题 ==========

export type Theme = 'light' | 'dark';

// ========== 参数对比实验 ==========

export interface CompareConfig {
    paramName: string;
    count: number;
    min: number;
    max: number;
}

export interface CompareEntry {
    paramValue: number;
    result: SimulationResult;
    color: string;
}

// ========== 状态 ==========

export interface SimulationState {
    currentScene: string;
    parameters: Record<string, number>;
    parametersSceneId: string | null;
    sceneLoadVersion: number;
    /** 已加载的场景配置(懒加载后缓存),未就绪时为空数组 */
    scenes: SceneConfig[];
    simulationResult: SimulationResult | null;
    currentTime: number;
    currentFrameIndex: number;
    isPlaying: boolean;
    playbackSpeed: number;
    visibleLayers: VisibleLayers;
    selectedGraph: GraphType;
    errorMessage: string | null;
    theme: Theme;
    /** 实验特化数据（气垫导轨场景为光电门测量结果） */
    experimentData: PhotogateMeasurement[] | null;

    // 参数对比实验
    compareMode: boolean;
    compareConfig: CompareConfig | null;
    compareResults: CompareEntry[];

    // Actions
    setScene: (sceneId: string) => void;
    setSceneWithParameters: (sceneId: string, parameters: Record<string, number>) => void;
    ensureSceneParameters: (sceneId: string, defaults: Record<string, number>) => void;
    ensureScenesLoaded: () => void;
    setParameter: (name: string, value: number) => void;
    applyPreset: (parameters: Record<string, number>) => void;
    setSimulationResult: (result: SimulationResult) => void;
    setExperimentData: (data: PhotogateMeasurement[] | null) => void;
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

    // 参数对比实验 actions
    toggleCompareMode: () => void;
    setCompareConfig: (config: CompareConfig | null) => void;
    setCompareResults: (entries: CompareEntry[]) => void;
}
