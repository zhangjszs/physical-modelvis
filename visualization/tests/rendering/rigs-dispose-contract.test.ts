/**
 * rig dispose 契约测试 (#80) — 全部 rig 构建→dispose→重建 无跨调用残留
 *
 * 背景: #79 修复了 disposeObject 漏纹理, 但「rig 模块级累积」这类缺口没有测试拦截 ——
 * 若某个 rig 把 build 出来的对象存进模块级数组、或跨调用复用已 dispose 的对象,
 * 场景反复切换会渐进劣化 (D14「越点越慢」的放大器之一)。
 *
 * 契约 (对 SCENE_TO_MODULE 全部 rig 逐场景断言):
 *   1. 对象计数守恒: build → disposeObject → 再 build, 场景图对象数完全一致;
 *   2. 对象新鲜: 两次 build 返回不同 group/handles (rig 不得缓存已 build 的场景图);
 *   3. 重建可用: dispose 后 rebuild + updateEquipment 不抛错 (无 use-after-dispose)。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { disposeObject } from '../../src/components/simulation3d/primitives';
import { loadSceneRig, SCENE_TO_MODULE } from '../../src/components/simulation3d/rigs/index';
import { getSceneSync, loadAllScenes } from '../../src/scenes/sceneRegistry';

/** 从 SCENES 注册表取场景默认参数 (真实运行路径), 无注册时回退空对象 */
function defaultParams(sceneId: string): Record<string, number> {
    const sc = getSceneSync(sceneId);
    if (!sc || !('parameters' in sc)) return {};
    const out: Record<string, number> = {};
    for (const p of (sc as { parameters: Array<{ name: string; value: number }> }).parameters ?? []) {
        out[p.name] = p.value;
    }
    return out;
}

function countObjects(root: THREE.Object3D): number {
    let n = 0;
    root.traverse(() => {
        n += 1;
    });
    return n;
}

describe('rig 构建→dispose→重建 契约 (#80)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    const sceneIds = Object.keys(SCENE_TO_MODULE);

    it(`覆盖 ${sceneIds.length} 个有 rig 的场景`, () => {
        expect(sceneIds.length).toBeGreaterThan(50);
    });

    for (const sceneId of sceneIds) {
        it(`${sceneId}: 重建对象数守恒且不复用已释放对象`, async () => {
            const rig = await loadSceneRig(sceneId);
            expect(rig, `rig 已注册 (${sceneId})`).toBeDefined();
            const params = defaultParams(sceneId);

            // 第一次 build (照 EquipmentStage 约定把 group 挂到 scene)
            const scene1 = new THREE.Scene();
            const built1 = rig!.buildEquipment(scene1, params);
            scene1.add(built1.group);
            const count1 = countObjects(scene1);
            expect(count1, `${sceneId} 首次 build 应产生场景对象`).toBeGreaterThan(0);
            disposeObject(scene1);

            // 第二次 build: 全新 Scene + 全新对象
            const scene2 = new THREE.Scene();
            const built2 = rig!.buildEquipment(scene2, params);
            scene2.add(built2.group);
            const count2 = countObjects(scene2);
            disposeObject(scene2);

            // 契约 1: 计数守恒 (模块级累积/缺建句柄都会打破)
            expect(count2, `${sceneId} 重建后对象数应与首建一致`).toBe(count1);
            // 契约 2: 对象新鲜 (不得复用模块级缓存的已 build 对象)
            expect(built2.group, `${sceneId} group 必须是全新对象`).not.toBe(built1.group);
            expect(built2.handles, `${sceneId} handles 必须是全新对象`).not.toBe(built1.handles);
            // 契约 3: 重建后 updateEquipment 可用
            expect(() => rig!.updateEquipment(built2.handles, params)).not.toThrow();
        }, 30000);
    }
});
