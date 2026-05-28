import { describe, it, expect } from 'vitest';
import { Vec2 } from '../../src/math/vector2d.js';

describe('Vec2', () => {
  it('create', () => {
    expect(Vec2.create(3, 4)).toEqual({ x: 3, y: 4 });
  });

  it('zero', () => {
    expect(Vec2.zero()).toEqual({ x: 0, y: 0 });
  });

  it('add', () => {
    const r = Vec2.add({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(r).toEqual({ x: 4, y: 6 });
  });

  it('sub', () => {
    const r = Vec2.sub({ x: 5, y: 7 }, { x: 2, y: 3 });
    expect(r).toEqual({ x: 3, y: 4 });
  });

  it('scale', () => {
    const r = Vec2.scale({ x: 3, y: 4 }, 2);
    expect(r).toEqual({ x: 6, y: 8 });
  });

  it('dot', () => {
    expect(Vec2.dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0); // 正交
    expect(Vec2.dot({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(25); // 自身点积
  });

  it('magnitude', () => {
    expect(Vec2.magnitude({ x: 3, y: 4 })).toBe(5);
    expect(Vec2.magnitude({ x: 0, y: 0 })).toBe(0);
  });

  it('normalize', () => {
    const n = Vec2.normalize({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(Vec2.magnitude(n)).toBeCloseTo(1);
  });

  it('normalize zero vector returns zero', () => {
    const n = Vec2.normalize(Vec2.zero());
    expect(n).toEqual({ x: 0, y: 0 });
  });

  it('distance', () => {
    expect(Vec2.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(Vec2.distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });

  it('negate', () => {
    expect(Vec2.negate({ x: 3, y: -4 })).toEqual({ x: -3, y: 4 });
  });

  it('rotate 90 degrees', () => {
    const r = Vec2.rotate({ x: 1, y: 0 }, Math.PI / 2);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });

  it('immutable - original not modified', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 3, y: 4 };
    Vec2.add(a, b);
    expect(a).toEqual({ x: 1, y: 2 });
    expect(b).toEqual({ x: 3, y: 4 });
  });
});
