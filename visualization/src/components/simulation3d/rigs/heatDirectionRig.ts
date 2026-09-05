/**
 * 热传递方向性实验 rig — 高温物体 + 低温物体 + 接触传热界面 + 自发热流单向流动 + 微观分子热碰撞
 * 验证热力学第二定律 (克劳修斯表述): 热量不能自发地从低温物体传到高温物体，而不引起其他变化
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface HeatDirectionHandles {
    hotBlock: THREE.Mesh;
    coldBlock: THREE.Mesh;
    qArrow: THREE.ArrowHelper;
    particles: THREE.Points;
    particleVelocities: Float32Array;
    label: THREE.Sprite;
}

export const heatDirectionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.0;
        const blockW = 1.2;

        // 隔热防护底座
        const bench = makeBox(blockW * 2 + 0.6, 0.1, 1.2, 0x1e293b, 0.5, 0.2);
        bench.position.set(0, cy - 0.55, 0);
        group.add(bench);

        // ==================== 1. 高温物体 (左侧红体) ====================
        const hotBlock = makeBox(blockW, 0.9, 0.9, 0xdc2626, 0.3, 0.2);
        hotBlock.position.set(-blockW / 2, cy, 0);
        group.add(hotBlock);

        // ==================== 2. 低温物体 (右侧蓝体) ====================
        const coldBlock = makeBox(blockW, 0.9, 0.9, 0x2563eb, 0.3, 0.2);
        coldBlock.position.set(blockW / 2, cy, 0);
        group.add(coldBlock);

        // 中间绝热/导热接触界面线条
        const interfaceLine = makeBox(0.02, 0.92, 0.92, 0xf8fafc, 0.2, 0.9);
        interfaceLine.position.set(0, cy, 0);
        group.add(interfaceLine);

        // ==================== 3. 自发热流单向流动矢量箭头 ====================
        const qArrow = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-0.4, cy + 0.68, 0),
            0.8,
            0xf59e0b,
            0.22,
            0.12
        );
        group.add(qArrow);

        // ==================== 4. 微观碰撞分子群 (左快右慢) ====================
        const pCount = 100;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        const pVel = new Float32Array(pCount * 3);

        for (let i = 0; i < pCount; i++) {
            const isLeft = i < pCount / 2;
            const x = isLeft ? -0.8 + Math.random() * 0.75 : 0.05 + Math.random() * 0.75;
            const y = cy - 0.35 + Math.random() * 0.7;
            const z = -0.35 + Math.random() * 0.7;

            pPos[i * 3] = x;
            pPos[i * 3 + 1] = y;
            pPos[i * 3 + 2] = z;

            const speed = isLeft ? 1.8 : 0.6;
            pVel[i * 3] = (Math.random() - 0.5) * speed;
            pVel[i * 3 + 1] = (Math.random() - 0.5) * speed;
            pVel[i * 3 + 2] = (Math.random() - 0.5) * speed;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
            color: 0xfef08a,
            size: 0.042,
            transparent: true,
            opacity: 0.85
        });
        const particles = new THREE.Points(pGeo, pMat);
        group.add(particles);

        // 状态 HUD
        const label = makeTextSprite('热传递的微观方向性', '#0f172a', 26, { x: 2.5, y: 0.36 });
        label.position.set(0, cy + 1.25, 0);
        group.add(label);

        const handles: HeatDirectionHandles = {
            hotBlock,
            coldBlock,
            qArrow,
            particles,
            particleVelocities: pVel,
            label
        };
        updateHeatDirection(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateHeatDirection(handles as unknown as HeatDirectionHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as HeatDirectionHandles;
        if (!h.particles) return;

        // 热流箭头动态脉动波
        const pulse = 1.0 + Math.sin(ctx.time * 6.0) * 0.12;
        h.qArrow.scale.set(pulse, 1, 1);

        // 内部微粒热碰撞
        const posAttr = h.particles.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const v = h.particleVelocities;
        const cy = 1.0;

        for (let i = 0; i < arr.length / 3; i++) {
            let x = arr[i * 3] ?? 0;
            let y = arr[i * 3 + 1] ?? cy;
            let z = arr[i * 3 + 2] ?? 0;
            let vx = v[i * 3] ?? 0;
            let vy = v[i * 3 + 1] ?? 0;
            let vz = v[i * 3 + 2] ?? 0;

            x += vx * 0.012;
            y += vy * 0.012;
            z += vz * 0.012;

            if (x < -1.1) {
                x = -1.1;
                vx = Math.abs(vx);
            } else if (x > 1.1) {
                x = 1.1;
                vx = -Math.abs(vx);
            }

            if (y < cy - 0.4) {
                y = cy - 0.4;
                vy = Math.abs(vy);
            } else if (y > cy + 0.4) {
                y = cy + 0.4;
                vy = -Math.abs(vy);
            }

            if (z < -0.4) {
                z = -0.4;
                vz = Math.abs(vz);
            } else if (z > 0.4) {
                z = 0.4;
                vz = -Math.abs(vz);
            }

            arr[i * 3] = x;
            arr[i * 3 + 1] = y;
            arr[i * 3 + 2] = z;
            v[i * 3] = vx;
            v[i * 3 + 1] = vy;
            v[i * 3 + 2] = vz;
        }
        posAttr.needsUpdate = true;
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateHeatDirection(h: HeatDirectionHandles, params: Record<string, number>): void {
    const Th = num(params['hotTemp'], 400); // K
    const Tc = num(params['coldTemp'], 250); // K
    const k = num(params['thermalConductivity'], 5); // W/(m*K)

    const deltaT = Th - Tc;
    const arrowLen = Math.min(1.2, Math.max(0.3, (deltaT / 200) * 0.8));
    h.qArrow.scale.set(arrowLen / 0.8, 1, 1);

    setLabel(
        h.label,
        `高温物体 T_h=${Th.toFixed(0)}K → 低温物体 T_c=${Tc.toFixed(0)}K (ΔT=${deltaT.toFixed(0)}K, k=${k}W/m·K) | 克劳修斯表述: 热量只能自发由高温传向低温`,
        '#0f172a'
    );
}
