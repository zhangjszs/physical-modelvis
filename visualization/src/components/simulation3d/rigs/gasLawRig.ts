/**
 * 气体定律实验 rig — 刻度玻璃气缸 + 密封活塞 + 恒温水浴加热 + 指针气压表 + 数字温控
 * 验证玻意耳定律 (pV=C)、查理定律 (p/T=C)、盖-吕萨克定律 (V/T=C) 及理想气体状态方程 pV = nRT
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeBox, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

function tempColor(T: number): number {
    const t = Math.max(0, Math.min(1, (T - 150) / 450));
    const c = new THREE.Color();
    c.setHSL((1 - t) * 0.62, 0.82, 0.52);
    return c.getHex();
}

interface GasHandles {
    pistonGroup: THREE.Group;
    gasMesh: THREE.Mesh;
    gaugeNeedle: THREE.Mesh;
    gaugeLabel: THREE.Sprite;
    bathGroup: THREE.Group;
    pArrow: THREE.ArrowHelper;
    label: THREE.Sprite;
    particles: THREE.Points;
    particleVelocities: Float32Array;
}

export const gasLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();

        // 1. 厚壁精密刻度玻璃气缸
        const cylinderHeight = 2.4;
        const cylinderRadius = 0.52;
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 40, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.28,
                roughness: 0.08,
                metalness: 0.05,
                transmission: 0.88,
                ior: 1.5,
                side: THREE.DoubleSide
            })
        );
        wall.position.set(0, cylinderHeight / 2 + 0.08, 0);
        group.add(wall);

        // 重型合金底座
        const base = makeCylinder(0.72, 0.12, 0x1e293b, 0.5, 0.3);
        base.position.set(0, 0.06, 0);
        group.add(base);

        // 刻度标尺线
        for (let i = 1; i <= 10; i++) {
            const y = 0.1 + i * 0.2;
            const tick = makeCylinder(0.525, 0.005, 0x475569, 0.3, 0.2);
            tick.position.set(0, y, 0);
            group.add(tick);
        }

        // 2. 密封活塞组件 (金属主体 + 红色双密封圈 + 操作手柄)
        const pistonGroup = new THREE.Group();
        const pistonHead = makeCylinder(0.5, 0.12, 0x334155, 0.4, 0.7);
        pistonGroup.add(pistonHead);

        // 红色硅胶密封圈
        const ring1 = makeCylinder(0.51, 0.018, 0xdc2626, 0.2, 0.8);
        ring1.position.set(0, 0.03, 0);
        pistonGroup.add(ring1);
        const ring2 = makeCylinder(0.51, 0.018, 0xdc2626, 0.2, 0.8);
        ring2.position.set(0, -0.03, 0);
        pistonGroup.add(ring2);

        // 活塞推拉杆与顶置横杆握手
        const rod = makeCylinder(0.045, 0.95, 0x94a3b8, 0.2, 0.9);
        rod.position.set(0, 0.55, 0);
        pistonGroup.add(rod);
        const handleBar = makeBox(0.42, 0.06, 0.06, 0x0f172a, 0.6, 0.2);
        handleBar.position.set(0, 1.02, 0);
        pistonGroup.add(handleBar);
        group.add(pistonGroup);

        // 3. 封闭气体介质柱 (随温度变化色调)
        const gasMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.49, 0.49, 1.0, 32),
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.45,
                roughness: 0.3
            })
        );
        group.add(gasMesh);

        // 气体分子微观粒子群
        const particleCount = 70;
        const particleGeo = new THREE.BufferGeometry();
        const posArray = new Float32Array(particleCount * 3);
        const particleVelocities = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * 0.44;
            posArray[i * 3] = Math.cos(theta) * r;
            posArray[i * 3 + 1] = 0.15 + Math.random() * 0.8;
            posArray[i * 3 + 2] = Math.sin(theta) * r;

            particleVelocities[i * 3] = (Math.random() - 0.5) * 1.5;
            particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
            particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x67e8f9,
            size: 0.045,
            transparent: true,
            opacity: 0.85
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        group.add(particles);

        // 4. 精密弹簧管指针气压表 (侧装)
        const gaugeGroup = new THREE.Group();
        const gaugePipe = makeCylinder(0.024, 0.35, 0xd97706, 0.3, 0.8);
        gaugePipe.rotation.z = Math.PI / 2;
        gaugePipe.position.set(-0.18, 0, 0);
        gaugeGroup.add(gaugePipe);

        // 表头金属外壳
        const gaugeCasing = makeCylinder(0.26, 0.08, 0x1e293b, 0.4, 0.5);
        gaugeCasing.rotation.x = Math.PI / 2;
        gaugeGroup.add(gaugeCasing);
        // 白底刻度盘
        const gaugeDial = makeCylinder(0.24, 0.085, 0xf8fafc, 0.3, 0.1);
        gaugeDial.rotation.x = Math.PI / 2;
        gaugeGroup.add(gaugeDial);
        // 刻度环与中心轴销
        const centerPin = makeCylinder(0.025, 0.09, 0xdc2626, 0.2, 0.8);
        centerPin.rotation.x = Math.PI / 2;
        gaugeGroup.add(centerPin);
        // 旋转指针 (红色金属指针)
        const gaugeNeedle = makeBox(0.014, 0.18, 0.014, 0xdc2626, 0.3, 0.6);
        gaugeNeedle.position.set(0, 0.065, 0.045);
        gaugeGroup.add(gaugeNeedle);

        const gaugeLabel = makeTextSprite('101 kPa', '#0f172a', 28, { x: 0.8, y: 0.25 });
        gaugeLabel.position.set(0, -0.36, 0.05);
        gaugeGroup.add(gaugeLabel);

        gaugeGroup.position.set(0.82, 0.85, 0);
        group.add(gaugeGroup);

        // 5. 恒温水浴加热套箱 (透明加热槽 + 底部加热盘)
        const bathGroup = new THREE.Group();
        const bathGlass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.76, 0.76, 0.95, 36, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.22,
                roughness: 0.1,
                transmission: 0.85,
                side: THREE.DoubleSide
            })
        );
        bathGlass.position.set(0, 0.56, 0);
        bathGroup.add(bathGlass);

        const heaterBase = makeCylinder(0.82, 0.08, 0x334155, 0.4, 0.3);
        heaterBase.position.set(0, 0.08, 0);
        bathGroup.add(heaterBase);
        group.add(bathGroup);

        // 6. 活塞受力/外压矢量箭头
        const pArrow = makeArrow(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0.1, 0), 0.6, 0xdc2626, 0.18, 0.1);
        group.add(pArrow);

        // 7. 顶部状态方程全景 HUD
        const label = makeTextSprite('pV = nRT', '#0f172a', 26, { x: 2.2, y: 0.36 });
        label.position.set(0, 2.75, 0);
        group.add(label);

        const handles: GasHandles = {
            pistonGroup,
            gasMesh,
            gaugeNeedle,
            gaugeLabel,
            bathGroup,
            pArrow,
            label,
            particles,
            particleVelocities
        };
        updateGas(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateGas(handles as unknown as GasHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as GasHandles;
        if (!h.particles) return;
        const T0 = num(ctx.params['T0'], 273.15);
        const speedScale = Math.sqrt(Math.max(10, T0) / 273.15) * 0.015;
        const V0 = num(ctx.params['V0'], 22.4);
        const hMax = 2.0;
        const hGas = Math.max(0.18, Math.min(hMax, (V0 / 100) * hMax));
        const posAttr = h.particles.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const v = h.particleVelocities;
        const rMax = 0.44;

        for (let i = 0; i < arr.length / 3; i++) {
            let x = arr[i * 3] ?? 0;
            let y = arr[i * 3 + 1] ?? 0;
            let z = arr[i * 3 + 2] ?? 0;
            let vx = v[i * 3] ?? 0;
            let vy = v[i * 3 + 1] ?? 0;
            let vz = v[i * 3 + 2] ?? 0;

            x += vx * speedScale;
            y += vy * speedScale;
            z += vz * speedScale;

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

            if (y < 0.12) {
                y = 0.12;
                vy = Math.abs(vy);
            } else if (y > 0.08 + hGas) {
                y = 0.08 + hGas;
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

    getVisualPosition(pos, params) {
        const V0 = num(params['V0'], 22.4);
        const hGas = Math.max(0.18, (V0 / 100) * 2.0);
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.1 + hGas + 0.1, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.2, 0);
    }
};

function updateGas(h: GasHandles, params: Record<string, number>): void {
    const n = num(params['n'], 1);
    const mode = Math.round(num(params['modeG'], 0));
    const p0 = num(params['p0'], 101.3);
    const V0 = num(params['V0'], 22.4);
    const T0 = num(params['T0'], 273.15);

    const hMax = 2.0;
    const hGas = Math.max(0.18, Math.min(hMax, (V0 / 100) * hMax));

    h.gasMesh.scale.set(1, hGas, 1);
    h.gasMesh.position.set(0, 0.08 + hGas / 2, 0);
    h.pistonGroup.position.set(0, 0.08 + hGas + 0.06, 0);

    const gasColor = tempColor(T0);
    (h.gasMesh.material as THREE.MeshStandardMaterial).color.setHex(gasColor);

    // 气压表指针偏转角 (0 ~ 500 kPa 对应 -120° ~ +120°)
    const angle = ((p0 - 10) / 490) * (Math.PI * 1.33) - Math.PI * 0.66;
    h.gaugeNeedle.rotation.z = -angle;
    setLabel(h.gaugeLabel, `${p0.toFixed(0)} kPa`, '#dc2626');

    // 压强外力箭头
    const arrowLen = Math.min(1.1, Math.max(0.2, (p0 / 250) * 0.65));
    h.pArrow.scale.set(1, arrowLen / 0.6, 1);
    h.pArrow.position.set(0, 0.08 + hGas + 0.14, 0);

    const mName = mode === 0 ? '等温 (pV=C)' : mode === 1 ? '等压 (V/T=C)' : '等容 (p/T=C)';
    setLabel(
        h.label,
        `状态: ${mName} | n=${n.toFixed(1)}mol  p=${p0.toFixed(1)}kPa  V=${V0.toFixed(1)}L  T=${T0.toFixed(1)}K`,
        '#0f172a'
    );
}
