/**
 * #125 光敏电阻面板公式 ↔ 计算式 对齐守卫
 *
 * 背景: #63 迁移后计算含引擎温度项 R_dark(T)=R_dark·exp(−0.02(T−25))，
 * 但面板公式行仍写 `R(E) = R_dark · exp(−k·E)` — T≠25℃ 时展示式与曲线不一致 (教学误导)。
 * 本文件把「展示式 = 计算式」固化成门禁:
 *   ① 面板公式行 / 信息条须含温度修正项, 旧式无残留;
 *   ② 式中系数须与引擎 photoresistor.ts 的 TEMP_COEFF 同源 (直读引擎源码, 不写死 0.02);
 *   ③ R_dark 数值回显行须标注 25℃ 基准 (否则学生把 R_dark 当成当前温度下的值)。
 * 行宽不溢出属画布排版, 由浏览器探针核验 (见 #125 执行报告)。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { drawPhotoresistorScene } from '../../src/rendering/sensorElementScenes';
import { createRecordingCanvas } from '../utils/canvasMock';

/** 引擎暗电阻温度系数 (从 physics-core 源码提取, 与本文件不共享常量 → 真·跨包对照) */
function engineTempCoeff(): number {
    const src = readFileSync(resolve(__dirname, '../../../physics-core/src/models/photoresistor.ts'), 'utf-8');
    const m = src.match(/TEMP_COEFF\s*=\s*([0-9.]+)/);
    expect(m, '引擎 photoresistor.ts 应含 TEMP_COEFF 常量').not.toBeNull();
    return Number(m![1]);
}

/** 用录制型 mock ctx 跑一遍画面, 返回所有被绘制出的文本 */
function drawnTexts(params: Record<string, number>): string[] {
    const { ctx, texts } = createRecordingCanvas({ width: 880, height: 520 });
    drawPhotoresistorScene({
        ctx,
        width: 880,
        height: 520,
        isDark: false,
        params,
        simulationResult: null,
        currentTime: 0
    });
    return texts;
}

const DEFAULTS = { darkResistance: 1e6, sensitivity: 0.002, lightIntensity: 100, temperature: 25 };

describe('#125 光敏电阻面板公式与计算式对齐', () => {
    it('公式行与信息条均含温度修正项, 且不带 T 的旧式无残留', () => {
        const coeff = engineTempCoeff();
        const texts = drawnTexts(DEFAULTS);
        const formulaLines = texts.filter(t => t.includes('R_dark') && t.includes('exp('));
        expect(formulaLines.length, '面板公式行 + 信息条公式段都在').toBeGreaterThanOrEqual(2);
        for (const line of formulaLines) {
            expect(line, `每处公式都须含温度项 (${coeff})`).toContain(String(coeff));
            expect(line, '温度项须写成 (T−25) / (T-25)').toMatch(/\(T[−-]25\)/);
            expect(line, '不应再出现漏温度项的旧式').not.toMatch(/R\(E\)\s*=/);
        }
    });

    it('公式系数与引擎 TEMP_COEFF 同源 (引擎值出现在展示式中)', () => {
        const coeff = engineTempCoeff();
        expect(coeff, '引擎系数现状 0.02 (本单禁改计算逻辑)').toBeCloseTo(0.02, 12);
        const texts = drawnTexts(DEFAULTS);
        expect(
            texts.some(t => t.includes(`exp(−k·E − ${coeff}(T−25))`)),
            '展示式系数取自引擎'
        ).toBe(true);
    });

    it('R_dark 数值回显行标注 25℃ 基准 (温度项负责折算到当前 T)', () => {
        const texts = drawnTexts(DEFAULTS);
        expect(
            texts.some(t => t.includes('R_dark(25℃)=')),
            '回显行含温度基准'
        ).toBe(true);
    });

    it('非室温 T=60℃ 下展示式仍与计算式同形 (画面读数按温度项下降)', () => {
        const texts = drawnTexts({ ...DEFAULTS, temperature: 60 });
        expect(
            texts.some(t => t.includes('T=60°C')),
            '当前温度已回显'
        ).toBe(true);
        // R = 1e6·exp(−0.002·100 − 0.02·(60−25)) = 1e6·exp(−0.9) ≈ 406.6 kΩ
        const readout = texts.find(t => t.startsWith('当前 R = '));
        expect(readout, '当前 R 读数行在位').toBeDefined();
        expect(Number((readout!.match(/([\d.]+)/g) ?? []).pop())).toBeCloseTo(406.6, 1);
    });
});
