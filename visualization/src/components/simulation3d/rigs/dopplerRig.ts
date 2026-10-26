/**
 * 多普勒效应 rig — 移动波源 + 同心波前 + 前后观察者 (#159 F-A2 / #161)
 *
 * 单一真源：观察者读数 f′ 与 f₀/v/v_s/λ 全部读引擎
 *   - charts.fprime_vs_theta 在 θ=0°(迎)/180°(背) 插值 → 前/后观察者 f′
 *   - diagnostics.maxValues (f0/fObserved/fBeat/lambda/v/vs) → 信息标牌
 * 波前几何用引擎 v 与 v_s 的**真实比值**做展示缩放（前方压缩/后方拉伸），不另造物理。
 *
 * 背景：doppler-effect 曾误用机械波 waveRig（读 extra.waveMedium，doppler 无此 extra），
 * 3D 显示空介质台架 + 「v=λf=1.00 m/s」（声速应 340）等冻结默认读数 (#159 F-A2)。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeLine, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

/** 展示轨高度 (世界单位) */
const RAIL_Y = 1.2;
/** 展示轨半长 (世界单位) */
const RAIL_HALF = 3.0;
/** 波前行进展示速度 (单位/秒) —— 仅时间轴缩放, 压缩比用引擎真实 vs/v */
const WAVE_DISPLAY_SPEED = 1.4;
/** 波前环上限 */
const MAX_FRONTS = 9;
/** 波前发射间隔 (展示秒) */
const EMIT_PERIOD = 0.55;

export interface DopplerHandles {
    group: THREE.Group;
    rail: THREE.Line;
    source: THREE.Mesh;
    fronts: THREE.Line[];
    /** 每个波前的发射时刻 (展示时钟) 与发射位置 x */
    frontBirth: Array<{ t: number; x: number }>;
    frontObs: THREE.Mesh;
    backObs: THREE.Mesh;
    frontLabel: THREE.Sprite;
    backLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
    /** 引擎真实 vs/v (展示压缩比) */
    ratio: number;
    lastEmit: number;
}

/** 在 θ 扫描曲线上插值 f′(θ)；缺数据回退 null */
function fprimeAt(thetaScan: { points: Array<{ x: number; y: number }> } | undefined, deg: number): number | null {
    const pts = thetaScan?.points;
    if (!pts || pts.length < 2) return null;
    if (deg <= pts[0]!.x) return pts[0]!.y;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        if (deg <= b.x) {
            const t = (deg - a.x) / Math.max(b.x - a.x, 1e-9);
            return a.y + (b.y - a.y) * t;
        }
    }
    return pts[pts.length - 1]!.y;
}

function makeFrontRing(): THREE.Line {
    const seg = 48;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    const line = makeLine(pts, 0x38bdf8, 0.55);
    line.visible = false;
    return line;
}

