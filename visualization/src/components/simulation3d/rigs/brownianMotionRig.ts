/**
 * 布朗运动实验 rig — 高仿真实物光学显微镜 + 载玻片悬浮液滴 + 显微镜视野微粒真实布朗随机游走
 * 验证液体分子热运动引起的悬浮微粒无规则碰撞现象，动态响应温度 T 与液体粘度 η (Stokes-Einstein 定律 D = kT / 6πηr)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface BrownianHandles {
    pollenMeshes: THREE.Mesh[];
    pollenPositions: THREE.Vector3[];
    liquidMolecules: THREE.Points;
    label: THREE.Sprite;
    stageGroup: THREE.Group;
}

export const brownianMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();

        // ==================== 1. 光学显微镜主体建模 ====================
        const scope = new THREE.Group();

        // 马蹄形铸铁重型镜座
        const basePlate = makeBox(1.2, 0.12, 1.4, 0x1e293b, 0.6, 0.2);
        basePlate.position.set(-0.3, 0.06, 0);
        scope.add(basePlate);

        // 垂直镜柱
        const pillar = makeCylinder(0.08, 0.45, 0x334155, 0.4, 0.6);
        pillar.position.set(-0.65, 0.32, 0);
        scope.add(pillar);

        // 弧形金属镜臂
        const armLower = makeBox(0.18, 0.8, 0.24, 0x0f172a, 0.5, 0.3);
        armLower.position.set(-0.68, 0.85, 0);
        scope.add(armLower);

        // 粗细准焦同轴旋钮 (双侧双层滚花旋钮)
        const coarseKnobL = makeCylinder(0.12, 0.05, 0x64748b, 0.3, 0.7);
        coarseKnobL.rotation.z = Math.PI / 2;
        coarseKnobL.position.set(-0.68, 0.85, 0.16);
        scope.add(coarseKnobL);
        const fineKnobL = makeCylinder(0.07, 0.04, 0xd4d4d8, 0.2, 0.9);
        fineKnobL.rotation.z = Math.PI / 2;
        fineKnobL.position.set(-0.68, 0.85, 0.2);
        scope.add(fineKnobL);

        // 载物台 (正方形哑光黑板 + 通光孔 + 标本压片夹)
        const stageGroup = new THREE.Group();
        const stagePlate = makeBox(0.9, 0.06, 0.85, 0x09090b, 0.4, 0.2);
        stagePlate.position.set(-0.25, 0.88, 0);
        stageGroup.add(stagePlate);

        // 载玻片 (高透玻璃)
        const glassSlide = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.015, 0.22),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7,
                roughness: 0.05,
                transmission: 0.95
            })
        );
        glassSlide.position.set(-0.25, 0.92, 0);
        stageGroup.add(glassSlide);

        // 金属压片夹
        const clip = makeBox(0.04, 0.02, 0.18, 0xd4d4d8, 0.2, 0.8);
        clip.position.set(-0.46, 0.93, 0);
        stageGroup.add(clip);
        scope.add(stageGroup);

        // 转换器与物镜组
        const nosepiece = makeCylinder(0.14, 0.06, 0xd97706, 0.3, 0.8);
        nosepiece.position.set(-0.25, 1.28, 0);
        scope.add(nosepiece);
        const objLens = makeCylinder(0.045, 0.26, 0xd4d4d8, 0.2, 0.85);
        objLens.position.set(-0.25, 1.12, 0);
        scope.add(objLens);

        // 镜筒与 45° 倾斜目镜筒
        const bodyTube = makeCylinder(0.075, 0.45, 0x0f172a, 0.4, 0.5);
        bodyTube.position.set(-0.35, 1.55, 0);
        scope.add(bodyTube);

        const eyepieceTube = makeCylinder(0.05, 0.32, 0x334155, 0.3, 0.7);
        eyepieceTube.rotation.z = -Math.PI / 4;
        eyepieceTube.position.set(-0.46, 1.82, 0);
        scope.add(eyepieceTube);
        const ocularLens = makeCylinder(0.06, 0.08, 0x09090b, 0.5, 0.3);
        ocularLens.rotation.z = -Math.PI / 4;
        ocularLens.position.set(-0.58, 1.94, 0);
        scope.add(ocularLens);

        group.add(scope);

        // ==================== 2. 显微镜目镜放大高亮圆形视场 ====================
        const fieldCenter = new THREE.Vector3(1.2, 1.6, 0);
        const fieldRadius = 1.25;

        // 显微镜视野圆形光圈与金属镜筒外圈
        const fieldBg = new THREE.Mesh(
            new THREE.CircleGeometry(fieldRadius, 48),
            new THREE.MeshStandardMaterial({
                color: 0xf0f9ff,
                transparent: true,
                opacity: 0.82,
                roughness: 0.2,
                side: THREE.DoubleSide
            })
        );
        fieldBg.position.copy(fieldCenter);
        fieldBg.position.z = -0.05;
        group.add(fieldBg);

        const fieldRing = new THREE.Mesh(
            new THREE.TorusGeometry(fieldRadius, 0.055, 16, 64),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
        );
        fieldRing.position.copy(fieldCenter);
        group.add(fieldRing);

        // 悬浮花粉微粒 (多个黄色微粒，在视场内随机漫游)
        const nParticles = Math.max(2, Math.min(16, Math.round(num(params['nParticles'], 8))));
        const pollenMeshes: THREE.Mesh[] = [];
        const pollenPositions: THREE.Vector3[] = [];

        for (let i = 0; i < nParticles; i++) {
            const angle = (i / nParticles) * Math.PI * 2;
            const dist = Math.random() * (fieldRadius * 0.7);
            const pX = fieldCenter.x + Math.cos(angle) * dist;
            const pY = fieldCenter.y + Math.sin(angle) * dist;
            const pos = new THREE.Vector3(pX, pY, 0.05);

            const r = 0.07 + (num(params['particleRadius'], 1.0) / 10) * 0.12;
            const mesh = makeSphere(r, 0xf59e0b, {
                roughness: 0.3,
                metalness: 0.1,
                emissive: 0xb45309,
                emissiveIntensity: 0.35
            });
            mesh.position.copy(pos);
            group.add(mesh);

            pollenMeshes.push(mesh);
            pollenPositions.push(pos.clone());
        }

        // 周围大量高速撞击的微小液体分子 (点云)
        const molCount = 140;
        const molGeo = new THREE.BufferGeometry();
        const molPos = new Float32Array(molCount * 3);
        for (let i = 0; i < molCount; i++) {
            const a = Math.random() * Math.PI * 2;
            const rad = Math.sqrt(Math.random()) * fieldRadius * 0.95;
            molPos[i * 3] = fieldCenter.x + Math.cos(a) * rad;
            molPos[i * 3 + 1] = fieldCenter.y + Math.sin(a) * rad;
            molPos[i * 3 + 2] = 0.02;
        }
        molGeo.setAttribute('position', new THREE.BufferAttribute(molPos, 3));
        const liquidMolecules = new THREE.Points(
            molGeo,
            new THREE.PointsMaterial({
                color: 0x38bdf8,
                size: 0.038,
                transparent: true,
                opacity: 0.75
            })
        );
        group.add(liquidMolecules);

        // 状态 HUD
        const label = makeTextSprite('布朗运动', '#0f172a', 26, { x: 2.2, y: 0.36 });
        label.position.set(fieldCenter.x, fieldCenter.y + fieldRadius + 0.38, 0);
        group.add(label);

        const handles: BrownianHandles = {
            pollenMeshes,
            pollenPositions,
            liquidMolecules,
            label,
            stageGroup
        };
        updateBrownian(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateBrownian(handles as unknown as BrownianHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as BrownianHandles;
        if (!h.pollenMeshes || !h.pollenPositions) return;

        const T = num(ctx.params['liquidTemp'], 300);
        const eta = num(ctx.params['fluidViscosity'], 1.0);
        const r_p = Math.max(0.1, num(ctx.params['particleRadius'], 1.0));
        // 布朗扩散强度 D ∝ T / (eta * r)
        const stepMag = Math.sqrt(Math.max(10, T) / (Math.max(0.1, eta) * r_p)) * 0.009;

        const fieldCenter = new THREE.Vector3(1.2, 1.6, 0);
        const fieldRadius = 1.15;

        // 花粉微粒随机游走
        for (let i = 0; i < h.pollenMeshes.length; i++) {
            const mesh = h.pollenMeshes[i];
            const p = h.pollenPositions[i];
            if (!mesh || !p) continue;

            p.x += (Math.random() - 0.5) * stepMag * 2;
            p.y += (Math.random() - 0.5) * stepMag * 2;

            const dx = p.x - fieldCenter.x;
            const dy = p.y - fieldCenter.y;
            const d = Math.hypot(dx, dy);
            if (d > fieldRadius) {
                p.x = fieldCenter.x + (dx / d) * fieldRadius * 0.98;
                p.y = fieldCenter.y + (dy / d) * fieldRadius * 0.98;
            }
            mesh.position.set(p.x, p.y, 0.05);
        }

        // 水分子高频扰动
        const molAttr = h.liquidMolecules.geometry.attributes.position as THREE.BufferAttribute;
        const arr = molAttr.array as Float32Array;
        const molJitter = stepMag * 2.5;
        for (let i = 0; i < arr.length / 3; i++) {
            let x = arr[i * 3] ?? fieldCenter.x;
            let y = arr[i * 3 + 1] ?? fieldCenter.y;
            x += (Math.random() - 0.5) * molJitter;
            y += (Math.random() - 0.5) * molJitter;

            const dx = x - fieldCenter.x;
            const dy = y - fieldCenter.y;
            if (Math.hypot(dx, dy) > fieldRadius) {
                const a = Math.random() * Math.PI * 2;
                const rad = Math.random() * fieldRadius * 0.9;
                x = fieldCenter.x + Math.cos(a) * rad;
                y = fieldCenter.y + Math.sin(a) * rad;
            }
            arr[i * 3] = x;
            arr[i * 3 + 1] = y;
        }
        molAttr.needsUpdate = true;
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.6 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0.5, 1.4, 0);
    }
};

function updateBrownian(h: BrownianHandles, params: Record<string, number>): void {
    const T = num(params['liquidTemp'], 300);
    const eta = num(params['fluidViscosity'], 1.0);
    const r_p = num(params['particleRadius'], 1.0);
    const n = Math.round(num(params['nParticles'], 8));

    // 计算爱因斯坦扩散系数相对值 (以水 300K, 1cP, 1μm 为基准 1.0)
    const dRelative = T / 300 / ((eta / 1.0) * (r_p / 1.0));

    setLabel(
        h.label,
        `显微视野: 微粒数 N=${n}  r=${r_p.toFixed(1)}μm | T=${T.toFixed(0)}K  η=${eta.toFixed(1)}cP | 扩散率 D ∝ kT/(6πηr) = ${dRelative.toFixed(2)}x`,
        '#0f172a'
    );
}
