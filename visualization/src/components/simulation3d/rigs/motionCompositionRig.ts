/**
 * 运动的合成与分解 3D 实验 Rig（红蜡块实验装置）
 * 水平精密导轨滑座 + 竖直充水刻度玻璃管 + 红蜡块 + 动态速度矢量合成箭头
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface MotionCompositionHandles {
    carriage: THREE.Group;
    wax: THREE.Mesh;
    track: THREE.Mesh;
    arrowVx: THREE.ArrowHelper;
    arrowVy: THREE.ArrowHelper;
    arrowV: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
}

export const motionCompositionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.045, // 吻合红蜡块圆柱尺寸

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 水平铝合金导轨 (长 8m 刻度轨)
        const trackLength = 8.0;
        const track = makeBox(trackLength, 0.08, 0.28, 0x94a3b8, 0.35, 0.85);
        track.position.set(trackLength / 2 - 0.5, 0.04, 0);
        track.receiveShadow = true;
        group.add(track);

        // 导轨立脚
        [-0.4, 1.5, 3.5, 5.5, 7.3].forEach(x => {
            const foot = makeCylinder(0.04, 0.08, 0x475569, 0.4, 0.6);
            foot.position.set(x, 0.04, 0.16);
            group.add(foot);
            const foot2 = makeCylinder(0.04, 0.08, 0x475569, 0.4, 0.6);
            foot2.position.set(x, 0.04, -0.16);
            group.add(foot2);
        });

        // 2. 水平滑动滑座 Carriage (挂载竖直玻璃管)
        const carriage = new THREE.Group();
        const carriageBase = makeBox(0.35, 0.06, 0.32, 0x334155, 0.4, 0.7);
        carriageBase.position.set(0, 0.11, 0);
        carriageBase.castShadow = true;
        carriage.add(carriageBase);

        // 竖直注水玻璃管 (高 3.2m)
        const tubeHeight = 3.2;
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.065, tubeHeight, 24, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.38,
                roughness: 0.05,
                metalness: 0.05,
                transmission: 0.8,
                ior: 1.45,
                side: THREE.DoubleSide
            })
        );
        tube.position.set(0, 0.14 + tubeHeight / 2, 0);
        carriage.add(tube);

        // 玻璃管顶底密封铜盖
        const tubeBottomCap = makeCylinder(0.08, 0.04, 0xd97706, 0.3, 0.8);
        tubeBottomCap.position.set(0, 0.14, 0);
        carriage.add(tubeBottomCap);

        const tubeTopCap = makeCylinder(0.08, 0.04, 0xd97706, 0.3, 0.8);
        tubeTopCap.position.set(0, 0.14 + tubeHeight, 0);
        carriage.add(tubeTopCap);

        // 管体加固夹具
        const tubeClamp = makeBox(0.12, 0.08, 0.18, 0x475569, 0.4, 0.5);
        tubeClamp.position.set(0, 0.35, 0);
        carriage.add(tubeClamp);

        // 3. 红色圆柱形蜡块 (高对比度红蜡)
        const wax = makeCylinder(0.05, 0.09, 0xdc2626, 0.3, 0.3);
        wax.castShadow = true;
        wax.position.set(0, 0.22, 0);
        carriage.add(wax);

        group.add(carriage);

        // 4. 速度矢量箭头 (红蜡块当前速度)
        const arrowVx = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.6, 0x3b82f6, 0.14, 0.08);
        const arrowVy = makeArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.6, 0x10b981, 0.14, 0.08);
        const arrowV = makeArrow(new THREE.Vector3(1, 1, 0), new THREE.Vector3(0, 0, 0), 0.85, 0xef4444, 0.16, 0.09);
        group.add(arrowVx);
        group.add(arrowVy);
        group.add(arrowV);

        // 5. 实时运动参数标牌
        const statusLabel = makeTextSprite('合运动: v = √(vx² + vy²)', '#1e293b', 24, { x: 1.1, y: 0.24 });
        statusLabel.position.set(0.8, 3.2, 0);
        group.add(statusLabel);

        scene.add(group);

        const handles: MotionCompositionHandles = {
            carriage,
            wax,
            track,
            arrowVx,
            arrowVy,
            arrowV,
            statusLabel
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as MotionCompositionHandles;
        const vx = num(params['vxConst'], 2);
        const ay = num(params['vyAccel'], 2);
        if (h.statusLabel) {
            updateTextSprite(h.statusLabel, `水平 vx=${vx} m/s | 竖直 ay=${ay} m/s²`, '#2563eb', 24);
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as MotionCompositionHandles;
        if (!h.carriage || !h.wax) return;

        const ballPos = ctx.ballPos; // 3D 世界坐标
        // 滑座跟随水平位移平移
        h.carriage.position.x = ballPos.x;

        // 红蜡块在管内的竖直位置跟随 ballPos.y (局部 Y)
        h.wax.position.y = Math.max(0.2, ballPos.y);

        // 动态矢量箭头起点对准蜡块
        const origin = new THREE.Vector3(ballPos.x, Math.max(0.2, ballPos.y), 0);
        const vx = num(ctx.params['vxConst'], 2);
        const ay = num(ctx.params['vyAccel'], 2);
        const t = ctx.time;
        const currentVy = ay * t;
        const currentV = Math.hypot(vx, currentVy);

        // 更新水平分速度矢量 (蓝色)
        if (h.arrowVx) {
            h.arrowVx.position.copy(origin);
            h.arrowVx.setDirection(new THREE.Vector3(1, 0, 0));
            h.arrowVx.setLength(Math.max(0.01, vx * 0.22), 0.12, 0.06);
        }

        // 更新竖直分速度矢量 (绿色)
        if (h.arrowVy) {
            h.arrowVy.position.copy(origin);
            h.arrowVy.setDirection(new THREE.Vector3(0, 1, 0));
            h.arrowVy.setLength(Math.max(0.01, currentVy * 0.22), 0.12, 0.06);
        }

        // 更新合速度矢量 (红色)
        if (h.arrowV && currentV > 1e-3) {
            h.arrowV.position.copy(origin);
            const dir = new THREE.Vector3(vx, currentVy, 0).normalize();
            h.arrowV.setDirection(dir);
            h.arrowV.setLength(Math.max(0.01, currentV * 0.22), 0.14, 0.08);
        }

        // 实时 HUD 随动更新
        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `水平 vx=${vx.toFixed(1)}m/s | 竖直 vy=${currentVy.toFixed(2)}m/s | 合速度 v=${currentV.toFixed(2)}m/s`,
                '#2563eb',
                22
            );
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.22 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.22, 0);
    }
};
