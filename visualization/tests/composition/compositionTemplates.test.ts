import { describe, it, expect } from 'vitest';
import { COMPOSITION_TEMPLATES, getCompositionTemplate } from '../../src/components/composition/compositionTemplates';
import { validateComposition, simulateComposition, PHYSICS_CONSTANTS } from 'physics-core';
import { snapVector } from '../../src/utils/compositionCoords';

describe('compositionTemplates 预设实验模板 (#101)', () => {
    it('包含至少 3 个核心模板且均带教学目标与元信息', () => {
        expect(COMPOSITION_TEMPLATES.length).toBeGreaterThanOrEqual(3);
        for (const tmpl of COMPOSITION_TEMPLATES) {
            expect(tmpl.id).toBeTruthy();
            expect(tmpl.name).toBeTruthy();
            expect(tmpl.icon).toBeTruthy();
            expect(tmpl.description).toBeTruthy();
            expect(tmpl.teachingGoal).toBeTruthy();
            expect(tmpl.sources.length).toBeGreaterThan(0);
            expect(tmpl.duration).toBeGreaterThan(0);
        }
    });

    it('所有模板参数严格通过 validateComposition 引擎校验', () => {
        for (const tmpl of COMPOSITION_TEMPLATES) {
            const validation = validateComposition({
                sources: [...tmpl.sources],
                particle: tmpl.particle,
                duration: tmpl.duration,
                sampleCount: tmpl.sampleCount
            });
            expect(
                validation.valid,
                `模板 ${tmpl.name} (${tmpl.id}) 校验失败: ${validation.errors.map(e => e.message).join('; ')}`
            ).toBe(true);
            expect(validation.errors).toHaveLength(0);
        }
    });

    it('所有器材位置与三轴尺寸严格对齐 0.25m 台面可视网格', () => {
        for (const tmpl of COMPOSITION_TEMPLATES) {
            for (const s of tmpl.sources) {
                if ('position' in s && s.position) {
                    const snapped = snapVector(s.position, 0.25);
                    expect(s.position, `${tmpl.id} ${s.kind} position 脱网格`).toEqual(snapped);
                }
                if ('center' in s && s.center) {
                    const snapped = snapVector(s.center, 0.25);
                    expect(s.center, `${tmpl.id} ${s.kind} center 脱网格`).toEqual(snapped);
                }
                if ('point' in s && s.point) {
                    const snapped = snapVector(s.point, 0.25);
                    expect(s.point, `${tmpl.id} ${s.kind} point 脱网格`).toEqual(snapped);
                }
                if ('size' in s && s.size) {
                    const snapped = snapVector(s.size, 0.25);
                    expect(s.size, `${tmpl.id} ${s.kind} size 脱网格`).toEqual(snapped);
                }
            }
            const pSnapped = snapVector(tmpl.particle.position, 0.25);
            expect(tmpl.particle.position, `${tmpl.id} particle position 脱网格`).toEqual(pSnapped);
        }
    });

    it('速度选择器：正交 E/B 场中受力平衡，粒子走纯直线', () => {
        const tmpl = getCompositionTemplate('velocity-selector');
        expect(tmpl).toBeDefined();
        const res = simulateComposition({
            sources: [...tmpl!.sources],
            particle: tmpl!.particle,
            duration: tmpl!.duration,
            sampleCount: tmpl!.sampleCount
        });
        expect(res.completed).toBe(true);
        expect(res.trajectory.length).toBeGreaterThan(100);

        // 沿 x 轴穿过，y 与 z 应严格保持恒定 (误差在数值积分精度范围内)
        const yMaxDev = Math.max(...res.trajectory.map(p => Math.abs(p.position.y)));
        const zMaxDev = Math.max(...res.trajectory.map(p => Math.abs(p.position.z - 0.25)));
        expect(yMaxDev).toBeLessThan(1e-5);
        expect(zMaxDev).toBeLessThan(1e-5);
    });

    it('质谱仪：电场加速 + 磁场偏转半圆弧，全轨迹符合独立理论圆心与圆弧半径及最小二乘圆残差', () => {
        const tmpl = getCompositionTemplate('mass-spectrometer');
        expect(tmpl).toBeDefined();
        expect(tmpl!.sources).toHaveLength(3);
        const res = simulateComposition({
            sources: [...tmpl!.sources],
            particle: tmpl!.particle,
            duration: tmpl!.duration,
            sampleCount: tmpl!.sampleCount
        });
        expect(res.completed).toBe(true);

        // 独立解析推导:
        // 1. 加速区: x ∈ [-0.75, -0.25], d = 0.5m, 两块等量异号极板产生 E_x = σ / ε₀ = 0.0025 N/C
        //    动能定理: 0.5*m*v_entry^2 = 0.5*m*v0^2 + q*E_x*d => v_entry ≈ 0.5001 m/s
        // 2. 匀强磁场区: x ∈ [-0.25, 0.75], B_z = 0.02 T
        //    回旋半径: R_theo = m * v_entry / (q * B_z) ≈ 0.25005 m
        //    理论圆心: (x_entry, y_entry - R_theo) = (-0.25, -R_theo)
        const q = 1e-4;
        const m = 1e-6;
        const v0 = 0.01;
        const Ex = 0.0025;
        const d = 0.5;
        const Bz = 0.02;
        const vTheo = Math.sqrt(v0 * v0 + (2 * q * Ex * d) / m);
        const rTheo = (m * vTheo) / (q * Bz);
        const cxTheo = -0.25;
        const cyTheo = -rTheo;

        // 提取进入匀强磁场区 (x > -0.25) 的全部采样点验证圆弧几何不变量
        const magPts = res.trajectory.filter(p => p.position.x > -0.25);
        expect(magPts.length).toBeGreaterThan(150);

        // 容差依据:
        // - 起点 x=-0.75 恰在首块极板平面上 (chargedPlateElectricField 平面处返回 0 场),
        //   首步 dt = 3.6/500 = 0.0072s 仅受右板半场作用, 带来 Δv ≈ 2.5e-5 m/s、ΔR ≈ 2.5e-5 m;
        // - 跨 x=-0.25 边界帧存在 O(v·dt) ≈ 1.8e-3 m 的入场相位偏移, 导致理论圆心半径残差 ≤ 2e-4 m (0.08%·R);
        // - 在纯匀强磁场内 Boris 算法保持精确圆轨道, Kåsa 几何圆拟合残差在 IEEE 754 浮点精度级 (< 1e-12 m)。
        let maxTheoRadiusErr = 0;
        for (const p of magPts) {
            const rToTheoCenter = Math.hypot(p.position.x - cxTheo, p.position.y - cyTheo);
            maxTheoRadiusErr = Math.max(maxTheoRadiusErr, Math.abs(rToTheoCenter - rTheo));
            expect(Math.abs(p.position.z - 0.25)).toBeLessThan(1e-12);
        }
        expect(maxTheoRadiusErr).toBeLessThan(5e-4);

        // 独立几何圆拟合 (Kåsa 最小二乘圆) 验证圆心位置、拟合半径与逐点圆弧残差
        const n = magPts.length;
        const xm = magPts.reduce((acc, p) => acc + p.position.x, 0) / n;
        const ym = magPts.reduce((acc, p) => acc + p.position.y, 0) / n;
        let suu = 0,
            suv = 0,
            svv = 0,
            suuu = 0,
            svvv = 0,
            suvv = 0,
            svuu = 0;
        for (const p of magPts) {
            const u = p.position.x - xm;
            const v = p.position.y - ym;
            suu += u * u;
            suv += u * v;
            svv += v * v;
            suuu += u * u * u;
            svvv += v * v * v;
            suvv += u * v * v;
            svuu += v * u * u;
        }
        const det = suu * svv - suv * suv;
        const uc = (svv * 0.5 * (suuu + suvv) - suv * 0.5 * (svvv + svuu)) / det;
        const vc = (-suv * 0.5 * (suuu + suvv) + suu * 0.5 * (svvv + svuu)) / det;
        const cxFit = xm + uc;
        const cyFit = ym + vc;
        const rFit = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);

        expect(Math.hypot(cxFit - cxTheo, cyFit - cyTheo)).toBeLessThan(5e-4);
        expect(Math.abs(rFit - rTheo)).toBeLessThan(5e-4);

        const maxCircleResidual = Math.max(
            ...magPts.map(p => Math.abs(Math.hypot(p.position.x - cxFit, p.position.y - cyFit) - rFit))
        );
        expect(maxCircleResidual).toBeLessThan(1e-12);
    });

    it('平行板偏转：类平抛运动，全轨迹严格符合独立恒加速度二次位移与抛物线方程', () => {
        const tmpl = getCompositionTemplate('electric-deflection');
        expect(tmpl).toBeDefined();
        expect(tmpl!.sources).toHaveLength(2);
        const res = simulateComposition({
            sources: [...tmpl!.sources],
            particle: tmpl!.particle,
            duration: tmpl!.duration,
            sampleCount: tmpl!.sampleCount
        });
        expect(res.completed).toBe(true);

        // 独立解析公式:
        // 上极板 (y = +0.5, σ = +2e-6 C/m²) 与下极板 (y = -0.5, σ = -2e-6 C/m²) 在板间叠加匀强电场:
        // E_y = -σ / ε₀, 恒定加速度 a_y = (q / m) * E_y
        // x(t) = x₀ + v₀x * t
        // y(t) = y₀ + 0.5 * a_y * t² = y₀ + 0.5 * a_y * ((x - x₀) / v₀x)²
        const sigma = 2e-6;
        const q = 1e-9;
        const m = 1e-4;
        const x0 = -0.75;
        const y0 = 0.25;
        const z0 = 0.25;
        const v0x = 1.5;
        const ey = -sigma / PHYSICS_CONSTANTS.epsilon0.value;
        const ay = (q / m) * ey;

        // 容差依据: 匀强恒定电场且 B=0 时, leapfrog Boris 积分对二阶多项式 y(t) 与线性 x(t) 精确无截断误差,
        // 残差仅源于 IEEE 754 双精度浮点舍入 (< 1e-12 m)。
        const pts = res.trajectory;
        expect(pts.length).toBe(401);
        let maxXErr = 0;
        let maxYTimeErr = 0;
        let maxYParabolaErr = 0;
        let maxVyErr = 0;
        for (const p of pts) {
            const expectedX = x0 + v0x * p.t;
            const expectedYFromT = y0 + 0.5 * ay * p.t * p.t;
            const dx = p.position.x - x0;
            const expectedYFromX = y0 + 0.5 * ay * Math.pow(dx / v0x, 2);
            const expectedVy = ay * p.t;

            maxXErr = Math.max(maxXErr, Math.abs(p.position.x - expectedX));
            maxYTimeErr = Math.max(maxYTimeErr, Math.abs(p.position.y - expectedYFromT));
            maxYParabolaErr = Math.max(maxYParabolaErr, Math.abs(p.position.y - expectedYFromX));
            maxVyErr = Math.max(maxVyErr, Math.abs(p.velocity.y - expectedVy));
            expect(Math.abs(p.position.z - z0)).toBeLessThan(1e-12);
        }
        expect(maxXErr).toBeLessThan(1e-12);
        expect(maxYTimeErr).toBeLessThan(1e-12);
        expect(maxYParabolaErr).toBeLessThan(1e-12);
        expect(maxVyErr).toBeLessThan(1e-12);
    });

    it('磁聚焦：线圈轴向非匀强磁场产生径向会聚，束腰束径缩小', () => {
        const tmpl = getCompositionTemplate('magnetic-focusing');
        expect(tmpl).toBeDefined();
        const res = simulateComposition({
            sources: [...tmpl!.sources],
            particle: tmpl!.particle,
            duration: tmpl!.duration,
            sampleCount: tmpl!.sampleCount
        });
        expect(res.completed).toBe(true);

        const initialRadius = Math.hypot(tmpl!.particle.position.y, tmpl!.particle.position.z - 0.25);
        expect(initialRadius).toBeCloseTo(0.25, 2);

        const minRadius = Math.min(...res.trajectory.map(p => Math.hypot(p.position.y, p.position.z - 0.25)));
        // 束径从 0.25m 缩小至 < 0.08m，会聚比 > 3x
        expect(minRadius).toBeLessThan(0.08);
    });
});
