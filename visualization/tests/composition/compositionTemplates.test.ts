import { describe, it, expect } from 'vitest';
import { COMPOSITION_TEMPLATES, getCompositionTemplate } from '../../src/components/composition/compositionTemplates';
import { validateComposition, simulateComposition } from 'physics-core';
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

    it('质谱仪：电场加速 + 磁场偏转半圆弧，出口间距 2R 约 0.5m', () => {
        const tmpl = getCompositionTemplate('mass-spectrometer');
        expect(tmpl).toBeDefined();
        const res = simulateComposition({
            sources: [...tmpl!.sources],
            particle: tmpl!.particle,
            duration: tmpl!.duration,
            sampleCount: tmpl!.sampleCount
        });
        expect(res.completed).toBe(true);

        const start = res.trajectory[0]!.position;
        const end = res.trajectory[res.trajectory.length - 1]!.position;
        // 起点与终点都在 x ≈ -0.75 与 x ≈ -0.28 左右，y 从 0 偏转到 -0.50 (2R = 0.50m)
        expect(start.x).toBeCloseTo(-0.75, 2);
        expect(start.y).toBeCloseTo(0, 2);
        expect(end.y).toBeCloseTo(-0.5, 1);
        expect(end.z).toBeCloseTo(0.25, 2);
    });

    it('平行板偏转：类平抛运动，x 匀速，y 沿电场方向二次方偏转', () => {
        const tmpl = getCompositionTemplate('electric-deflection');
        expect(tmpl).toBeDefined();
        const res = simulateComposition({
            sources: [...tmpl!.sources],
            particle: tmpl!.particle,
            duration: tmpl!.duration,
            sampleCount: tmpl!.sampleCount
        });
        expect(res.completed).toBe(true);

        // 检查 x 匀速前进: x(t) 线性
        const pts = res.trajectory;
        const midPt = pts[Math.floor(pts.length / 2)]!;
        const lastPt = pts[pts.length - 1]!;
        const midTime = tmpl!.duration / 2;
        const expectedMidX = tmpl!.particle.position.x + tmpl!.particle.velocity.x * midTime;
        expect(midPt.position.x).toBeCloseTo(expectedMidX, 2);

        // 检查 y 偏转方向为向下 (负 y 方向) 且偏转量随时间增大
        expect(midPt.position.y).toBeLessThan(tmpl!.particle.position.y);
        expect(lastPt.position.y).toBeLessThan(midPt.position.y);
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
