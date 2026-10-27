/**
 * 电场线分布 rig — 点电荷 / 电偶极 / 平行板 (#159 F-A3 / #161)
 *
 * 单一真源：场线折线几何直接读引擎 `extra.fieldLines`（归一化场景坐标），
 * 最大场强读 `diagnostics.maxValues.maxField`；rig 不另造场线。
 * 背景：efield-lines 曾误用 fieldRig（匀强场 + 霍尔），3D 显示与「电荷/偶极/极板场线」无关 (#159 F-A3)。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeSphere, makeTextSprite } from '../primitives';
import { readElectricFieldExtra } from '../../../rendering/engineExtraAccess';
import { num, setLabel, STAGE_CENTER_X } from './params';

/** 显示盒：场线拟合到的世界宽/高 (单位) */
const BOX_W = 4.2;
const BOX_H = 2.4;
/** 显示盒中心高度 */
const CENTER_Y = 1.5;

const MODE_LABEL: Record<number, string> = {
    0: '点电荷场',
    1: '电偶极场',
    2: '平行板匀强场'
};

export interface EfieldHandles {
    group: THREE.Group;
    lines: THREE.Line[];
    charges: THREE.Mesh[];
    plates: THREE.Mesh[];
    infoLabel: THREE.Sprite;
}

interface Fit {
    s: number;
    midX: number;
    midY: number;
}

/** 归一化场景坐标 → 世界坐标 (按全部场线包围盒等比拟合显示盒) */
function makeFit(points: Array<{ x: number; y: number }>): Fit {
    if (!points.length) return { s: 1, midX: 0, midY: 0 };
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    for (const p of points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    return {
        s: Math.min(BOX_W / spanX, BOX_H / spanY),
        midX: (minX + maxX) / 2,
        midY: (minY + maxY) / 2
    };
}

function toWorld(p: { x: number; y: number }, fit: Fit): THREE.Vector3 {
    return new THREE.Vector3(STAGE_CENTER_X + (p.x - fit.midX) * fit.s, CENTER_Y + (p.y - fit.midY) * fit.s, 0);
}

export const efieldLinesRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 8.2;
        return {
            target,
            position: [target[0] + distance * 0.12, target[1] + distance * 0.22, distance * 0.94],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const extra = result ? readElectricFieldExtra((result as { extra?: unknown }).extra) : null;
        const allPts = (extra?.fieldLines ?? []).flatMap(l => l.points);
        const fit = makeFit(allPts);

        const lines: THREE.Line[] = [];
        for (const fl of extra?.fieldLines ?? []) {
            if (fl.points.length < 2) continue;
            const color = fl.sign > 0 ? 0xef4444 : 0x3b82f6;
            const line = makeLine(
                fl.points.map(p => toWorld(p, fit)),
                color,
                0.75
            );
            group.add(line);
            lines.push(line);
        }

        // 电荷/极板标记 (参数驱动几何；场线才是引擎几何)
        const charges: THREE.Mesh[] = [];
        const plates: THREE.Mesh[] = [];
        const mode = Math.round(num(params['mode'], 0));
        if (mode === 0) {
            const c = makeSphere(0.16, 0xef4444, { emissive: 0x991b1b, emissiveIntensity: 0.25 });
            c.position.copy(toWorld({ x: 0, y: 0 }, { ...fit, midX: 0, midY: 0 }));
            group.add(c);
            charges.push(c);
        } else if (mode === 1) {
            const sep = num(params['dipoleSeparation'], 1);
            const pos = makeSphere(0.15, 0xef4444, { emissive: 0x991b1b, emissiveIntensity: 0.25 });
            pos.position.copy(toWorld({ x: -sep / 2, y: 0 }, { ...fit, midX: 0, midY: 0 }));
            group.add(pos);
            const neg = makeSphere(0.15, 0x3b82f6, { emissive: 0x1e3a8a, emissiveIntensity: 0.25 });
            neg.position.copy(toWorld({ x: sep / 2, y: 0 }, { ...fit, midX: 0, midY: 0 }));
            group.add(neg);
            charges.push(pos, neg);
        } else {
            const gap = Math.max(num(params['plateGap'], 1.2), 0.2);
            for (const sy of [-1, 1]) {
                const plate = makeBox(BOX_W * 0.9, 0.08, 0.5, sy < 0 ? 0xef4444 : 0x3b82f6, 0.5, 0.2);
                plate.position.set(STAGE_CENTER_X, CENTER_Y + ((sy * gap) / 2) * fit.s, 0);
                group.add(plate);
                plates.push(plate);
            }
        }

        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 1.1, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + BOX_H / 2 + 0.62, 0.2);
        group.add(infoLabel);

        const handles: EfieldHandles = { group, lines, charges, plates, infoLabel };
        applyInfo(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyInfo(handles as EfieldHandles, params, result);
    },

    onAnimate() {
        /* 静态场线，无逐帧动画 */
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, CENTER_Y, 0);
    }
};

function applyInfo(
    h: EfieldHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): void {
    const mode = Math.round(num(params['mode'], 0));
    const extra = result ? readElectricFieldExtra((result as { extra?: unknown }).extra) : null;
    const maxField = num(result?.diagnostics?.maxValues?.['maxField'], NaN);
    const nLines = extra?.fieldLines.length ?? 0;
    const modeText = MODE_LABEL[mode] ?? '电场线';
    const eText = Number.isFinite(maxField) ? `最大场强 |E|max = ${(maxField / 1000).toFixed(1)} kV/m` : '最大场强 —';
    setLabel(h.infoLabel, `${modeText} | 场线 ${nLines} 条 (几何源自引擎) | ${eText}`, '#1e293b');
}
