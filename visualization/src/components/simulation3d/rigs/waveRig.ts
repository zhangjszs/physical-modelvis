/**
 * 机械波演示 rig — 波源驱动活塞 + 质点平衡基准面 + 波长/振幅标尺 + 动态波形
 * 演示横波传播规律 y(x,t) = A·sin(ωt - kx) 与波速公式 v = λ·f
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const N = 80;
const BASE_Y = 1.3;

interface WaveHandles {
    driverPiston: THREE.Mesh;
    waveLine: THREE.Line;
    equilibriumLine: THREE.Line;
    propArrow: THREE.ArrowHelper;
    infoLabel: THREE.Sprite;
}

export const waveRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: false,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 实验机架与波源驱动电机
        const driverBase = makeBox(0.4, 0.6, 0.4, 0x334155, 0.5, 0.3);
        driverBase.position.set(-2.2, BASE_Y, 0);
        group.add(driverBase);

        const driverPiston = makeCylinder(0.06, 0.4, 0xd97706, 0.3, 0.8);
        driverPiston.position.set(-2.0, BASE_Y, 0);
        group.add(driverPiston);

        // 2. 平衡位置水平基准线 (点划线)
        const eqPts = [new THREE.Vector3(-2.0, BASE_Y, -0.1), new THREE.Vector3(2.4, BASE_Y, -0.1)];
        const equilibriumLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(eqPts),
            new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.08, gapSize: 0.05 })
        );
        equilibriumLine.computeLineDistances();
        group.add(equilibriumLine);

        // 3. 动态连续机械波线
        const wavePts = Array.from({ length: N }, (_, i) => {
            const x = -2.0 + (i / (N - 1)) * 4.4;
            return new THREE.Vector3(x, BASE_Y, 0);
        });
        const waveLine = makeLine(wavePts, 0x2563eb, 0.85);
        group.add(waveLine);

        // 4. 波传播方向箭头
        const propArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, BASE_Y + 0.6, 0),
            0.6,
            0x16a34a,
            0.12,
            0.08
        );
        group.add(propArrow);

        // 5. 波动公式与波速标牌
        const A = num(params.amplitude, 0.2);
        const lambda = num(params.wavelength, 1.5);
        const f = num(params.frequency, 1.0);
        const v = lambda * f;

        const infoLabel = makeTextSprite(
            `v = λ·f = ${v.toFixed(2)} m/s (A=${A.toFixed(2)}m, λ=${lambda.toFixed(2)}m, f=${f.toFixed(1)}Hz)`,
            '#2563eb',
            24,
            { x: 1.5, y: 0.22 }
        );
        infoLabel.position.set(0, BASE_Y + 1.0, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: WaveHandles = {
            driverPiston,
            waveLine,
            equilibriumLine,
            propArrow,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as WaveHandles;
        const A = num(params.amplitude, 0.2);
        const lambda = num(params.wavelength, 1.5);
        const f = num(params.frequency, 1.0);
        const v = lambda * f;

        setLabel(
            h.infoLabel,
            `v = λ·f = ${v.toFixed(2)} m/s (A=${A.toFixed(2)}m, λ=${lambda.toFixed(2)}m, f=${f.toFixed(1)}Hz)`,
            '#2563eb'
        );
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as WaveHandles;
        const A = num(ctx.params.amplitude, 0.25);
        const lambda = num(ctx.params.wavelength, 1.5);
        const f = num(ctx.params.frequency, 1.0);
        const k = (2 * Math.PI) / Math.max(0.1, lambda);
        const omega = 2 * Math.PI * f;

        // 波源活塞简谐起伏
        const ySource = A * Math.sin(omega * ctx.time);
        h.driverPiston.position.y = BASE_Y + ySource;

        // 正弦横波传播形变 (就地更新 Float32Array 顶点，彻底消除每秒 7200 个 Vector3 与 Geometry 频繁创建与销毁)
        const posAttr = h.waveLine.geometry.attributes['position'] as THREE.BufferAttribute | undefined;
        if (posAttr && posAttr.array) {
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < N; i++) {
                const x = -2.0 + (i / (N - 1)) * 4.4;
                const dist = x - -2.0;
                const y = A * Math.sin(omega * ctx.time - k * dist);
                const idx = i * 3;
                arr[idx] = x;
                arr[idx + 1] = BASE_Y + y;
                arr[idx + 2] = 0;
            }
            posAttr.needsUpdate = true;
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(-2.0 + pos.x * WORLD_SCALE, BASE_Y + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-2.0, BASE_Y, 0);
    }
};
