/**
 * 天体轨道与万有引力 rig — 中心天体 + 椭圆开普勒轨道 + 万有引力与速度矢量
 * 验证万有引力提供向心力 G·M·m/r² = m·v²/r 与开普勒行星定律
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const N = 96;
const CENTER_Y = 1.4;
const R_EARTH = 6371; // km
const GEO_ALT = 36000; // km

interface OrbitalHandles {
    center: THREE.Mesh;
    orbit: THREE.Line;
    gravityArrow: THREE.ArrowHelper;
    velocityArrow: THREE.ArrowHelper;
    infoLabel: THREE.Sprite;
}

const _planetCenter = new THREE.Vector3(0, CENTER_Y, 0);
const _rDir = new THREE.Vector3();
const _vDir = new THREE.Vector3();

export const orbitalRig: SceneRig = {
    clampToGround: false,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 中心天体 (带大气光晕与经纬线)
        const center = makeSphere(0.42, 0x2563eb, {
            roughness: 0.4,
            metalness: 0.1,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.25
        });
        center.position.set(0, CENTER_Y, 0);
        group.add(center);

        // 经纬线网格球罩
        const wireSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.43, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.25 })
        );
        wireSphere.position.set(0, CENTER_Y, 0);
        group.add(wireSphere);

        // 2. 椭圆轨道线
        const orbitPoints = Array.from({ length: N }, (_, i) => {
            const a = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 2.0, CENTER_Y + Math.sin(a) * 1.5, 0);
        });
        const orbit = makeLine(orbitPoints, 0x94a3b8, 0.6);
        group.add(orbit);

        // 3. 引力矢量 (指向地心) 与速度矢量 (切线)
        const gravityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(2, CENTER_Y, 0),
            0.5,
            0xef4444,
            0.12,
            0.08
        );
        group.add(gravityArrow);

        const velocityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(2, CENTER_Y, 0),
            0.6,
            0x10b981,
            0.12,
            0.08
        );
        group.add(velocityArrow);

        // 4. 轨道高度与速度标牌
        const hKm = num(params.altitude, 400);
        const vf = num(params.velocityFactor, 1.0);
        const infoLabel = makeTextSprite(
            `轨道高度 h = ${hKm.toFixed(0)} km | 速度系数 = ${vf.toFixed(2)}v₁`,
            '#0284c7',
            24,
            { x: 1.4, y: 0.22 }
        );
        infoLabel.position.set(0, CENTER_Y + 2.3, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: OrbitalHandles = {
            center,
            orbit,
            gravityArrow,
            velocityArrow,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as OrbitalHandles;
        const hKm = num(params.altitude, 400);
        const vf = num(params.velocityFactor, 1.0);
        const rOrbit = R_EARTH + hKm;

        const a = (rOrbit / (R_EARTH + GEO_ALT)) * 2.0;
        const e = Math.min(0.85, Math.abs(1 - vf));
        const b = a * Math.sqrt(1 - e * e);

        const pts = Array.from({ length: N }, (_, i) => {
            const t = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(t) * a, CENTER_Y + Math.sin(t) * b, 0);
        });
        h.orbit.geometry.dispose();
        h.orbit.geometry = new THREE.BufferGeometry().setFromPoints(pts);

        setLabel(h.infoLabel, `轨道高度 h = ${hKm.toFixed(0)} km | 偏心率 e = ${e.toFixed(2)}`, '#0284c7');
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as OrbitalHandles;

        // 万有引力矢量指向地心 (零分配)
        _rDir.subVectors(_planetCenter, ctx.ballPos).normalize();
        h.gravityArrow.position.copy(ctx.ballPos);
        h.gravityArrow.setDirection(_rDir);

        // 轨道切向速度矢量 (垂直于 rDir，零分配)
        _vDir.set(-_rDir.y, _rDir.x, 0).normalize();
        h.velocityArrow.position.copy(ctx.ballPos);
        h.velocityArrow.setDirection(_vDir);
    },

    getVisualPosition(pos, params) {
        const hKm = num(params.altitude, 400);
        const rOrbitM = (R_EARTH + hKm) * 1000;
        const scale = 2.0 / rOrbitM;
        return new THREE.Vector3(pos.x * scale, CENTER_Y + pos.y * scale, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, CENTER_Y, 0);
    }
};
