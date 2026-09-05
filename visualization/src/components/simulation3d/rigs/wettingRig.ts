/**
 * 润湿与不润湿实验 rig — 固体基底 (玻璃/石蜡) + 液滴 (水/水银) + 接触角测量切线与圆弧
 * 探究附着层分子作用力强弱差异引起的润湿现象 (θ < 90°) 与不润湿现象 (θ > 90°)，验证杨氏方程 σ_sg = σ_sl + σ_lg·cosθ
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface WettingHandles {
    plateMesh: THREE.Mesh;
    dropMesh: THREE.Mesh;
    tangentLine: THREE.Line;
    angleArc: THREE.Line;
    label: THREE.Sprite;
}

export const wettingRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 0.5;

        // ==================== 1. 精密调平底座与固体基底平板 ====================
        const stageBase = makeBox(2.6, 0.1, 1.6, 0x1e293b, 0.5, 0.2);
        stageBase.position.set(0, cy - 0.12, 0);
        group.add(stageBase);

        // 基底材质板 (玻璃: 高透清脆蓝 / 石蜡: 哑光蜡黄)
        const plateMesh = makeBox(2.2, 0.08, 1.3, 0xe0f2fe, 0.2, 0.1);
        plateMesh.position.set(0, cy - 0.03, 0);
        group.add(plateMesh);

        // ==================== 2. 液滴主体 (截角扁椭球模型) ====================
        const dropGeo = new THREE.SphereGeometry(0.55, 36, 24);
        const dropMat = new THREE.MeshPhysicalMaterial({
            color: 0x2563eb,
            transparent: true,
            opacity: 0.82,
            roughness: 0.08,
            metalness: 0.1,
            transmission: 0.65,
            ior: 1.33
        });
        const dropMesh = new THREE.Mesh(dropGeo, dropMat);
        dropMesh.position.set(0, cy + 0.25, 0);
        group.add(dropMesh);

        // ==================== 3. 接触角三相线与切线示意 ====================
        const tangentLine = makeLine(
            [new THREE.Vector3(0.55, cy + 0.01, 0), new THREE.Vector3(1.1, cy + 0.6, 0)],
            0xdc2626,
            0.85
        );
        group.add(tangentLine);

        // 接触角圆弧
        const arcPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= 24; i++) {
            const a = (i / 24) * 0.7;
            arcPoints.push(new THREE.Vector3(0.55 - Math.cos(a) * 0.28, cy + 0.01 + Math.sin(a) * 0.28, 0));
        }
        const angleArc = makeLine(arcPoints, 0xd97706, 0.85);
        group.add(angleArc);

        // 状态 HUD
        const label = makeTextSprite('润湿与不润湿 (接触角 θ)', '#0f172a', 26, { x: 2.4, y: 0.36 });
        label.position.set(0, cy + 1.6, 0);
        group.add(label);

        const handles: WettingHandles = {
            plateMesh,
            dropMesh,
            tangentLine,
            angleArc,
            label
        };
        updateWetting(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateWetting(handles as unknown as WettingHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.8, 0);
    }
};

function updateWetting(h: WettingHandles, params: Record<string, number>): void {
    const isMercury = Math.round(num(params['medium'], 0)) === 1; // 0=水, 1=水银
    const isWax = Math.round(num(params['surface'], 0)) === 1; // 0=玻璃, 1=石蜡

    // 基底外观更新
    const plateMat = h.plateMesh.material as THREE.MeshStandardMaterial;
    if (isWax) {
        plateMat.color.setHex(0xfef08a); // 蜡黄
        plateMat.roughness = 0.7;
    } else {
        plateMat.color.setHex(0xe0f2fe); // 玻璃淡蓝透光
        plateMat.roughness = 0.1;
    }

    // 液滴形态判定:
    // 水+玻璃: 完全润湿/强润湿 (θ ≈ 15° ~ 25°)
    // 水+石蜡: 不润湿 (θ ≈ 105°)
    // 水银+玻璃: 强不润湿 (θ ≈ 140°)
    // 水银+石蜡: 强不润湿 (θ ≈ 140°)
    const isWetting = !isMercury && !isWax;
    const isMercuryDrop = isMercury;

    const dropMat = h.dropMesh.material as THREE.MeshPhysicalMaterial;
    if (isMercuryDrop) {
        dropMat.color.setHex(0x94a3b8);
        dropMat.metalness = 0.95;
        dropMat.roughness = 0.12;
        dropMat.transmission = 0.0;
        dropMat.opacity = 1.0;
    } else {
        dropMat.color.setHex(0x2563eb);
        dropMat.metalness = 0.1;
        dropMat.roughness = 0.05;
        dropMat.transmission = 0.7;
        dropMat.opacity = 0.85;
    }

    const cy = 0.5;
    if (isWetting) {
        // 铺展薄饼状 (润湿)
        h.dropMesh.scale.set(1.9, 0.28, 1.5);
        h.dropMesh.position.set(0, cy + 0.11, 0);

        // 切线与水平面夹角小 (~20°)
        const p1 = new THREE.Vector3(0.92, cy + 0.01, 0);
        const p2 = new THREE.Vector3(1.35, cy + 0.16, 0);
        h.tangentLine.geometry.setFromPoints([p1, p2]);
    } else if (isMercuryDrop) {
        // 强不润湿，缩成近乎完整圆球
        h.dropMesh.scale.set(0.9, 0.88, 0.9);
        h.dropMesh.position.set(0, cy + 0.44, 0);

        // 切线夹角向外钝角 (~140°)
        const p1 = new THREE.Vector3(0.48, cy + 0.01, 0);
        const p2 = new THREE.Vector3(0.2, cy + 0.45, 0);
        h.tangentLine.geometry.setFromPoints([p1, p2]);
    } else {
        // 水在石蜡，钝角扁球 (θ ≈ 105°)
        h.dropMesh.scale.set(1.2, 0.65, 1.2);
        h.dropMesh.position.set(0, cy + 0.32, 0);

        const p1 = new THREE.Vector3(0.66, cy + 0.01, 0);
        const p2 = new THREE.Vector3(0.48, cy + 0.42, 0);
        h.tangentLine.geometry.setFromPoints([p1, p2]);
    }

    const medName = isMercury ? '水银' : '水';
    const surfName = isWax ? '石蜡面' : '玻璃板';
    const angleDesc = isWetting
        ? '接触角 θ < 90° (附着力 > 内聚力，液体润湿固体)'
        : '接触角 θ > 90° (附着力 < 内聚力，液体不润湿固体)';

    setLabel(h.label, `${medName} 在 ${surfName} | ${angleDesc} | 杨氏方程 σ_sg = σ_sl + σ_lg·cosθ`, '#0f172a');
}
