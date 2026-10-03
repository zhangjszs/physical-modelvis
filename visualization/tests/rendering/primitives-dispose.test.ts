/**
 * disposeObject / clearGroup 资源释放契约 (#79)
 *
 * 背景: 旧实现只 dispose geometry 和 material, 漏掉材质上的纹理 (CanvasTexture 等)。
 * 纹理不显式释放时 GPU 端不真正回收 —— #81 做上下文复用后会从"靠 forceContextLoss
 * 兜底"升级为真泄漏, 故纹理释放必须先行固化。
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { disposeObject, clearGroup } from '../../src/components/simulation3d/primitives';

/** 构造带 dispose 计数的纹理 (不依赖 WebGL / canvas 2d, jsdom 可跑) */
function makeTrackedTexture(): THREE.Texture {
    const texture = new THREE.Texture();
    vi.spyOn(texture, 'dispose');
    return texture;
}

describe('disposeObject 纹理释放 (#79)', () => {
    it('含 map 纹理的 mesh: texture.dispose 与 material.dispose 都被调用', () => {
        const map = makeTrackedTexture();
        const material = new THREE.MeshStandardMaterial({ map });
        const matSpy = vi.spyOn(material, 'dispose');
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);

        disposeObject(mesh);

        expect(map.dispose).toHaveBeenCalledTimes(1);
        expect(matSpy).toHaveBeenCalledTimes(1);
    });

    it('材质上的多张纹理 (emissiveMap/alphaMap) 全部释放', () => {
        const map = makeTrackedTexture();
        const emissiveMap = makeTrackedTexture();
        const alphaMap = makeTrackedTexture();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ map, emissiveMap, alphaMap })
        );

        disposeObject(mesh);

        expect(map.dispose).toHaveBeenCalledTimes(1);
        expect(emissiveMap.dispose).toHaveBeenCalledTimes(1);
        expect(alphaMap.dispose).toHaveBeenCalledTimes(1);
    });

    it('材质数组形态 (多材质 mesh): 每个材质的纹理都释放', () => {
        const mapA = makeTrackedTexture();
        const mapB = makeTrackedTexture();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [
            new THREE.MeshBasicMaterial({ map: mapA }),
            new THREE.MeshBasicMaterial({ map: mapB })
        ]);

        disposeObject(mesh);

        expect(mapA.dispose).toHaveBeenCalledTimes(1);
        expect(mapB.dispose).toHaveBeenCalledTimes(1);
    });

    it('Sprite 的 SpriteMaterial.map (CanvasTexture 场景) 释放', () => {
        const map = makeTrackedTexture();
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map }));

        disposeObject(sprite);

        expect(map.dispose).toHaveBeenCalledTimes(1);
    });

    it('嵌套结构: traverse 递归到深层子对象的纹理', () => {
        const map = makeTrackedTexture();
        const inner = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map }));
        const outer = new THREE.Group();
        const middle = new THREE.Group();
        outer.add(middle);
        middle.add(inner);

        disposeObject(outer);

        expect(map.dispose).toHaveBeenCalledTimes(1);
    });

    it('clearGroup: 移除子对象并释放其纹理', () => {
        const map = makeTrackedTexture();
        const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map }));
        const group = new THREE.Group();
        group.add(child);

        clearGroup(group);

        expect(group.children).toHaveLength(0);
        expect(map.dispose).toHaveBeenCalledTimes(1);
    });

    it('无纹理对象 (纯几何+材质): 不误伤, 正常释放 geometry 与 material', () => {
        const material = new THREE.MeshBasicMaterial();
        const matSpy = vi.spyOn(material, 'dispose');
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const geoSpy = vi.spyOn(geometry, 'dispose');
        const mesh = new THREE.Mesh(geometry, material);

        disposeObject(mesh);

        expect(geoSpy).toHaveBeenCalledTimes(1);
        expect(matSpy).toHaveBeenCalledTimes(1);
    });
});