export const dopplerRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, RAIL_Y + 0.4, 0];
        const distance = 9.5;
        return {
            target,
            position: [target[0] + distance * 0.15, target[1] + distance * 0.3, distance * 0.92],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();

        const rail = makeLine(
            [
                new THREE.Vector3(STAGE_CENTER_X - RAIL_HALF, RAIL_Y, 0),
                new THREE.Vector3(STAGE_CENTER_X + RAIL_HALF, RAIL_Y, 0)
            ],
            0x94a3b8,
            0.8
        );
        group.add(rail);

        const source = makeSphere(0.14, 0xf59e0b, { emissive: 0x7c2d12, emissiveIntensity: 0.25 });
        source.position.set(STAGE_CENTER_X - RAIL_HALF + 0.6, RAIL_Y, 0);
        group.add(source);

        const fronts: THREE.Line[] = [];
        for (let i = 0; i < MAX_FRONTS; i++) {
            const ring = makeFrontRing();
            group.add(ring);
            fronts.push(ring);
        }

        const frontObs = makeSphere(0.12, 0x22c55e);
        frontObs.position.set(STAGE_CENTER_X + RAIL_HALF - 0.25, RAIL_Y, 0);
        group.add(frontObs);
        const backObs = makeSphere(0.12, 0xef4444);
        backObs.position.set(STAGE_CENTER_X - RAIL_HALF + 0.25, RAIL_Y, 0);
        group.add(backObs);

        const frontLabel = makeTextSprite('', '#15803d', 22, { x: 1.9, y: 0.34 });
        frontLabel.position.set(STAGE_CENTER_X + RAIL_HALF - 0.25, RAIL_Y + 0.62, 0);
        group.add(frontLabel);
        const backLabel = makeTextSprite('', '#b91c1c', 22, { x: 1.9, y: 0.34 });
        backLabel.position.set(STAGE_CENTER_X - RAIL_HALF + 0.25, RAIL_Y + 0.62, 0);
        group.add(backLabel);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.2, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, RAIL_Y + 1.5, 0.2);
        group.add(infoLabel);

        const handles: DopplerHandles = {
            group,
            rail,
            source,
            fronts,
            frontBirth: [],
            frontObs,
            backObs,
            frontLabel,
            backLabel,
            infoLabel,
            ratio: 0,
            lastEmit: -1
        };
        applyReadouts(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as DopplerHandles, params, result);
    },

    onAnimate(handles, ctx) {
        const h = handles as DopplerHandles;
        const t = ctx.time;
        const sourceVx = WAVE_DISPLAY_SPEED * h.ratio; // 展示压缩比 = 引擎真实 vs/v
        const x0 = STAGE_CENTER_X - RAIL_HALF + 0.6;
        // 波源在轨内往返 (展示), 位置由展示时钟积分
        const span = 2 * (RAIL_HALF - 0.7);
        const phase = (t * sourceVx) % (2 * span);
        const sx = x0 + (phase < span ? phase : 2 * span - phase);
        h.source.position.x = sx;

        // 周期发射波前
        if (t - h.lastEmit >= EMIT_PERIOD || h.lastEmit < 0) {
            h.lastEmit = t;
            h.frontBirth.push({ t, x: sx });
            if (h.frontBirth.length > MAX_FRONTS) h.frontBirth.shift();
        }
        // 波前半径 = 展示波速 × 年龄; 圆心 = 发射时波源位置 (真实多普勒波前几何)
        for (let i = 0; i < h.fronts.length; i++) {
            const birth = h.frontBirth[i];
            const ring = h.fronts[i]!;
            if (!birth) {
                ring.visible = false;
                continue;
            }
            const age = t - birth.t;
            const radius = age * WAVE_DISPLAY_SPEED;
            if (radius > RAIL_HALF * 2.2) {
                ring.visible = false;
                continue;
            }
            ring.visible = true;
            ring.position.set(birth.x, RAIL_Y, 0);
            ring.scale.setScalar(Math.max(radius, 1e-4));
            const mat = ring.material as THREE.LineBasicMaterial;
            mat.opacity = Math.max(0.08, 0.55 * (1 - radius / (RAIL_HALF * 2.2)));
        }
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, RAIL_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X - RAIL_HALF + 0.6, RAIL_Y, 0);
    }
};

/** 读数单一真源：观察者 f′ 读引擎 θ 扫描, 信息牌读 maxValues（导出供契约测试） */
export function dopplerReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): { f0: number; v: number; vs: number; lambda: number; ratio: number; fFront: number | null; fBack: number | null } {
    const mv = result?.diagnostics?.maxValues ?? {};
    const f0 = num(mv.f0, num(params['sourceFreq'], 500));
    const v = num(mv.v, num(params['soundSpeed'], 340));
    const vs = num(mv.vs, num(params['sourceSpeed'], 30));
    const lambda = num(mv.lambda, v / Math.max(f0, 1e-9));
    const ratio = Math.min(Math.abs(vs) / Math.max(v, 1e-9), 0.9);
    const thetaScan = result ? chartsOf(result, 'doppler')?.fprime_vs_theta : undefined;
    return { f0, v, vs, lambda, ratio, fFront: fprimeAt(thetaScan, 0), fBack: fprimeAt(thetaScan, 180) };
}

function applyReadouts(
    h: DopplerHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): void {
    const r = dopplerReadouts(params, result);
    h.ratio = r.ratio;
    setLabel(h.frontLabel, `前(迎) f′ = ${r.fFront !== null ? r.fFront.toFixed(2) : '—'} Hz`, '#15803d');
    setLabel(h.backLabel, `后(背) f′ = ${r.fBack !== null ? r.fBack.toFixed(2) : '—'} Hz`, '#b91c1c');
    setLabel(
        h.infoLabel,
        `f₀ = ${r.f0.toFixed(0)} Hz | v = ${r.v.toFixed(0)} m/s | v_s = ${r.vs.toFixed(0)} m/s | λ = ${r.lambda.toFixed(2)} m (读数源自引擎)`,
        '#1e293b'
    );
}
