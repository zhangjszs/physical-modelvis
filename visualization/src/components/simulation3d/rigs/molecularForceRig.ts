/**
 * 分子力曲线 rig — Lennard-Jones 势 F(r)
 * 两分子间距 r，平衡位 r0=σ·2^(1/6) (F=0); 近距斥、远距引
 * 用于 molecular-force
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

/** LJ 力 F(r) = 24ε/r · [2(σ/r)^12 − (σ/r)^6] (符号: 正=斥, 负=引) */
function ljForce(r: number, eps: number, sig: number): number {
    const s = sig / r;
    const s6 = Math.pow(s, 6);
    const s12 = s6 * s6;
    return ((24 * eps) / r) * (2 * s12 - s6);
}

interface MolHandles {
    curve: THREE.Line;
    left: THREE.Mesh;
    right: THREE.Mesh;
    label: THREE.Sprite;
}

export const molecularForceRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cy = 1.4;

        // 两分子
        const left = makeSphere(0.22, 0x3b82f6, { emissive: 0x1d4ed8, emissiveIntensity: 0.15 });
        const right = makeSphere(0.22, 0xef4444, { emissive: 0x7f1d1d, emissiveIntensity: 0.15 });
        group.add(left);
        group.add(right);

        // F-r 曲线 (背景平面 + 折线)
        const curve = makeLine([new THREE.Vector3(0, cy, 0)], 0x0f172a, 0.85);
        group.add(curve);

        const label = makeTextSprite('分子力曲线', '#334155', 26, { x: 0.9, y: 0.22 });
        label.position.set(0, cy + 1.1, 0);
        group.add(label);

        scene.add(group);

        const handles: MolHandles = { curve, left, right, label };
        updateMol(handles, params);
        return { group, handles: { curve, left, right, label } };
    },

    updateEquipment(handles, params) {
        updateMol(handles as unknown as MolHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.4, 0);
    }
};

function updateMol(h: MolHandles, params: Record<string, number>): void {
    const eps = num(params['epsilon'], 1.0) * 1e-21;
    const sig = num(params['sigma'], 0.34) * 1e-9;

    // 分子放在平衡间距 r0 = σ·2^(1/6) 附近
    const gap = 0.9;
    h.left.position.set(-gap / 2, 1.4, 0);
    h.right.position.set(gap / 2, 1.4, 0);

    // 计算 F-r 曲线 (r: 0.8σ → 3σ)，映射到屏幕 y 方向
    const rMin = 0.8 * sig;
    const rMax = 3.0 * sig;
    const N = 60;
    const pts: THREE.Vector3[] = [];
    let fmax = 1e-30;
    const raw: number[] = [];
    for (let i = 0; i <= N; i++) {
        const r = rMin + ((rMax - rMin) * i) / N;
        const f = ljForce(r, eps, sig);
        raw.push(f);
        fmax = Math.max(fmax, Math.abs(f));
    }
    for (let i = 0; i <= N; i++) {
        const x = -1.4 + (2.8 * i) / N;
        const y = 1.4 - (raw[i]! / fmax) * 0.9; // 斥力向上、引力向下
        pts.push(new THREE.Vector3(x, y, 0));
    }
    h.curve.geometry.dispose();
    h.curve.geometry = new THREE.BufferGeometry().setFromPoints(pts);

    const txt = `ε=${(eps / 1e-21).toFixed(2)}×10⁻²¹J  σ=${(sig / 1e-9).toFixed(2)}nm`;
    const canvas = (h.label.material as THREE.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 26px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
        (h.label.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
}
