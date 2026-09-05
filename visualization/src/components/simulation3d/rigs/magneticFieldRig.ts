/**
 * 带电粒子在匀强磁场中偏转 rig — 圆形磁场边界 + 磁感线垂直标示 + 动态洛伦兹力
 * 验证洛伦兹力提供向心力 qvB = mv²/R → R = mv/(qB)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const FIELD_CENTER_Y = 1.5;
const N = 48;

interface MFieldHandles {
    fieldBoundary: THREE.Line;
    lorentzArrow: THREE.ArrowHelper;
    infoLabel: THREE.Sprite;
}

const _fieldCenter = new THREE.Vector3(0, FIELD_CENTER_Y, 0);
const _lorentzDir = new THREE.Vector3();

export const magneticFieldRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: false,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 圆形匀强磁场边界 (浅绿色半透明圆柱腔)
        const chamber = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 0.6, 48),
            new THREE.MeshStandardMaterial({
                color: 0x10b981,
                transparent: true,
                opacity: 0.12,
                roughness: 0.3
            })
        );
        chamber.rotation.x = Math.PI / 2;
        chamber.position.set(0, FIELD_CENTER_Y, 0);
        group.add(chamber);

        // 磁场边界线
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= N; i++) {
            const a = (i / N) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * 1.6, FIELD_CENTER_Y + Math.sin(a) * 1.6, 0.05));
        }
        const fieldBoundary = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x059669, linewidth: 2 })
        );
        group.add(fieldBoundary);

        // 2. 磁感线 ⊗ (垂直纸面向里符号网格)
        const gridOffsets = [-0.9, -0.45, 0, 0.45, 0.9];
        gridOffsets.forEach(x => {
            gridOffsets.forEach(y => {
                if (x * x + y * y < 1.3 * 1.3) {
                    const cross = makeTextSprite('⊗', '#047857', 24, { x: 0.2, y: 0.2 });
                    cross.position.set(x, FIELD_CENTER_Y + y, 0.02);
                    group.add(cross);
                }
            });
        });

        // 3. 入射准直管
        const collimator = makeCylinder(0.08, 0.5, 0x334155, 0.4, 0.6);
        collimator.rotation.z = Math.PI / 2;
        collimator.position.set(-1.8, FIELD_CENTER_Y, 0);
        group.add(collimator);

        // 4. 洛伦兹力动态矢量
        const lorentzArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, FIELD_CENTER_Y, 0),
            0.6,
            0xef4444,
            0.12,
            0.08
        );
        group.add(lorentzArrow);

        // 5. 测量标牌
        const B = num(params['B'] ?? params['Bz'], 0.1);
        const v = num(params['v'] ?? params['v0'], 1e6);
        const infoLabel = makeTextSprite(
            `B = ${B.toFixed(2)} T, v₀ = ${v.toExponential(1)} m/s | 洛伦兹力 f = qvB ⊥ v`,
            '#047857',
            24,
            { x: 1.5, y: 0.22 }
        );
        infoLabel.position.set(0, FIELD_CENTER_Y + 1.9, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: MFieldHandles = {
            fieldBoundary,
            lorentzArrow,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as MFieldHandles;
        const B = num(params['B'] ?? params['Bz'], 0.1);
        setLabel(h.infoLabel, `磁感应强度 B = ${B.toFixed(2)} T | 洛伦兹力 f = qvB ⊥ v`, '#047857');
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as MFieldHandles;
        // 洛伦兹力指向圆心 (复用模块级临时向量，零内存分配)
        _lorentzDir.subVectors(_fieldCenter, ctx.ballPos).normalize();
        h.lorentzArrow.position.copy(ctx.ballPos);
        h.lorentzArrow.setDirection(_lorentzDir);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, FIELD_CENTER_Y + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.6, FIELD_CENTER_Y, 0);
    }
};
