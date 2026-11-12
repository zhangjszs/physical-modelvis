/**
 * 地面卷尺 — 测水平位移
 * 黄色胶带 + 刻度线 + 数字标注
 *
 * 尺度口径 (#159 逐节审计): 旧签名 `createRangeTape(length, maxMeter)` 把
 * 「世界单位长度」与「代表的总米数」当成两个独立参数, 调用方随手写 (14, 70) /
 * (6, 30) —— 于是卷尺的**米/单位**口径与 rig 的 worldScale (= 1/worldScale 米每单位)
 * 不一致, 标尺读数与画面里的实际距离对不上 (抛体场景 5 m/单位 vs 实际 6.25 m/单位)。
 *
 * 新签名 `createRangeTape(length, metersPerUnit)`: 只给「世界单位长度」与
 * 「每世界单位代表多少米」, 刻度数字由二者推导, 调用方必须传
 * `metersPerUnit = 1 / worldScale`, 从而保证卷尺与场景尺度同源。
 */
import * as THREE from 'three';
import { makeBox, makeTextSprite } from '../primitives';

export interface RangeTapeHandles {
    group: THREE.Group;
}

export function createRangeTape(
    length = 8.0,
    metersPerUnit = 6.25
): {
    group: THREE.Group;
    handles: RangeTapeHandles;
} {
    const group = new THREE.Group();

    // 胶带底带
    const tape = makeBox(length, 0.018, 0.22, 0xfacc15, 0.46);
    tape.position.set(length / 2, 0.025, 0);
    group.add(tape);

    // 刻度线 + 数字 (数字 = 该处世界坐标对应的米数, 与场景尺度同源)
    const ticks = 8;
    for (let i = 0; i <= ticks; i++) {
        const x = (i / ticks) * length;
        const tickH = i % 2 === 0 ? 0.36 : 0.28;
        const tick = makeBox(0.018, 0.026, tickH, 0x475569, 0.5);
        tick.position.set(x, 0.055, 0);
        group.add(tick);

        if (i > 0) {
            const meter = (x * metersPerUnit).toFixed(0);
            const label = makeTextSprite(meter, '#475569', 30, { x: 0.4, y: 0.15 });
            label.position.set(x, 0.11, 0.34);
            group.add(label);
        }
    }

    // 单位标签
    const unitLabel = makeTextSprite('水平距离 x / m', '#2563eb', 32, { x: 1.0, y: 0.34 });
    unitLabel.position.set(length + 0.6, 0.18, 0);
    group.add(unitLabel);

    return { group, handles: { group } };
}
