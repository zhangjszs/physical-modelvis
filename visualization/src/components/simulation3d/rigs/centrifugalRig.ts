/**
 * 离心现象 3D 实验 Rig
 * 真实可调速旋转圆盘 + 径向刻度滑槽 + 摩擦块 + 离心脱轨与静摩擦力临界判定
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeBox, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface CentrifugalHandles {
    discGroup: THREE.Group;
    block: THREE.Mesh;
    shaft: THREE.Mesh;
    arrowFriction: THREE.ArrowHelper;
    arrowVelocity: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    critLabel: THREE.Sprite;
    r: number;
    omega: number;
    mu: number;
}

export const centrifugalRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.001, // 槽内滑块与离心试管主导视觉

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 基座与电机马达壳体
        const base = makeBox(2.2, 0.05, 2.2, 0x1e293b, 0.4, 0.3);
        base.position.set(0, 0.025, 0);
        base.receiveShadow = true;
        group.add(base);

        const motorHousing = makeCylinder(0.24, 0.4, 0x334155, 0.4, 0.6);
        motorHousing.position.set(0, 0.25, 0);
        motorHousing.castShadow = true;
        group.add(motorHousing);

        // 2. 旋转转盘系统 (discGroup 包含转盘、径向滑槽与刻度)
        const discGroup = new THREE.Group();
        discGroup.position.set(0, 0.47, 0);

        // 旋转轴承主轴
        const shaft = makeCylinder(0.06, 0.15, 0xd97706, 0.3, 0.85);
        shaft.position.set(0, 0, 0);
        discGroup.add(shaft);

        // 铝合金大圆盘 (直径 2.0m, 半径 1.0m)
        const disc = makeCylinder(1.0, 0.04, 0x64748b, 0.35, 0.7);
        disc.receiveShadow = true;
        discGroup.add(disc);

        // 径向凹槽滑轨 (从中心引向边缘)
        const groove = makeBox(0.95, 0.015, 0.06, 0x1e293b, 0.5, 0.2);
        groove.position.set(0.48, 0.021, 0);
        discGroup.add(groove);

        // 对称配重凹槽
        const grooveOpposite = makeBox(0.95, 0.015, 0.06, 0x1e293b, 0.5, 0.2);
        grooveOpposite.position.set(-0.48, 0.021, 0);
        discGroup.add(grooveOpposite);

        // 双对称倾斜离心试管套筒 (离心分离机特征器材)
        const tubeArm1 = makeBox(0.04, 0.025, 0.45, 0x334155, 0.4, 0.6);
        tubeArm1.position.set(0, 0.035, 0.42);
        discGroup.add(tubeArm1);
        const tube1 = makeCylinder(0.024, 0.2, 0x38bdf8, 0.2, 0.8);
        tube1.position.set(0, 0.065, 0.62);
        tube1.rotation.x = -Math.PI / 6;
        discGroup.add(tube1);

        const tubeArm2 = makeBox(0.04, 0.025, 0.45, 0x334155, 0.4, 0.6);
        tubeArm2.position.set(0, 0.035, -0.42);
        discGroup.add(tubeArm2);
        const tube2 = makeCylinder(0.024, 0.2, 0x38bdf8, 0.2, 0.8);
        tube2.position.set(0, 0.065, -0.62);
        tube2.rotation.x = Math.PI / 6;
        discGroup.add(tube2);

        // 圆周同心刻度环
        [0.25, 0.5, 0.75, 0.95].forEach(radius => {
            const ringGeo = new THREE.RingGeometry(radius - 0.005, radius + 0.005, 48);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0.022, 0);
            discGroup.add(ring);
        });

        // 3. 摩擦滑块 (放置在转盘槽中)
        const block = makeBox(0.09, 0.06, 0.08, 0xef4444, 0.3, 0.2);
        block.castShadow = true;
        block.position.set(0.3, 0.05, 0);
        discGroup.add(block);

        group.add(discGroup);

        // 4. 动态受力与速度矢量
        const arrowFriction = makeArrow(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            0.5,
            0x3b82f6,
            0.12,
            0.06
        );
        const arrowVelocity = makeArrow(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            0.6,
            0x10b981,
            0.12,
            0.06
        );
        group.add(arrowFriction);
        group.add(arrowVelocity);

        // 5. 状态与临界判据标牌
        const statusLabel = makeTextSprite('离心实验转台', '#0f172a', 24, { x: 1.1, y: 0.24 });
        statusLabel.position.set(0, 1.45, 0);
        group.add(statusLabel);

        const critLabel = makeTextSprite('受力平衡', '#059669', 20, { x: 0.95, y: 0.2 });
        critLabel.position.set(0, 1.2, 0);
        group.add(critLabel);

        scene.add(group);

        const handles: CentrifugalHandles = {
            discGroup,
            block,
            shaft,
            arrowFriction,
            arrowVelocity,
            statusLabel,
            critLabel,
            r: 0.3,
            omega: 5,
            mu: 0.5
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CentrifugalHandles;
        const r = num(params['radius'], 0.3);
        const omega = num(params['angularSpeed'], 5);
        const mu = num(params['frictionCoeff'], 0.5);
        const g = 9.8;
        h.r = r;
        h.omega = omega;
        h.mu = mu;

        // 临界角速度判定: ω_crit = √(μg / r)
        const omegaCrit = Math.sqrt((mu * g) / Math.max(1e-3, r));
        const willSlip = omega > omegaCrit;

        // 设置物块在未脱轨时的初始半径位置
        h.block.position.x = r;

        if (h.statusLabel) {
            updateTextSprite(h.statusLabel, `角速度 ω=${omega} rad/s | 半径 r=${r}m | μ=${mu}`, '#2563eb', 24);
        }
        if (h.critLabel) {
            if (!willSlip) {
                updateTextSprite(
                    h.critLabel,
                    `✅ 随盘转动 (静摩擦提供向心力: ω ≤ ω_临界 ${omegaCrit.toFixed(2)})`,
                    '#059669',
                    20
                );
            } else {
                updateTextSprite(
                    h.critLabel,
                    `⚠️ 发生离心现象！(向心力不足: ω > ω_临界 ${omegaCrit.toFixed(2)})`,
                    '#ef4444',
                    20
                );
            }
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CentrifugalHandles;
        if (!h.discGroup || !h.block) return;

        const omega = h.omega;
        const r0 = h.r;
        const mu = h.mu;
        const g = 9.8;
        const omegaCrit = Math.sqrt((mu * g) / Math.max(1e-3, r0));
        const willSlip = omega > omegaCrit;
        const t = ctx.time;

        // 转盘旋转角
        const angle = (omega * t) % (Math.PI * 2);
        h.discGroup.rotation.y = angle;

        let currentR = r0;
        if (willSlip) {
            // 发生离心外滑
            const slipA = (omega * omega - (mu * g) / r0) * 0.4;
            currentR = Math.min(1.05, r0 + 0.5 * slipA * t * t);
            h.block.position.x = currentR;
        } else {
            h.block.position.x = r0;
        }

        // 计算滑块的世界坐标
        const worldX = currentR * Math.cos(angle);
        const worldZ = -currentR * Math.sin(angle);
        const worldPos = new THREE.Vector3(worldX, 0.52, worldZ);

        // 矢量更新
        if (h.arrowFriction && !willSlip) {
            h.arrowFriction.visible = true;
            h.arrowFriction.position.copy(worldPos);
            // 静摩擦指向圆心
            h.arrowFriction.setDirection(new THREE.Vector3(-worldX, 0, -worldZ).normalize());
            h.arrowFriction.setLength(Math.min(0.5, currentR * 0.8), 0.1, 0.05);
        } else if (h.arrowFriction) {
            h.arrowFriction.visible = false;
        }

        if (h.arrowVelocity) {
            h.arrowVelocity.position.copy(worldPos);
            // 切线速度方向
            const tangDir = new THREE.Vector3(-worldZ, 0, worldX).normalize();
            h.arrowVelocity.setDirection(tangDir);
            h.arrowVelocity.setLength(Math.min(0.6, omega * currentR * 0.15), 0.12, 0.06);
        }

        // 实时 HUD 随动更新
        if (h.statusLabel) {
            const m = num(ctx.params['mass'], 1);
            const fCentReq = m * omega * omega * currentR;
            const fMaxFrict = m * mu * g;
            updateTextSprite(
                h.statusLabel,
                `ω=${omega.toFixed(1)}rad/s | r=${currentR.toFixed(2)}m | 向心力需求=${fCentReq.toFixed(1)}N, 最大静摩擦=${fMaxFrict.toFixed(1)}N`,
                '#2563eb',
                22
            );
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.52, pos.y * WORLD_SCALE);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.3, 0.52, 0);
    }
};
