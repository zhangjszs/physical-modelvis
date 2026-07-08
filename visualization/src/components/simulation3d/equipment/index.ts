/**
 * 3D 器材库 — 可复用构建器
 * 每个函数返回 { group, handles }，供 SceneRig.buildEquipment 组合使用。
 */
export { createIronStand } from './ironStand';
export { createTickerTimer } from './tickerTimer';
export { createInclinedPlane } from './inclinedPlane';
export { createAirTrack } from './airTrack';
export { createSpringScale } from './springScale';
export { createBench } from './bench';
export { createRangeTape } from './rangeTape';
export { createHeightRuler } from './heightRuler';
export { createAngleGauge } from './angleGauge';
export { createPhotogate } from './photogate';
export { createPulley } from './pulley';
export { createWeight } from './weight';
export { createNewtonTube } from './newtonTube';
export { createPendulum } from './pendulum';
export { createLauncher, updateLauncher, getVisualLaunchPoint, BARREL_LENGTH, VISUAL_MUZZLE_HEIGHT } from './launcher';
