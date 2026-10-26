/**
 * 电磁复合场与速度选择器 rig — 正交电磁场腔室 (竖直电场 + 垂直纸面向里的磁场) + 速度选择狭缝
 *
 * 物理对应关系 (必须与引擎 em-combined-field 一致, 否则画面表达的物理模型是错的):
 *   - 场景把电场放在 y 轴 (参数 Ey), 引擎只在 |E.x| < 1e-12 时走解析速度选择路径,
 *     即速度选择器要求 **E ⊥ v**; 装置用上下极板产生竖直电场, 与之自洽。
 *   - 引擎取 Bz = +B。在「画布 y 向下」的手性下, Bz > 0 即 ⊗ (垂直纸面向里);
 *     3D 世界 y 轴朝上, 故引擎 +y 必须映射到世界 −y, 才能与「上极板 + / 下极板 −」
 *     的 E 向下 (正电荷受力向下) 相符, 同时满足 qE = qvB 的平衡条件。
 *   - 标牌显示**真实**的 v = E/B 与入射速度 v₀ 的比较结果;
 *     早期版本读取了场景里并不存在的参数名 ('Ey'/'E' 落回默认值 1e4),
 *     于是标牌显示 1.00e+6 m/s —— 比真实值大 1000 倍且超过光速。
 *
 * 比例尺: WORLD_SCALE = 0.32 单位/米。默认参数下 (v₀ = 1000 m/s, duration = 0.01 s)
 * 粒子沿 x 走 10 m = 3.2 世界单位, 恰好从电子枪口 (极板左端 x = -1.3) 走到
 * 荧光屏 (x = 1.9) —— 速度选择器「无偏转通过」的图像才成立。
 * 早期 0.16 的缩放让粒子只走了一半就停在腔室中部, 看起来像「没穿过装置」。
 *
 * 横向: 装置原点落在舞台中心 STAGE_CENTER_X (与 orbitalRig / circularMotionRig 同口径),
 * 否则器材贴在实验平台左边缘, 荧光屏会被画面裁掉。
 */
import * as THREE from 'three';
import { SceneRig, SceneFraming } from '../EquipmentStage';
import { createDeflectionPlates } from '../equipment/deflectionPlates';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const WORLD_SCALE = 0.32;
const FIELD_CENTER_Y = 1.5;
const PLATE_LENGTH = 2.6;
const PLATE_WIDTH = 1.0;
const PLATE_DISTANCE = 1.1;

export interface CombinedHandles {
    platesGroup: THREE.Group;
    exitSlit: THREE.Group;
    fieldLabel: THREE.Sprite;
    verdictLabel: THREE.Sprite;
    panel: THREE.Mesh;
}

/** 场景真实参数 (E 沿 y 轴) */
export function resolveFields(params: Record<string, number>): { E: number; B: number; v0: number } {
    return {
        E: num(params['Ey'] ?? params['E'], 10),
        B: num(params['Bz'] ?? params['B'], 0.01),
        v0: num(params['v0x'], 1000)
    };
}

/** 速率格式化: 大数量级取整数, 小数量级保留有效位, 避免出现 "0 m/s" */
function fmtSpeed(v: number): string {
    const a = Math.abs(v);
    if (!Number.isFinite(v)) return '—';
    if (a >= 100) return v.toFixed(0);
    if (a >= 1) return v.toFixed(2);
    return v.toExponential(2);
}

/** 场参数标牌 */
export function fieldText(E: number, B: number): string {
    const dir = E >= 0 ? '向下' : '向上';
    return `E = ${E.toFixed(1)} N/C (${dir})  |  B = ${B.toFixed(3)} T (⊗ 垂直纸面向里)`;
}

/** 速度选择判定标牌: v₀ 是否等于 E/B */
export function verdictText(E: number, B: number, v0: number): { text: string; color: string } {
    const vSelect = Math.abs(B) > 1e-12 ? Math.abs(E / B) : 0;
    const matched = vSelect > 0 && Math.abs(v0 - vSelect) <= vSelect * 0.01;
    const head = `v选择 = E/B = ${fmtSpeed(vSelect)} m/s`;
    if (matched) {
        return { text: `${head}  |  v₀ = ${fmtSpeed(v0)} m/s → 无偏转通过`, color: '#059669' };
    }
    return { text: `${head}  |  v₀ = ${fmtSpeed(v0)} m/s ≠ E/B → 发生偏转`, color: '#b45309' };
}

/**
 * 磁场方向标记 ⊗ (垂直纸面向里) —— 几何绘制而非文字精灵。
 *
 * 文字精灵的画布 384×128 远大于单个字符, 透明区域会写入深度, 把精灵背后的
 * 粒子轨迹线“挖空”。故 ⊗ 用圆环 + 叉的实体几何绘制, 尺寸也更好控。
 */
function makeFieldIntoMark(size = 0.17): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0x059669, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(size / 2, size * 0.09, 8, 24), material);
    group.add(ring);
    const barLength = size * 0.68;
    const barWidth = size * 0.1;
    const diag1 = new THREE.Mesh(new THREE.BoxGeometry(barLength, barWidth, barWidth), material);
    diag1.rotation.z = Math.PI / 4;
    group.add(diag1);
    const diag2 = new THREE.Mesh(new THREE.BoxGeometry(barLength, barWidth, barWidth), material);
    diag2.rotation.z = -Math.PI / 4;
    group.add(diag2);
    return group;
}

