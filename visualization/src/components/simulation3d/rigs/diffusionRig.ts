/**
 * 扩散现象实验 rig — 双联磨砂玻璃集气瓶 (二氧化氮与空气扩散) / 硫酸铜与水液体扩散
 * 模拟抽开中间隔板后分子热运动自发渗透扩散过程，验证分子的无规则热运动与温度关系
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface DiffusionHandles {
    glassSlide: THREE.Mesh;
    gasTop: THREE.Mesh;
    gasBottom: THREE.Mesh;
    particlePoints: THREE.Points;
    particleVelocities: Float32Array;
    label: THREE.Sprite;
    standGroup: THREE.Group;
}

export const diffusionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.35;
        const isLiquid = Math.round(num(params['medium'], 0)) === 1;

        // ==================== 1. 实验室铁架台夹持系统 ====================
        const standGroup = new THREE.Group();
        // 铁架台底座
        const ironBase = makeBox(0.9, 0.08, 0.7, 0x1e293b, 0.6, 0.2);
        ironBase.position.set(-0.65, 0.04, 0);
        standGroup.add(ironBase);
        // 不锈钢立杆
        const pole = makeCylinder(0.024, 2.5, 0x94a3b8, 0.2, 0.85);
        pole.position.set(-0.65, 1.25, 0);
        standGroup.add(pole);
        // 双十字夹与环形固定夹
        for (const yClamp of [cy - 0.5, cy + 0.5]) {
            const clampHolder = makeBox(0.08, 0.08, 0.08, 0x334155, 0.5, 0.4);
            clampHolder.position.set(-0.65, yClamp, 0);
            standGroup.add(clampHolder);
            const clampRod = makeCylinder(0.015, 0.62, 0xd4d4d8, 0.2, 0.8);
            clampRod.rotation.z = Math.PI / 2;
            clampRod.position.set(-0.35, yClamp, 0);
            standGroup.add(clampRod);
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.44, 0.025, 12, 36),
                new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(0, yClamp, 0);
            standGroup.add(ring);
        }
        group.add(standGroup);

        // ==================== 2. 双联集气瓶 (上下口对口对齐) ====================
        const bottleR = 0.42;
        const bottleH = 0.95;
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xe0f2fe,
            transparent: true,
            opacity: 0.25,
            roughness: 0.06,
            transmission: 0.9,
            ior: 1.48,
            side: THREE.DoubleSide
        });

        // 下瓶 (含棕红 NO2 气体 或 蓝 CuSO4 溶液)
        const jarBottom = new THREE.Mesh(new THREE.CylinderGeometry(bottleR, bottleR, bottleH, 36, 1, true), glassMat);
        jarBottom.position.set(0, cy - bottleH / 2 - 0.02, 0);
        group.add(jarBottom);

        // 上瓶 (含无色空气 或 清水)
        const jarTop = new THREE.Mesh(new THREE.CylinderGeometry(bottleR, bottleR, bottleH, 36, 1, true), glassMat);
        jarTop.position.set(0, cy + bottleH / 2 + 0.02, 0);
        group.add(jarTop);

        // 玻璃瓶盖与瓶底
        const capTop = makeCylinder(bottleR + 0.04, 0.04, 0x334155, 0.3, 0.5);
        capTop.position.set(0, cy + bottleH + 0.04, 0);
        group.add(capTop);
        const baseBottom = makeCylinder(bottleR + 0.04, 0.04, 0x334155, 0.3, 0.5);
        baseBottom.position.set(0, cy - bottleH - 0.04, 0);
        group.add(baseBottom);

        // 内部气体/液体材质体
        const gasBottom = new THREE.Mesh(
            new THREE.CylinderGeometry(bottleR * 0.96, bottleR * 0.96, bottleH * 0.96, 32),
            new THREE.MeshStandardMaterial({
                color: isLiquid ? 0x2563eb : 0xb45309,
                transparent: true,
                opacity: 0.75,
                roughness: 0.4
            })
        );
        gasBottom.position.set(0, cy - bottleH / 2 - 0.02, 0);
        group.add(gasBottom);

        const gasTop = new THREE.Mesh(
            new THREE.CylinderGeometry(bottleR * 0.96, bottleR * 0.96, bottleH * 0.96, 32),
            new THREE.MeshStandardMaterial({
                color: isLiquid ? 0x93c5fd : 0xf1f5f9,
                transparent: true,
                opacity: 0.12,
                roughness: 0.4
            })
        );
        gasTop.position.set(0, cy + bottleH / 2 + 0.02, 0);
        group.add(gasTop);

        // ==================== 3. 抽拉式磨砂玻璃隔离片 ====================
        const glassSlide = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.02, 0.95),
            new THREE.MeshPhysicalMaterial({
                color: 0xf8fafc,
                transparent: true,
                opacity: 0.65,
                roughness: 0.5,
                transmission: 0.5
            })
        );
        glassSlide.position.set(0, cy, 0);
        // 隔板右侧拉手把柄
        const slideHandle = makeCylinder(0.04, 0.22, 0xdc2626, 0.3, 0.8);
        slideHandle.position.set(0.62, 0, 0);
        glassSlide.add(slideHandle);
        group.add(glassSlide);

        // ==================== 4. 动态扩散微观粒子群 ====================
        const pCount = Math.min(180, Math.max(40, Math.round(num(params['particleCount'], 500) / 4)));
        const pGeo = new THREE.BufferGeometry();
        const pPositions = new Float32Array(pCount * 3);
        const particleVelocities = new Float32Array(pCount * 3);

        for (let i = 0; i < pCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * (bottleR * 0.88);
            // 初始粒子主要聚集在下半瓶
            pPositions[i * 3] = Math.cos(theta) * r;
            pPositions[i * 3 + 1] = cy - 0.1 - Math.random() * (bottleH * 0.85);
            pPositions[i * 3 + 2] = Math.sin(theta) * r;

            particleVelocities[i * 3] = (Math.random() - 0.5) * 1.2;
            particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
            particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        const pMat = new THREE.PointsMaterial({
            color: isLiquid ? 0x60a5fa : 0xd97706,
            size: 0.045,
            transparent: true,
            opacity: 0.85
        });
        const particlePoints = new THREE.Points(pGeo, pMat);
        group.add(particlePoints);

        // 状态 HUD
        const label = makeTextSprite('气体扩散 (NO₂ + 空气)', '#0f172a', 26, { x: 2.3, y: 0.36 });
        label.position.set(0, cy + bottleH + 0.45, 0);
        group.add(label);

        const handles: DiffusionHandles = {
            glassSlide,
            gasTop,
            gasBottom,
            particlePoints,
            particleVelocities,
            label,
            standGroup
        };
        updateDiffusion(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateDiffusion(handles as unknown as DiffusionHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as DiffusionHandles;
        if (!h.particlePoints) return;

        const cy = 1.35;
        const bottleR = 0.42;
        const bottleH = 0.95;
        const T = num(ctx.params['temperature'], 300);
        const isLiquid = Math.round(num(ctx.params['medium'], 0)) === 1;
        const baseSpeed = (isLiquid ? 0.003 : 0.016) * Math.sqrt(Math.max(50, T) / 300);

        // 模拟时间驱动：抽拉隔板
        const animProgress = Math.min(1.0, (ctx.time % 6.0) / 2.0); // 前 2 秒抽拉隔板，之后充分扩散
        h.glassSlide.position.x = animProgress * 1.1; // 抽开到右侧

        // 扩散混合比率 (随时间增加)
        const mixRatio = Math.max(0, Math.min(1, ((ctx.time % 6.0) - 1.0) / 4.0));
        const bottomMat = h.gasBottom.material as THREE.MeshStandardMaterial;
        const topMat = h.gasTop.material as THREE.MeshStandardMaterial;
        if (isLiquid) {
            topMat.opacity = 0.12 + mixRatio * 0.45;
            bottomMat.opacity = 0.75 - mixRatio * 0.25;
        } else {
            topMat.opacity = 0.12 + mixRatio * 0.48;
            bottomMat.opacity = 0.75 - mixRatio * 0.22;
        }

        // 粒子随热运动扩散穿过交界面
        const posAttr = h.particlePoints.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const v = h.particleVelocities;
        const rMax = bottleR * 0.88;
        const yMin = cy - bottleH + 0.05;
        const yMax = cy + bottleH - 0.05;

        for (let i = 0; i < arr.length / 3; i++) {
            let x = arr[i * 3] ?? 0;
            let y = arr[i * 3 + 1] ?? cy - 0.3;
            let z = arr[i * 3 + 2] ?? 0;
            let vx = v[i * 3] ?? 0;
            let vy = v[i * 3 + 1] ?? 0;
            let vz = v[i * 3 + 2] ?? 0;

            x += vx * baseSpeed;
            y += vy * baseSpeed;
            z += vz * baseSpeed;

            // 侧壁圆柱碰撞
            const r = Math.hypot(x, z);
            if (r > rMax) {
                const normX = x / r;
                const normZ = z / r;
                const dot = vx * normX + vz * normZ;
                vx -= 2 * dot * normX;
                vz -= 2 * dot * normZ;
                x = normX * rMax * 0.98;
                z = normZ * rMax * 0.98;
            }

            // 隔板阻挡：隔板未抽开时 (x > 0.4 之前)，y 无法越过 cy
            if (animProgress < 0.4 && y > cy - 0.02) {
                y = cy - 0.02;
                vy = -Math.abs(vy);
            }

            // 顶底阻挡
            if (y < yMin) {
                y = yMin;
                vy = Math.abs(vy);
            } else if (y > yMax) {
                y = yMax;
                vy = -Math.abs(vy);
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
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.35 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.35, 0);
    }
};

function updateDiffusion(h: DiffusionHandles, params: Record<string, number>): void {
    const isLiquid = Math.round(num(params['medium'], 0)) === 1;
    const T = num(params['temperature'], 300);
    const N = Math.round(num(params['particleCount'], 500));

    const medName = isLiquid ? '液体 (CuSO₄ + 水)' : '气体 (NO₂ + 空气)';
    const dTheory = isLiquid ? 'D ~ 10⁻⁹ m²/s' : 'D ~ 10⁻⁵ m²/s';

    setLabel(h.label, `介质: ${medName} | T=${T.toFixed(0)}K  N=${N} | 菲克定律 J = -D·(∂c/∂x)  ${dTheory}`, '#0f172a');
}
