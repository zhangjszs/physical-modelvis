import { describe, it, expect } from 'vitest';
import { CoordinateTransformer } from '../src/rendering/CoordinateTransformer';

describe('CoordinateTransformer', () => {
  it('toScreen converts physical to screen coordinates', () => {
    const t = new CoordinateTransformer(800, 600, 80);
    // 物理原点应在屏幕中心
    const origin = t.toScreen({ x: 0, y: 0 });
    expect(origin.x).toBe(400);
    expect(origin.y).toBe(300);
  });

  it('y-axis is flipped (physical up = screen up)', () => {
    const t = new CoordinateTransformer(800, 600, 80);
    const above = t.toScreen({ x: 0, y: 1 });
    const below = t.toScreen({ x: 0, y: -1 });
    // 物理 y+1 应该在屏幕上更上方 (y 更小)
    expect(above.y).toBeLessThan(below.y);
  });

  it('toPhysical is the inverse of toScreen', () => {
    const t = new CoordinateTransformer(800, 600, 80);
    const phys = { x: 3.5, y: -2.1 };
    const screen = t.toScreen(phys);
    const back = t.toPhysical(screen);
    expect(back.x).toBeCloseTo(phys.x, 5);
    expect(back.y).toBeCloseTo(phys.y, 5);
  });

  it('toScreenLength scales correctly', () => {
    const t = new CoordinateTransformer(800, 600, 80);
    expect(t.toScreenLength(1)).toBe(80);
    expect(t.toScreenLength(2.5)).toBe(200);
  });

  it('scale is applied correctly', () => {
    const t = new CoordinateTransformer(800, 600, 100);
    const screen = t.toScreen({ x: 1, y: 0 });
    expect(screen.x).toBe(500); // 400 + 1*100
    expect(screen.y).toBe(300); // y=0 stays at center
  });

  it('autoFit adjusts scale to fit points', () => {
    const t = new CoordinateTransformer(800, 600);
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 5 },
    ];
    t.autoFit(points, 800, 600, 50);
    // scale should be set so all points fit
    const scale = t.getScale();
    expect(scale).toBeGreaterThan(0);
    // The furthest point (x=10) should map near the edge
    const screen = t.toScreen({ x: 10, y: 0 });
    expect(screen.x).toBeLessThanOrEqual(800);
  });
});
