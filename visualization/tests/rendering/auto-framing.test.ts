/**
 * 移动轨迹自动取景契约 (#165)
 *
 * 舞台原先只把包围盒写进「默认视角预设」，相机从不实时跟随，导致参数一变
 * （射程/位移/高度大幅增大）主体飞出画面。computeAutoFraming 是实时重取景的纯函数：
 *  - 移动轨迹：返回能覆盖包围盒的 target/position/distance；
 *  - 单点 / 退化包围盒：返回 null（让 rig 显式 framing 或默认视角接管，避免把静态装置放大成空景）；
 *  - 非有限点：忽略；全部非有限 → null。
 */
import { describe, expect, it } from 'vitest';
import { computeAutoFraming } from '../../src/components/simulation3d/autoFraming';

describe('#165 computeAutoFraming', () => {
    it('水平长轨迹：距离随跨度增长且覆盖包围盒两端', () => {
        const small = computeAutoFraming([
            { x: 0, y: 0 },
            { x: 6.8, y: 2 }
        ])!;
        const large = computeAutoFraming([
            { x: 0, y: 0 },
            { x: 81, y: 20 }
        ])!;
        expect(small).not.toBeNull();
        expect(large.distance).toBeGreaterThan(small.distance);
        // 距离足够把两端纳入视口（经验系数 0.9 / 1.8）
        expect(large.distance).toBeGreaterThanOrEqual(81 * 0.9);
        expect(large.distance).toBeGreaterThanOrEqual(20 * 1.2);
        // target 居中于包围盒
        expect(large.target[0]).toBeCloseTo(40.5, 6);
        expect(large.target[1]).toBeCloseTo(10, 6);
    });

    it('竖直轨迹：以高度跨度定距离，target 抬高', () => {
        const f = computeAutoFraming([
            { x: 0.3, y: 22.4 },
            { x: 0.3, y: 0.22 }
        ])!;
        expect(f.distance).toBeGreaterThanOrEqual(22.18 * 1.2);
        expect(f.target[1]).toBeGreaterThan(10);
    });

    it('单点 / 退化包围盒 → null（静态装置不被自动取景接管）', () => {
        expect(computeAutoFraming([{ x: 1, y: 1 }])).toBeNull();
        expect(
            computeAutoFraming([
                { x: 1, y: 1 },
                { x: 1, y: 1 }
            ])
        ).toBeNull();
        expect(computeAutoFraming([])).toBeNull();
    });

    it('非有限点被忽略；全非有限 → null', () => {
        const f = computeAutoFraming([
            { x: NaN, y: NaN },
            { x: 0, y: 0 },
            { x: 4, y: 0 }
        ])!;
        expect(f).not.toBeNull();
        expect(f.target[0]).toBeCloseTo(2, 6);
        expect(
            computeAutoFraming([
                { x: NaN, y: 0 },
                { x: Infinity, y: 0 }
            ])
        ).toBeNull();
    });

    it('最小距离下限 5.5（极小但非退化的轨迹不会贴脸）', () => {
        const f = computeAutoFraming([
            { x: 0, y: 0 },
            { x: 0.01, y: 0 }
        ])!;
        expect(f.distance).toBe(5.5);
    });
});
