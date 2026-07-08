/**
 * L2-RIG: SceneRig 接口契约自检
 *
 * 遍历 SCENE_TO_MODULE 全部 123 个场景, 验证:
 *   1. 每个场景都能通过 loadSceneRig 异步加载到 rig 对象
 *   2. rig 具备 SceneRig 接口的全部 4 个方法 (buildEquipment/updateEquipment/getVisualPosition/getOrigin)
 *   3. buildEquipment(scene, params) 返回 { group: THREE.Group; handles }
 *   4. getVisualPosition 对默认参数返回 finite 的 THREE.Vector3
 *   5. getOrigin 返回 finite 的 THREE.Vector3
 *   6. worldScale 如果定义, 为有限正数
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SCENE_TO_MODULE, loadSceneRig } from '../../src/components/simulation3d/rigs';

const sceneIds = Object.keys(SCENE_TO_MODULE);

function defaultParams(): Record<string, number> {
  return { angle: 45, h0: 2, v0: 20, m: 1, g: 9.8, k: 50, x0: 0, y0: 0, t: 5, duration: 5 };
}

describe('L2-RIG: SceneRig 接口契约', () => {
  it(`全部 ${sceneIds.length} 个场景都能异步加载 rig`, async () => {
    expect(sceneIds.length).toBe(123);
    for (const id of sceneIds) {
      const rig = await loadSceneRig(id);
      expect(rig, `场景 ${id} 加载返回 undefined`).toBeDefined();
    }
  });

  it('每个 rig 具备 SceneRig 接口的 4 个方法', async () => {
    for (const id of sceneIds) {
      const rig = await loadSceneRig(id);
      expect(typeof rig!.buildEquipment, `${id}: buildEquipment 缺失`).toBe('function');
      expect(typeof rig!.updateEquipment, `${id}: updateEquipment 缺失`).toBe('function');
      expect(typeof rig!.getVisualPosition, `${id}: getVisualPosition 缺失`).toBe('function');
      expect(typeof rig!.getOrigin, `${id}: getOrigin 缺失`).toBe('function');
    }
  });

  it('buildEquipment 返回 { group, handles } 形态', async () => {
    const scene = new THREE.Scene();
    const params = defaultParams();
    for (const id of sceneIds) {
      const rig = await loadSceneRig(id);
      const { group, handles } = rig!.buildEquipment(scene, params);
      expect(group, `${id}: group 不是 THREE.Group`).toBeInstanceOf(THREE.Group);
      expect(handles, `${id}: handles 不是对象`).toBeTypeOf('object');
    }
  });

  it('getVisualPosition 返回 finite Vector3', async () => {
    const params = defaultParams();
    for (const id of sceneIds) {
      const rig = await loadSceneRig(id);
      const pos = { x: 5, y: 3 };
      const v = rig!.getVisualPosition(pos, params);
      expect(v, `${id}: 不是 THREE.Vector3`).toBeInstanceOf(THREE.Vector3);
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z),
        `${id}: getVisualPosition 返回非有限值 (${v.x},${v.y},${v.z})`).toBe(true);
    }
  });

  it('getOrigin 返回 finite Vector3', async () => {
    const params = defaultParams();
    for (const id of sceneIds) {
      const rig = await loadSceneRig(id);
      const o = rig!.getOrigin(params);
      expect(o, `${id}: 不是 THREE.Vector3`).toBeInstanceOf(THREE.Vector3);
      expect(Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.z),
        `${id}: getOrigin 返回非有限值 (${o.x},${o.y},${o.z})`).toBe(true);
    }
  });

  it('worldScale 如果定义, 为有限正数', async () => {
    for (const id of sceneIds) {
      const rig = await loadSceneRig(id);
      if (rig!.worldScale !== undefined) {
        expect(Number.isFinite(rig!.worldScale) && rig!.worldScale! > 0,
          `${id}: worldScale 非法 (${rig!.worldScale})`).toBe(true);
      }
    }
  });
});
