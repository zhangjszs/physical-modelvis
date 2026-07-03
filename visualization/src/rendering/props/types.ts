// 可复用物理元件的共享类型
// 所有元件均为纯函数 + 屏幕坐标 opts 形态，零依赖 React/Zustand/CoordinateTransformer

export interface PropBase {
  /** 是否暗色主题 */
  isDark: boolean;
}

/** 屏幕矩形（左上角 + 宽高，单位 px） */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 气流粒子状态（由调用方持有并每帧更新） */
export interface AirflowParticle {
  /** 当前 x（屏幕像素） */
  x: number;
  /** 当前 y（屏幕像素） */
  y: number;
  /** 上升速度（屏幕像素/帧） */
  vy: number;
  /** 水平漂移速度 */
  vx: number;
  /** 生命值，0→1 衰减 */
  life: number;
  /** 粒子半径（像素） */
  size: number;
}

/** 刻度尺上需要高亮标记的特殊位置 */
export interface RulerMark {
  /** 物理坐标 x（米） */
  position: number;
  /** 标签文本，如 "G1" */
  label: string;
  /** 标记颜色（默认红色） */
  color?: string;
}

/** 气垫导轨绘制后返回的布局信息，供其他元件定位使用 */
export interface AirTrackLayout {
  /** 导轨顶面 y（滑块底面贴合位置） */
  topY: number;
  /** 导轨左端 x */
  leftX: number;
  /** 导轨右端 x */
  rightX: number;
  /** 导轨整体矩形 */
  rect: ScreenRect;
  /** 气孔位置数组（用于气流粒子生成） */
  airholes: Array<{ x: number; y: number }>;
}
