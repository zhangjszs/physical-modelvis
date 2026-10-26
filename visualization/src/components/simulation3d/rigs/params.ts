import type { Sprite } from 'three';
import { redrawTextSprite } from '../primitives';

/**
 * 3D 舞台环境中心（地面/背墙/默认相机注视点都在 x≈3.2–3.6）。
 * 左右对称的实验（天体轨道/圆周运动/光电管）以该点为场景原点，
 * 否则会落在舞台左前角：背景暗边露出、画面整体偏左。
 */
export const STAGE_CENTER_X = 3.6;

/**
 * 参数安全取值助手
 *
 * `params['key'] ?? default` 只捕 null/undefined；slider 清空产生的 NaN 会穿透到
 * cos/sin 产生 NaN 球体坐标。Number.isNaN 双重守卫堵住这条路径。
 */
export const num = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
};

/**
 * 更新文字精灵 (makeTextSprite 产物) 的画布内容。
 * sprite 的材质贴图是一个 2D canvas，重绘后需置 needsUpdate；
 * 长文本由 redrawTextSprite 自动扩宽画布，避免被 384px 裁切。
 */
export const setLabel = (sprite: Sprite, text: string, color = '#334155'): void => {
    redrawTextSprite(sprite, text, color);
};
