import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { makeSourceMesh, updateSourceMesh } from '../../src/components/composition/sourceMeshes';
import { physicsToWorld } from '../../src/utils/compositionCoords';
import type { PlacedSource } from '../../src/store/compositionStore';
import type { FieldSource } from 'physics-core';

/** 组装测试用已放置器材 */
function placed(id: string, source: FieldSource): PlacedSource {
    return { id, source };
}

describe('sourceMeshes 组合实验台器材网格', () => {
    it('四类器材: userData 带 sourceId, 单一子几何, 位置取自对应物理字段', () => {
        const cases: Array<{ placed: PlacedSource; pos: { x: number; y: number; z: number } }> = [
            {
                placed: placed('q1', { kind: 'point-charge', charge: 2e-6, position: { x: 0.3, y: 0.1, z: 0.15 } }),
                pos: { x: 0.3, y: 0.1, z: 0.15 }
            },
            {
                placed: placed('p1', {
                    kind: 'charged-plate',
                    sigma: 2e-6,
                    center: { x: 0, y: 0.2, z: 0.4 },
                    normal: { x: 0, y: 1, z: 0 }
                }),
                pos: { x: 0, y: 0.2, z: 0.4 }
            },
            {
                placed: placed('w1', {
                    kind: 'straight-wire',
                    current: 10,
                    point: { x: -0.3, y: 0, z: 0.2 },
                    direction: { x: 0, y: 1, z: 0 }
                }),
                pos: { x: -0.3, y: 0, z: 0.2 }
            },
            {
                placed: placed('c1', {
                    kind: 'circular-coil',
                    current: 5,
                    turns: 20,
                    radius: 0.15,
                    center: { x: 0.4, y: 0, z: 0.15 },
                    axis: { x: 0, y: 1, z: 0 }
                }),
                pos: { x: 0.4, y: 0, z: 0.15 }
            }
        ];
        for (const { placed: p, pos } of cases) {
            const group = makeSourceMesh(p);
            expect(group.userData.sourceId).toBe(p.id);
            expect(group.children).toHaveLength(1);
            expect(group.position.x).toBeCloseTo(physicsToWorld(pos).x, 10);
            expect(group.position.y).toBeCloseTo(physicsToWorld(pos).y, 10);
            expect(group.position.z).toBeCloseTo(physicsToWorld(pos).z, 10);
        }
    });

    it('点电荷符号决定颜色; updateSourceMesh 原位换色', () => {
        const p = placed('q1', { kind: 'point-charge', charge: 1e-6, position: { x: 0, y: 0, z: 0.15 } });
        const group = makeSourceMesh(p);
        const material = (group.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
        expect(material.color.getHex()).toBe(0xef4444); // 正电荷红
        updateSourceMesh(group, placed('q1', { ...p.source, charge: -1e-6 } as FieldSource), false);
        expect(material.color.getHex()).toBe(0x3b82f6); // 负电荷蓝
    });

    it('选中态: emissive 高亮开关', () => {
        const p = placed('q1', { kind: 'point-charge', charge: 1e-6, position: { x: 0, y: 0, z: 0.15 } });
        const group = makeSourceMesh(p);
        const material = (group.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
        updateSourceMesh(group, p, true);
        expect(material.emissiveIntensity).toBeGreaterThan(0);
        updateSourceMesh(group, p, false);
        expect(material.emissiveIntensity).toBe(0);
    });

    it('极板法线对齐: 局部 z 轴经四元数变换后指向法线的世界方向', () => {
        const group = makeSourceMesh(
            placed('p1', {
                kind: 'charged-plate',
                sigma: 2e-6,
                center: { x: 0, y: 0, z: 0.4 },
                normal: { x: 0, y: 1, z: 0 }
            })
        );
        const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);
        // 物理法线 (0,1,0) → 世界 (0, 0, −1)
        expect(localZ.x).toBeCloseTo(0, 10);
        expect(localZ.y).toBeCloseTo(0, 10);
        expect(localZ.z).toBeCloseTo(-1, 10);
    });

    it('线圈半径更新: 几何原位重建, 半径参数随参数面板变化', () => {
        const p = placed('c1', {
            kind: 'circular-coil',
            current: 5,
            turns: 20,
            radius: 0.15,
            center: { x: 0, y: 0, z: 0.15 },
            axis: { x: 0, y: 1, z: 0 }
        });
        const group = makeSourceMesh(p);
        const mesh = group.children[0] as THREE.Mesh;
        const before = (mesh.geometry as THREE.TorusGeometry).parameters!.radius;
        updateSourceMesh(group, placed('c1', { ...p.source, radius: 0.3 } as FieldSource), false);
        const after = (mesh.geometry as THREE.TorusGeometry).parameters!.radius;
        expect(before).toBeCloseTo(0.15, 10);
        expect(after).toBeCloseTo(0.3, 10);
    });

    it('零方向向量不抛错: 保留当前姿态 (校验层负责红牌)', () => {
        const group = makeSourceMesh(
            placed('p1', {
                kind: 'charged-plate',
                sigma: 2e-6,
                center: { x: 0, y: 0, z: 0.4 },
                normal: { x: 0, y: 0, z: 0 }
            })
        );
        expect(group.position.y).toBeCloseTo(0.4, 10);
    });
});
