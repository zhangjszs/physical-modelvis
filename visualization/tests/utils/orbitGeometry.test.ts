/**
 * 卫星轨道视觉几何（2D 板书 / 3D rig 共用）单元测试。
 *
 * 覆盖：
 *   - 圆轨道 / 椭圆（近地点起点 / 远地点起点）/ 开放轨道的 Kepler 参数
 *   - 半径比 r(θ)/r₀ 在近地点、远地点、半通径处的解析值
 *   - 高度 → 视觉半径的对数映射单调性
 */
import { describe, it, expect } from 'vitest';
import { altitudeVisualFraction, orbitShape, GEO_ALTITUDE_KM } from '../../src/utils/orbitGeometry';

const LEO = 400;

describe('orbitShape', () => {
    it('vf=1: 圆轨道 e=0，rMax=rMin=r₀，半径比恒为 1', () => {
        const s = orbitShape(LEO, 1);
        expect(s.closed).toBe(true);
        expect(s.e).toBeCloseTo(0, 9);
        expect(s.rMaxM).toBeCloseTo(s.r0M, 6);
        expect(s.rMinM).toBeCloseTo(s.r0M, 6);
        for (const theta of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
            expect(s.radiusRatio(theta)).toBeCloseTo(1, 9);
        }
    });

    it('vf=1.2: e=0.44，初始点为近地点，远地点半径比 = 1+e / 1-e 对应 2.57', () => {
        const s = orbitShape(LEO, 1.2);
        expect(s.closed).toBe(true);
        expect(s.e).toBeCloseTo(0.44, 9);
        // θ=0 是初始近地点
        expect(s.radiusRatio(0)).toBeCloseTo(1, 9);
        // θ=π 是远地点
        expect(s.radiusRatio(Math.PI)).toBeCloseTo(s.rMaxM / s.r0M, 9);
        expect(s.rMaxM / s.r0M).toBeCloseTo(1 / 0.56 + (0.44 / 0.56) * 1, 6);
        // 半通径处 r = a(1-e²)
        expect(s.radiusRatio(Math.PI / 2)).toBeCloseTo((1 / 0.56) * (1 - 0.44 * 0.44), 6);
    });

    it('vf=0.8: 初始点为远地点，rMax=r₀，近地点在 θ=π', () => {
        const s = orbitShape(LEO, 0.8);
        expect(s.closed).toBe(true);
        expect(s.e).toBeCloseTo(0.36, 9);
        expect(s.rMaxM).toBeCloseTo(s.r0M, 6);
        expect(s.radiusRatio(0)).toBeCloseTo(1, 9);
        expect(s.radiusRatio(Math.PI)).toBeCloseTo(s.rMinM / s.r0M, 9);
        expect(s.rMinM / s.r0M).toBeCloseTo((1 - 0.36) / (2 - 0.64), 6);
    });

    it('vf≥√2: 开放轨道 closed=false，按初始半径取景', () => {
        for (const vf of [Math.SQRT2, 1.45, 1.5]) {
            const s = orbitShape(LEO, vf);
            expect(s.closed).toBe(false);
            expect(s.rMaxM).toBeCloseTo(s.r0M, 6);
            expect(s.radiusRatio(123)).toBe(1);
        }
    });

    it('高度钳制在 200–36000 km；非法 vf 回退圆轨道', () => {
        const low = orbitShape(0, 1);
        const high = orbitShape(99999, 1);
        expect(low.r0M).toBeCloseTo((6371 + 200) * 1000, 0);
        expect(high.r0M).toBeCloseTo((6371 + 36000) * 1000, 0);
        expect(orbitShape(LEO, Number.NaN).vf).toBe(1);
    });
});

describe('altitudeVisualFraction', () => {
    it('GEO = 1，400km 约 0.154，且随高度单调递增', () => {
        expect(altitudeVisualFraction(GEO_ALTITUDE_KM)).toBeCloseTo(1, 9);
        expect(altitudeVisualFraction(LEO)).toBeGreaterThan(0.14);
        expect(altitudeVisualFraction(LEO)).toBeLessThan(0.17);
        expect(altitudeVisualFraction(2000)).toBeGreaterThan(altitudeVisualFraction(LEO));
        expect(altitudeVisualFraction(36000)).toBeGreaterThan(altitudeVisualFraction(2000));
    });
});
