/**
 * 毛细现象实验 rig — 储液槽 + 粗细不同玻璃毛细管排 + 凹凸弯月面
 * 验证润湿液体在毛细管中上升 (h>0) 与不润湿液体在毛细管中下降 (h<0)，且毛细高度与管半径成反比 (Jurin 定律 h = 2γcosθ / ρgr)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface CapillaryHandles {
    tubeColumns: THREE.Mesh[];
    meniscusCaps: THREE.Mesh[];
    tankLiquid: THREE.Mesh;
    label: THREE.Sprite;
}

export const capillaryRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 0.4;
        const tankW = 2.2;
        const tankH = 0.55;
        const tankD = 0.95;

        // ==================== 1. 储液槽 (厚壁高透玻璃水槽) ====================
        const tankGlass = new THREE.Mesh(
            new THREE.BoxGeometry(tankW, tankH, tankD),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.22,
                roughness: 0.08,
                transmission: 0.9,
                ior: 1.48
            })
        );
        tankGlass.position.set(0, cy, 0);
        group.add(tankGlass);

        // 槽内大液面
        const tankLiquid = new THREE.Mesh(
            new THREE.BoxGeometry(tankW - 0.06, tankH - 0.08, tankD - 0.06),
            new THREE.MeshStandardMaterial({
                color: 0x2563eb,
                transparent: true,
                opacity: 0.75,
                roughness: 0.2
            })
        );
        tankLiquid.position.set(0, cy - 0.02, 0);
        group.add(tankLiquid);

        // 槽底防滑台座
        const tankBase = makeBox(tankW + 0.15, 0.08, tankD + 0.15, 0x1e293b, 0.5, 0.2);
        tankBase.position.set(0, 0.04, 0);
        group.add(tankBase);

        // ==================== 2. 三根粗细递减的精密毛细管排 ====================
        // 管距中心位置 [-0.65, 0, 0.65]
        const tubePositions = [-0.65, 0, 0.65];
        // 半径: 粗(0.08), 中(0.05), 细(0.028)
        const tubeRadii = [0.08, 0.05, 0.028];
        const tubeH = 2.2;

        const tubeColumns: THREE.Mesh[] = [];
        const meniscusCaps: THREE.Mesh[] = [];

        // 上部固定横梁支架
        const bracket = makeBox(2.0, 0.08, 0.16, 0x475569, 0.4, 0.6);
        bracket.position.set(0, cy + 1.25, 0);
        group.add(bracket);

        for (let i = 0; i < 3; i++) {
            const posX = tubePositions[i] ?? 0;
            const r = tubeRadii[i] ?? 0.05;

            // 玻璃毛细管外壁
            const tubeWall = new THREE.Mesh(
                new THREE.CylinderGeometry(r + 0.015, r + 0.015, tubeH, 24, 1, true),
                new THREE.MeshPhysicalMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.38,
                    roughness: 0.05,
                    transmission: 0.92,
                    side: THREE.DoubleSide
                })
            );
            tubeWall.position.set(posX, cy + 0.75, 0);
            group.add(tubeWall);

            // 管内液柱
            const liquidCol = new THREE.Mesh(
                new THREE.CylinderGeometry(r, r, 1.0, 24),
                new THREE.MeshStandardMaterial({
                    color: 0x1d4ed8,
                    transparent: true,
                    opacity: 0.85,
                    roughness: 0.2
                })
            );
            liquidCol.position.set(posX, cy, 0);
            group.add(liquidCol);
            tubeColumns.push(liquidCol);

            // 凹/凸弯月面 (球冠)
            const cap = new THREE.Mesh(
                new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.1 })
            );
            cap.position.set(posX, cy + 0.5, 0);
            group.add(cap);
            meniscusCaps.push(cap);
        }

        // 状态 HUD
        const label = makeTextSprite('毛细现象 (Jurin 定律)', '#0f172a', 26, { x: 2.4, y: 0.36 });
        label.position.set(0, cy + tubeH + 0.15, 0);
        group.add(label);

        const handles: CapillaryHandles = {
            tubeColumns,
            meniscusCaps,
            tankLiquid,
            label
        };
        updateCapillary(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateCapillary(handles as unknown as CapillaryHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.9 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.1, 0);
    }
};

function updateCapillary(h: CapillaryHandles, params: Record<string, number>): void {
    const isMercury = Math.round(num(params['medium'], 0)) === 1;
    const isParaffin = Math.round(num(params['material'], 0)) === 1;
    const baseR = num(params['tubeRadius'], 0.5); // mm

    // 润湿判定: 水在玻璃完全浸润(上升); 水在石蜡不浸润(下降); 水银在玻璃/石蜡均不浸润(下降)
    const isWetting = !isMercury && !isParaffin;

    const liquidColor = isMercury ? 0x94a3b8 : 0x2563eb;
    (h.tankLiquid.material as THREE.MeshStandardMaterial).color.setHex(liquidColor);

    const cyTank = 0.4;
    const liquidSurfaceY = cyTank + 0.22; // 槽内液面高

    // 三根管相对基础半径系数 [0.6, 1.0, 1.8]
    const relR = [1.6, 1.0, 0.55];

    for (let i = 0; i < 3; i++) {
        const col = h.tubeColumns[i];
        const cap = h.meniscusCaps[i];
        if (!col || !cap) continue;

        (col.material as THREE.MeshStandardMaterial).color.setHex(liquidColor);
        (cap.material as THREE.MeshStandardMaterial).color.setHex(liquidColor);

        // Jurin 定律: h ∝ cosθ / r
        const rFactor = (relR[i] ?? 1.0) * (baseR / 0.5);
        const hVal = isWetting ? 0.75 / rFactor : -0.35 / rFactor;

        const colHeight = Math.max(0.08, 0.35 + hVal);
        const colCenterY = liquidSurfaceY - 0.35 + colHeight / 2;

        col.scale.y = colHeight;
        col.position.y = colCenterY;

        // 弯月面顶帽
        const topY = liquidSurfaceY + hVal;
        cap.position.y = topY;
        // 凹液面向下翻转，凸液面向上
        cap.rotation.x = isWetting ? Math.PI : 0;
    }

    const medName = isMercury ? '水银 (不浸润)' : isParaffin ? '水在石蜡管 (不浸润)' : '水在玻璃管 (浸润)';
    const direction = isWetting ? '液面凹弯上升 (h > 0)' : '液面凸弯下降 (h < 0)';
    setLabel(
        h.label,
        `介质: ${medName} | 现象: ${direction} | Jurin 定律 h = 2γcosθ / (ρgr) (管径越细液面差越大)`,
        '#0f172a'
    );
}
