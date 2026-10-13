import { describe, it, expect } from 'vitest';
import {
    pointChargeElectricField,
    chargedPlateElectricField,
    straightWireMagneticField,
    circularCoilMagneticField,
    barMagnetMagneticField,
    uniformFieldZoneMagneticField,
    totalElectricField,
    totalMagneticField,
    type FieldSource
} from '../../src/physics/fields3d.js';
import { Vec3 } from '../../src/math/vector3d.js';
import { PHYSICS_CONSTANTS } from '../../src/units/constants.js';

const K = PHYSICS_CONSTANTS.k.value;
const EPS0 = PHYSICS_CONSTANTS.epsilon0.value;
const MU0 = PHYSICS_CONSTANTS.mu0.value;

describe('fields3d 可组合场源层', () => {
    describe('pointChargeElectricField 点电荷库仑场', () => {
        it('正电荷: 场沿径向向外, 大小 k·q/r²', () => {
            const q = 1e-9;
            const e = pointChargeElectricField(q, Vec3.zero(), Vec3.create(0.1, 0, 0));
            expect(e.x).toBeCloseTo((K * q) / 0.01, 6);
            expect(e.y).toBeCloseTo(0, 9);
            expect(e.z).toBeCloseTo(0, 9);
        });

        it('负电荷: 场沿径向指向源', () => {
            const e = pointChargeElectricField(-1e-9, Vec3.zero(), Vec3.create(0.1, 0, 0));
            expect(e.x).toBeLessThan(0);
        });

        it('边界: 场点与源重合时返回零场 (奇异性跳过)', () => {
            const e = pointChargeElectricField(1e-9, Vec3.create(1, 2, 3), Vec3.create(1, 2, 3));
            expect(e).toEqual(Vec3.zero());
        });
    });

    describe('chargedPlateElectricField 无限大带电平面', () => {
        const sigma = 1e-6;
        const center = Vec3.zero();
        const normal = Vec3.create(0, 0, 1);
        const expectedMag = sigma / (2 * EPS0);

        it('法线正侧: 场沿 +n̂, 大小 σ/(2ε₀)', () => {
            const e = chargedPlateElectricField(sigma, center, normal, Vec3.create(0.3, 0.4, 0.5));
            expect(e.z).toBeCloseTo(expectedMag, 4);
            expect(e.x).toBeCloseTo(0, 9);
        });

        it('法线负侧: 场反向', () => {
            const e = chargedPlateElectricField(sigma, center, normal, Vec3.create(0, 0, -0.5));
            expect(e.z).toBeCloseTo(-expectedMag, 4);
        });

        it('边界: 场点恰在平面上时返回零场; 非单位法线自动归一化', () => {
            expect(chargedPlateElectricField(sigma, center, normal, center)).toEqual(Vec3.zero());
            const e = chargedPlateElectricField(sigma, center, Vec3.create(0, 0, 7), Vec3.create(0, 0, 0.5));
            expect(e.z).toBeCloseTo(expectedMag, 4);
        });
    });

    describe('straightWireMagneticField 无限长直导线', () => {
        const current = 1;
        const wirePoint = Vec3.zero();
        const direction = Vec3.create(0, 0, 1);

        it('电流沿 +z, 场点在 +x: B 沿 +y, 大小 μ₀I/(2πρ)', () => {
            const b = straightWireMagneticField(current, wirePoint, direction, Vec3.create(0.01, 0, 0));
            expect(b.y).toBeCloseTo(MU0 / (2 * Math.PI * 0.01), 15);
            expect(b.x).toBeCloseTo(0, 15);
        });

        it('边界: 场点在导线上返回零场; 非单位方向自动归一化', () => {
            expect(straightWireMagneticField(current, wirePoint, direction, wirePoint)).toEqual(Vec3.zero());
            const b = straightWireMagneticField(current, wirePoint, Vec3.create(0, 0, 5), Vec3.create(0.01, 0, 0));
            expect(b.y).toBeCloseTo(MU0 / (2 * Math.PI * 0.01), 15);
        });
    });

    describe('circularCoilMagneticField 圆形线圈 (毕奥-萨伐尔)', () => {
        const current = 1;
        const turns = 100;
        const radius = 0.1;
        const center = Vec3.zero();
        const axis = Vec3.create(0, 0, 1);

        it('轴上解析解差分: 与 μ₀NIR²/(2(R²+z²)^{3/2}) 相对偏差 < 0.5%', () => {
            const z = 0.05;
            const b = circularCoilMagneticField(current, turns, radius, center, axis, Vec3.create(0, 0, z));
            const analytic = (MU0 * turns * current * radius * radius) / (2 * Math.pow(radius * radius + z * z, 1.5));
            expect(Math.abs(b.z - analytic) / analytic).toBeLessThan(0.005);
            expect(b.x).toBeCloseTo(0, 6);
            expect(b.y).toBeCloseTo(0, 6);
        });

        it('圆心处: B = μ₀NI/(2R), 方向沿轴 (右手定则)', () => {
            const b = circularCoilMagneticField(current, turns, radius, center, axis, center);
            const analytic = (MU0 * turns) / (2 * radius);
            expect(Math.abs(b.z - analytic) / analytic).toBeLessThan(0.005);
        });

        it('边界: 场点恰在导线环上时跳过奇异段, 结果仍有限', () => {
            // 环上 θ=0 的点: center + R·u (u 为环基向量之一, 此处为 (0,1,0))
            const onWire = Vec3.create(0, radius, 0);
            const b = circularCoilMagneticField(current, turns, radius, center, axis, onWire);
            expect(Number.isFinite(b.x + b.y + b.z)).toBe(true);
        });
    });

    describe('totalElectricField / totalMagneticField 叠加', () => {
        it('叠加: 两等量同号电荷连线中点合场为零', () => {
            const sources: FieldSource[] = [
                { kind: 'point-charge', charge: 1e-9, position: Vec3.create(-0.1, 0, 0) },
                { kind: 'point-charge', charge: 1e-9, position: Vec3.create(0.1, 0, 0) }
            ];
            expect(totalElectricField(sources, Vec3.zero())).toEqual(Vec3.zero());
        });

        it('电场叠加忽略磁场源; 磁场叠加忽略电场源', () => {
            const sources: FieldSource[] = [
                { kind: 'point-charge', charge: 1e-9, position: Vec3.zero() },
                { kind: 'charged-plate', sigma: 1e-6, center: Vec3.zero(), normal: Vec3.create(0, 0, 1) },
                { kind: 'straight-wire', current: 1, point: Vec3.zero(), direction: Vec3.create(0, 0, 1) },
                {
                    kind: 'circular-coil',
                    current: 1,
                    turns: 10,
                    radius: 0.1,
                    center: Vec3.zero(),
                    axis: Vec3.create(0, 0, 1)
                }
            ];
            const at = Vec3.create(0.05, 0, 0.05);
            // 合电场 = 点电荷 + 极板 的单独和
            const eOnly: FieldSource[] = [sources[0], sources[1]];
            expect(totalElectricField(sources, at)).toEqual(totalElectricField(eOnly, at));
            const bOnly: FieldSource[] = [sources[2], sources[3]];
            expect(totalMagneticField(sources, at)).toEqual(totalMagneticField(bOnly, at));
        });

        it('平行板电容器: 两块等量异号极板叠加, 板间场加强为 σ/ε₀, 板外相消为零', () => {
            const sigma = 1e-6;
            const gap = 0.02; // 间距 2cm, 板位于 z=±0.01
            const sources: FieldSource[] = [
                {
                    kind: 'charged-plate',
                    sigma: sigma,
                    center: Vec3.create(0, 0, gap / 2),
                    normal: Vec3.create(0, 0, 1)
                },
                {
                    kind: 'charged-plate',
                    sigma: -sigma,
                    center: Vec3.create(0, 0, -gap / 2),
                    normal: Vec3.create(0, 0, 1)
                }
            ];
            const between = totalElectricField(sources, Vec3.zero());
            // 场从 + 极板 (上方 z>0) 指向 − 极板 → −z 方向
            expect(between.z).toBeCloseTo(-sigma / EPS0, 3);
            const outside = totalElectricField(sources, Vec3.create(0, 0, 1));
            expect(outside.z).toBeCloseTo(0, 6);
        });
    });

    describe('barMagnetMagneticField 条形磁铁 (磁偶极子模型)', () => {
        const m = 5;
        const center = Vec3.zero();
        const direction = Vec3.create(0, 1, 0); // 磁矩沿 +y

        it('轴上解析解差分: 与 μ₀m/(2πz³) 相对偏差 < 1e-10', () => {
            const z = 0.2;
            const b = barMagnetMagneticField(m, center, direction, Vec3.create(0, z, 0));
            const analytic = (MU0 * m) / (2 * Math.PI * Math.pow(z, 3));
            expect(Math.abs(b.y - analytic) / analytic).toBeLessThan(1e-10);
            expect(b.x).toBeCloseTo(0, 15);
            expect(b.z).toBeCloseTo(0, 15);
        });

        it('赤道面解析解差分: 与 -μ₀m/(4πρ³) 相对偏差 < 1e-10', () => {
            const rho = 0.2;
            const b = barMagnetMagneticField(m, center, direction, Vec3.create(rho, 0, 0));
            const analytic = -(MU0 * m) / (4 * Math.PI * Math.pow(rho, 3));
            expect(Math.abs(b.y - analytic) / Math.abs(analytic)).toBeLessThan(1e-10);
            expect(b.x).toBeCloseTo(0, 15);
            expect(b.z).toBeCloseTo(0, 15);
        });

        it('遮蔽半径策略: 距中心 < shieldingRadius 返回零场 (有限值, 无奇点爆炸)', () => {
            const bZero = barMagnetMagneticField(m, center, direction, Vec3.zero(), 0.02);
            expect(bZero).toEqual(Vec3.zero());

            const bNear = barMagnetMagneticField(m, center, direction, Vec3.create(0, 0.01, 0), 0.02);
            expect(bNear).toEqual(Vec3.zero());
            expect(Number.isFinite(bNear.x + bNear.y + bNear.z)).toBe(true);
        });

        it('非单位方向向量自动归一化', () => {
            const bNormalized = barMagnetMagneticField(m, center, Vec3.create(0, 10, 0), Vec3.create(0, 0.2, 0));
            const analytic = (MU0 * m) / (2 * Math.PI * Math.pow(0.2, 3));
            expect(Math.abs(bNormalized.y - analytic) / analytic).toBeLessThan(1e-10);
        });

        it('totalMagneticField 包含条形磁铁的叠加', () => {
            const sources: FieldSource[] = [
                {
                    kind: 'bar-magnet',
                    magneticMoment: m,
                    center,
                    direction
                }
            ];
            const b = totalMagneticField(sources, Vec3.create(0, 0.2, 0));
            const analytic = (MU0 * m) / (2 * Math.PI * Math.pow(0.2, 3));
            expect(Math.abs(b.y - analytic) / analytic).toBeLessThan(1e-10);
        });
    });

    describe('uniformFieldZoneMagneticField 匀强磁场区 (有界区域常量场)', () => {
        const field = Vec3.create(0, 1e-3, 0);
        const center = Vec3.zero();
        const size = Vec3.create(0.4, 0.3, 0.3);

        it('域内场值恒定且等于设定 B (中心与偏心点一致)', () => {
            for (const at of [Vec3.zero(), Vec3.create(0.1, 0.05, -0.1), Vec3.create(-0.19, 0.14, 0.14)]) {
                expect(uniformFieldZoneMagneticField(field, center, size, at)).toEqual(field);
            }
        });

        it('域外为零 (六个面外各一点)', () => {
            for (const at of [
                Vec3.create(0.21, 0, 0),
                Vec3.create(-0.21, 0, 0),
                Vec3.create(0, 0.16, 0),
                Vec3.create(0, -0.16, 0),
                Vec3.create(0, 0, 0.16),
                Vec3.create(0, 0, -0.16)
            ]) {
                expect(uniformFieldZoneMagneticField(field, center, size, at)).toEqual(Vec3.zero());
            }
        });

        it('边界约定: 边界上视为域内 (硬边界 + 追踪越界即停, #114)', () => {
            expect(uniformFieldZoneMagneticField(field, center, size, Vec3.create(0.2, 0, 0))).toEqual(field);
            expect(uniformFieldZoneMagneticField(field, center, size, Vec3.create(0, 0.15, 0))).toEqual(field);
        });

        it('totalMagneticField 包含匀强磁场区的叠加 (域内恒值 / 域外零)', () => {
            const sources: FieldSource[] = [{ kind: 'uniform-field-zone', field, center, size }];
            expect(totalMagneticField(sources, Vec3.zero())).toEqual(field);
            expect(totalMagneticField(sources, Vec3.create(0, 1, 0))).toEqual(Vec3.zero());
        });
    });
});
