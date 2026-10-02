import { describe, it, expect, beforeEach } from 'vitest';
import { useCompositionStore, SOURCE_DEFAULTS } from '../../src/store/compositionStore';

/**
 * compositionStore 行为测试 — 器材增删改 / 自动重仿真时机 / 校验反馈
 * (store 为全局单例, 每例前 resetLab 清场)
 */
describe('compositionStore 组合实验台状态', () => {
    beforeEach(() => {
        useCompositionStore.getState().resetLab();
    });

    it('addSource 后自动重仿真: 得到完整引擎轨迹', () => {
        useCompositionStore.getState().addSource('point-charge');
        const { sources, result, validationMessage } = useCompositionStore.getState();
        expect(sources).toHaveLength(1);
        expect(sources[0]!.source.kind).toBe('point-charge');
        expect(validationMessage).toBeNull();
        expect(result).not.toBeNull();
        // 默认 sampleCount=800 → 轨迹 801 帧
        expect(result!.trajectory).toHaveLength(801);
        expect(result!.completed).toBe(true);
    });

    it('moveSource 只更新位置, 不触发重仿真 (拖拽性能约定)', () => {
        useCompositionStore.getState().addSource('point-charge');
        const before = useCompositionStore.getState().result;
        const id = useCompositionStore.getState().sources[0]!.id;
        useCompositionStore.getState().moveSource(id, { x: 0.2, y: 0.05, z: 0.15 });
        const after = useCompositionStore.getState().result;
        expect(after).toBe(before); // 同一引用 = 未重算
        // 位置已吸附到网格并写入 position 字段
        expect(useCompositionStore.getState().sources[0]!.source).toMatchObject({
            position: { x: 0.2, y: 0.05, z: 0.15 }
        });
    });

    it('commit 拖拽松手后重仿真, 结果引用更新', () => {
        useCompositionStore.getState().addSource('point-charge');
        const before = useCompositionStore.getState().result;
        useCompositionStore.getState().commit();
        expect(useCompositionStore.getState().result).not.toBe(before);
    });

    it('updateSourceParams 重仿真; 非法参数给红牌且保留旧结果', () => {
        useCompositionStore.getState().addSource('circular-coil');
        const good = useCompositionStore.getState().result;
        expect(good).not.toBeNull();
        const id = useCompositionStore.getState().sources[0]!.id;
        useCompositionStore.getState().updateSourceParams(id, { radius: -1 });
        const { sources, result, validationMessage } = useCompositionStore.getState();
        expect(sources[0]!.source).toMatchObject({ radius: -1 });
        expect(validationMessage).toContain('半径');
        expect(result).toBe(good); // 校验失败保留最近有效结果
    });

    it('粒子参数非法 → validationMessage; 合法后恢复', () => {
        useCompositionStore.getState().addSource('point-charge');
        useCompositionStore.getState().setParticle({ mass: 0 });
        expect(useCompositionStore.getState().validationMessage).toContain('质量');
        useCompositionStore.getState().setParticle({ mass: 2e-7 });
        expect(useCompositionStore.getState().validationMessage).toBeNull();
    });

    it('removeSource 同步清选中态并重仿真', () => {
        useCompositionStore.getState().addSource('straight-wire');
        const id = useCompositionStore.getState().sources[0]!.id;
        expect(useCompositionStore.getState().selectedId).toBe(id);
        useCompositionStore.getState().removeSource(id);
        const { sources, selectedId } = useCompositionStore.getState();
        expect(sources).toHaveLength(0);
        expect(selectedId).toBeNull();
    });

    it('四类器材默认参数全部通过引擎校验 (可添加即可用)', () => {
        for (const kind of Object.keys(SOURCE_DEFAULTS) as Array<keyof typeof SOURCE_DEFAULTS>) {
            useCompositionStore.getState().addSource(kind);
        }
        const { sources, validationMessage, result } = useCompositionStore.getState();
        expect(sources).toHaveLength(4);
        expect(validationMessage).toBeNull();
        expect(result).not.toBeNull();
    });

    it('场线开关默认 E 开 / B 关, toggle 可翻转', () => {
        const initial = useCompositionStore.getState();
        expect(initial.showElectricFieldLines).toBe(true);
        expect(initial.showMagneticFieldLines).toBe(false);
        initial.toggleElectricFieldLines();
        initial.toggleMagneticFieldLines();
        expect(useCompositionStore.getState().showElectricFieldLines).toBe(false);
        expect(useCompositionStore.getState().showMagneticFieldLines).toBe(true);
    });

    it('fieldLineRevision 时机: 拖拽 moveSource 自增而轨迹不重算; 粒子/时长变化不自增', () => {
        useCompositionStore.getState().addSource('point-charge');
        const id = useCompositionStore.getState().sources[0]!.id;
        const revisionBeforeDrag = useCompositionStore.getState().fieldLineRevision;
        const resultBeforeDrag = useCompositionStore.getState().result;

        // 拖拽中: 场线版本号自增 (渲染层据此节流重建, 实时跟手), 但昂贵的轨迹不重算
        useCompositionStore.getState().moveSource(id, { x: 0.2, y: 0.1, z: 0.15 });
        expect(useCompositionStore.getState().result).toBe(resultBeforeDrag);
        expect(useCompositionStore.getState().fieldLineRevision).toBe(revisionBeforeDrag + 1);

        // 粒子/时长变化不涉及 sources, 版本号保持 → 不触发场线重建
        const revisionAfterDrag = useCompositionStore.getState().fieldLineRevision;
        useCompositionStore.getState().setParticle({ charge: 1e-6 });
        useCompositionStore.getState().setDuration(3);
        expect(useCompositionStore.getState().fieldLineRevision).toBe(revisionAfterDrag);
    });

    it('fieldLineRevision 时机: 增删器材 / 改参数均自增', () => {
        const r0 = useCompositionStore.getState().fieldLineRevision;
        useCompositionStore.getState().addSource('straight-wire');
        const r1 = useCompositionStore.getState().fieldLineRevision;
        expect(r1).toBe(r0 + 1);
        const id = useCompositionStore.getState().sources[0]!.id;
        useCompositionStore.getState().updateSourceParams(id, { current: 12 });
        expect(useCompositionStore.getState().fieldLineRevision).toBe(r1 + 1);
        useCompositionStore.getState().removeSource(id);
        expect(useCompositionStore.getState().fieldLineRevision).toBe(r1 + 2);
    });
});