/** 按标牌文字宽度调整背景板尺寸 (取 sprite 实际世界宽度, 否则标牌会溢出背景板) */
function layoutPanel(panel: THREE.Mesh, sprites: THREE.Sprite[]): void {
    let worldWidth = 0;
    let worldHeight = 0;
    for (const sprite of sprites) {
        const fontSize = typeof sprite.userData.textFontSize === 'number' ? sprite.userData.textFontSize : 22;
        const worldPerPx = sprite.scale.y / 128;
        worldWidth = Math.max(worldWidth, sprite.scale.x);
        worldHeight = Math.max(worldHeight, fontSize * worldPerPx);
    }
    panel.scale.set(Math.max(0.6, worldWidth + 0.24), Math.max(0.2, worldHeight * 2.6), 1);
}

export const emCombinedRig: SceneRig = {
    worldScale: WORLD_SCALE,
    /** 电子只是示意粒子: 0.06 世界单位 ≈ 0.19 m, 不能用默认的 0.22 (≈0.7 m) 把枪口整个糊住 */
    ballRadius: 0.06,
    clampToGround: false,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 正交电场偏转板 (上 + / 下 − → 电场向下, 与引擎 +Ey 一致)
        const { group: platesGroup, handles: platesHandles } = createDeflectionPlates(
            PLATE_LENGTH,
            PLATE_WIDTH,
            PLATE_DISTANCE,
            FIELD_CENTER_Y
        );
        platesGroup.position.x = STAGE_CENTER_X;
        // 速度选择器没有「偏转电压」这回事, 隐藏极板组件自带的电压标牌
        platesHandles.voltageLabel.visible = false;
        group.add(platesGroup);

        // 2. 出射速度选择狭缝 (右端仅允许直行通过)
        const exitSlit = new THREE.Group();
        const slitUpper = makeBox(0.04, 0.45, 0.9, 0x1e293b, 0.5, 0.3);
        slitUpper.position.set(STAGE_CENTER_X + 1.4, FIELD_CENTER_Y + 0.32, 0);
        exitSlit.add(slitUpper);

        const slitLower = makeBox(0.04, 0.45, 0.9, 0x1e293b, 0.5, 0.3);
        slitLower.position.set(STAGE_CENTER_X + 1.4, FIELD_CENTER_Y - 0.32, 0);
        exitSlit.add(slitLower);
        group.add(exitSlit);

        // 3. 磁场方向 ⊗ (垂直纸面向里, 与引擎 Bz = +B 一致)
        //    z 放在极板前脸之外: 相机俯视时上极板会挡住腔室中线, ⊗ 必须画在腔室前壁上
        [-0.8, -0.4, 0, 0.4, 0.8].forEach(x => {
            const cross = makeFieldIntoMark();
            cross.position.set(STAGE_CENTER_X + x, FIELD_CENTER_Y, PLATE_WIDTH / 2 + 0.08);
            group.add(cross);
        });

        // 4. 场参数 + 速度选择判定标牌
        const { E, B, v0 } = resolveFields(params);
        const verdict = verdictText(E, B, v0);

        const fieldLabel = makeTextSprite(fieldText(E, B), '#0f172a', 22, { x: 1.7, y: 0.3 });
        fieldLabel.position.set(STAGE_CENTER_X, FIELD_CENTER_Y + 1.15, 0.2);
        group.add(fieldLabel);

        const verdictLabel = makeTextSprite(verdict.text, verdict.color, 22, { x: 1.7, y: 0.3 });
        verdictLabel.position.set(STAGE_CENTER_X, FIELD_CENTER_Y + 0.82, 0.2);
        group.add(verdictLabel);

        const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9, depthWrite: false })
        );
        panel.position.set(STAGE_CENTER_X, FIELD_CENTER_Y + 0.99, 0.185);
        group.add(panel);
        layoutPanel(panel, [fieldLabel, verdictLabel]);

        scene.add(group);

        const handles: CombinedHandles = {
            platesGroup,
            exitSlit,
            fieldLabel,
            verdictLabel,
            panel
        };

        return { group, handles };
    },

    updateEquipment(handles, params) {
        const h = handles as CombinedHandles;
        const { E, B, v0 } = resolveFields(params);

        setLabel(h.fieldLabel, fieldText(E, B), '#0f172a');
        const verdict = verdictText(E, B, v0);
        setLabel(h.verdictLabel, verdict.text, verdict.color);
        layoutPanel(h.panel, [h.fieldLabel, h.verdictLabel]);
    },

    /**
     * 物理坐标 → 3D 坐标。
     *
     * 引擎的 position.y 与画布 y 同手性 (向下为正), 3D 世界 y 轴朝上, 故此处取反:
     * 引擎 +Ey (电场向下) → 世界 −y (下极板方向)。
     */
    getVisualPosition(pos, _params) {
        return new THREE.Vector3(STAGE_CENTER_X - 1.3 + pos.x * WORLD_SCALE, FIELD_CENTER_Y - pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(STAGE_CENTER_X - 1.3, FIELD_CENTER_Y, 0);
    },

    framing(_params, _result): SceneFraming {
        // 装置横向占 x ∈ [STAGE_CENTER_X−1.65, STAGE_CENTER_X+1.93] (荧光屏有 1.2 单位进深,
        // 斜视时横向占位远大于其 x 坐标), 标牌在 y ≈ 2.3~2.8; 取景需覆盖整个腔室
        const distance = 5.4;
        const target: [number, number, number] = [STAGE_CENTER_X + 0.14, 1.72, 0];
        return {
            target,
            position: [target[0] + distance * 0.18, target[1] + distance * 0.22, distance * 0.95],
            distance
        };
    }
};
