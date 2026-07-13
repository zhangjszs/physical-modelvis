/**
 * 黑体辐射 rig — 空腔辐射 + 温度→颜色 (维恩/普朗克)
 * 用于 black-body
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

/** 近似黑体色温 → RGB (Tanner Helland 简化) */
function blackbodyColor(T: number): THREE.Color {
    const t = Math.max(1, T) / 100;
    let r: number;
    let g: number;
    let b: number;
    if (t <= 66) {
        r = 255;
        g = 99.47 * Math.log(t) - 161.12;
    } else {
        r = 329.7 * Math.pow(t - 60, -0.1332);
        g = 288.12 * Math.pow(t - 60, -0.0755);
    }
    if (t >= 66) b = 255;
    else if (t <= 19) b = 0;
    else b = 138.52 * Math.log(t - 10) - 305.04;
    const c = (v: number) => Math.max(0, Math.min(255, v)) / 255;
    return new THREE.Color(c(r), c(g), c(b));
}

interface BlackBodyHandles {
    glow: THREE.Mesh;
    bars: THREE.Mesh[];
}

export const blackBodyRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cx = 0;
        const cy = 1.2;

        // 空腔炉体 (外黑盒)
        const oven = makeBox(1.0, 1.0, 1.0, 0x1f2937, 0.9, 0.1);
        oven.position.set(cx, cy, 0);
        group.add(oven);

        // 内部辉光 (经小孔可见)
        const glow = makeSphere(0.34, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.2 });
        glow.position.set(cx, cy, 0);
        group.add(glow);

        // 小孔 / 辐射出口 (朝 +x)
        const aperture = makeCylinder(0.12, 0.04, 0x000000, 0.2, 0.6);
        aperture.rotation.z = Math.PI / 2;
        aperture.position.set(cx + 0.5, cy, 0);
        group.add(aperture);

        // 右侧辐射谱柱 (按波长上色，强度随 T)
        const bars: THREE.Mesh[] = [];
        const barCount = 7;
        for (let i = 0; i < barCount; i++) {
            const bar = makeBox(0.08, 0.5, 0.08, 0xffffff, 0.4);
            bar.position.set(cx + 1.05 + i * 0.16, cy - 0.4 + 0.25, 0);
            group.add(bar);
            bars.push(bar);
        }

        const label = makeTextSprite('黑体空腔', '#334155', 30, { x: 0.7, y: 0.22 });
        label.position.set(cx, cy + 0.85, 0);
        group.add(label);

        scene.add(group);

        const handles: BlackBodyHandles = { glow, bars };
        updateBlackBody(handles, params);
        return { group, handles: { glow, bars } };
    },

    updateEquipment(handles, params) {
        updateBlackBody(handles as unknown as BlackBodyHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.2 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.2, 0);
    }
};

function updateBlackBody(h: BlackBodyHandles, params: Record<string, number>): void {
    const T = num(params['temperature'], 3000);
    const color = blackbodyColor(T);
    const mat = h.glow.material as THREE.MeshStandardMaterial;
    mat.color.copy(color);
    mat.emissive.copy(color);
    mat.emissiveIntensity = Math.min(1.7, 0.3 + T / 8000);

    // 谱柱：峰值随 T 蓝移 (维恩); 整体亮度随 T
    const lambdaPeakNm = (2.898e-3 / T) * 1e9;
    h.bars.forEach((bar, i) => {
        const wl = 380 + (i / (h.bars.length - 1)) * 400; // 380-780nm
        const bmat = bar.material as THREE.MeshStandardMaterial;
        bmat.color.setHSL((1 - (wl - 380) / 400) * 0.66, 0.85, 0.55);
        const planck = Math.exp(-Math.pow((wl - lambdaPeakNm) / 130, 2) / 2);
        const hgt = 0.12 + Math.max(0, planck) * 1.15 * (0.4 + T / 10000);
        bar.scale.y = hgt / 0.5;
        bar.position.y = 1.2 - 0.4 + hgt / 2;
    });
}
