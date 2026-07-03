// 可复用物理元件桶导出
// 每个元件为纯函数 + 屏幕坐标 opts 形态，零依赖 React/Zustand/CoordinateTransformer

export * from './types';
export { drawRuler } from './drawRuler';
export type { RulerOptions } from './drawRuler';
export { drawAirTrack, updateAirflowParticles } from './drawAirTrack';
export type { AirTrackOptions } from './drawAirTrack';
export { drawGlider } from './drawGlider';
export type { GliderOptions } from './drawGlider';
export { drawPhotogate } from './drawPhotogate';
export type { PhotogateOptions } from './drawPhotogate';
export { drawDigitalTimer } from './drawDigitalTimer';
export type { DigitalTimerOptions, TimerChannel } from './drawDigitalTimer';
export { drawCalipers } from './drawCalipers';
export type { CalipersOptions } from './drawCalipers';
