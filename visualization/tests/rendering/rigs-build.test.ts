/**
 * D5: 3D rig 契约测试 — buildEquipment 回归保护
 *
 * 背景: 3D 场景切换实测曾发现 3 个场景 CRASH (ErrorBoundary 触发),
 * 根因是 rig.buildEquipment 抛错 (几何参数越界 / 访问 undefined 属性)。
 * 本测试遍历 SCENE_TO_MODULE 全部 rig, 用空参数调用 buildEquipment,
 * 任何 rig 抛错都会被拦截 (默认参数路径必须健壮)。
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { loadSceneRig, SCENE_TO_MODULE } from '../../src/components/simulation3d/rigs/index';
import { SCENES } from '../../src/scenes/sceneRegistry';

/** 从 SCENES 注册表取场景默认参数 (真实运行路径), 无注册时回退空对象 */
function defaultParams(sceneId: string): Record<string, number> {
    const sc = SCENES.find(s => s.id === sceneId);
    if (!sc || !('parameters' in sc)) return {};
    const out: Record<string, number> = {};
    for (const p of (sc as { parameters: Array<{ name: string; value: number }> }).parameters ?? []) {
        out[p.name] = p.value;
    }
    return out;
}

describe('3D rig 契约: buildEquipment 默认参数不抛错', () => {
    const sceneIds = Object.keys(SCENE_TO_MODULE);

    it(`覆盖 ${sceneIds.length} 个有 rig 的场景`, () => {
        expect(sceneIds.length).toBeGreaterThan(50);
    });

    for (const sceneId of sceneIds) {
        it(`buildEquipment 不抛错 (默认参数): ${sceneId}`, async () => {
            const rig = await loadSceneRig(sceneId);
            expect(rig, `rig 已注册 (${sceneId})`).toBeDefined();
            const scene = new THREE.Scene();
            const params = defaultParams(sceneId);
            let built: { group: THREE.Group; handles: Record<string, unknown> } | null = null;
            expect(() => {
                built = rig!.buildEquipment(scene, params);
            }).not.toThrow();
            expect(built).not.toBeNull();
            expect(built!.group).toBeInstanceOf(THREE.Group);
            expect(built!.handles).toBeTypeOf('object');
            // updateEquipment 同参数也不抛错
            expect(() => rig!.updateEquipment(built!.handles, params)).not.toThrow();
            // getVisualPosition / getOrigin 返回有限向量 (NaN/Infinity 拦截)
            const origin = rig!.getOrigin(params);
            expect(Number.isFinite(origin.x)).toBe(true);
            expect(Number.isFinite(origin.y)).toBe(true);
            const vp = rig!.getVisualPosition({ x: 0, y: 0 }, params);
            expect(Number.isFinite(vp.x)).toBe(true);
            expect(Number.isFinite(vp.y)).toBe(true);
            expect(Number.isFinite(vp.z)).toBe(true);
        }, 30000);
    }

    // 共享 rig 的场景对: 同 rig 对象被多个场景复用 (如 collisionRig 用于碰撞/动量/平抛碰撞)。
    // 场景切换瞬间参数会从场景 A 的默认值跳到场景 B 的默认值,
    // rig 必须对"参数差异"健壮 (不能在分支里漏建句柄)。
    it(`共享 rig 的场景用彼此参数不抛错 (交叉契约)`, async () => {
        const rigToScenes = new Map<string, string[]>();
        for (const sceneId of sceneIds) {
            const rig = await loadSceneRig(sceneId);
            const key = `${rig!.getOrigin.toString().slice(0, 60)}`; // rig 指纹: 函数体前缀
            if (!rigToScenes.has(key)) rigToScenes.set(key, []);
            rigToScenes.get(key)!.push(sceneId);
        }
        const groups = [...rigToScenes.values()].filter(g => g.length > 1);
        expect(groups.length).toBeGreaterThan(0);
        let checked = 0;
        for (const group of groups) {
            for (const a of group) {
                const rigA = await loadSceneRig(a);
                const paramsA = defaultParams(a);
                for (const b of group) {
                    const paramsB = defaultParams(b);
                    const scene = new THREE.Scene();
                    const built = rigA!.buildEquipment(scene, paramsA);
                    expect(() => rigA!.updateEquipment(built.handles, paramsB)).not.toThrow();
                    expect(Number.isFinite(rigA!.getOrigin(paramsB).x)).toBe(true);
                    const vp = rigA!.getVisualPosition({ x: 0, y: 0 }, paramsB);
                    expect(Number.isFinite(vp.x) && Number.isFinite(vp.y) && Number.isFinite(vp.z)).toBe(true);
                    checked++;
                }
            }
        }
        expect(checked).toBeGreaterThan(0);
    }, 60000);

    it('buildEquipment 对空参数与极端参数健壮 (不抛错/有限值)', async () => {
        const extreme: Record<string, number> = { NaN: NaN, inf: Infinity };
        for (const sceneId of sceneIds) {
            const rig = await loadSceneRig(sceneId);
            for (const params of [{}, extreme]) {
                const scene = new THREE.Scene();
                let built: { group: THREE.Group; handles: Record<string, unknown> } | null = null;
                expect(
                    () => {
                        built = rig!.buildEquipment(scene, params);
                    },
                    `buildEquipment(${sceneId}, ${JSON.stringify(params)})`
                ).not.toThrow();
                expect(() => rig!.updateEquipment(built!.handles, params), `updateEquipment(${sceneId})`).not.toThrow();
                const origin = rig!.getOrigin(params);
                expect(Number.isFinite(origin.x) && Number.isFinite(origin.y), `${sceneId} origin`).toBe(true);
            }
        }
    }, 60000);
});
