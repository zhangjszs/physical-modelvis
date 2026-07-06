import type { Quantity } from '../types/common.js';

/** 创建带单位的物理量 */
export function quantity<U extends string>(value: number, unit: U, symbol?: string): Quantity<U> {
    return { value, unit, symbol };
}

/** 单位换算表 */
const CONVERSIONS: Record<string, Record<string, number>> = {
    m: { cm: 100, mm: 1000, km: 0.001 },
    s: { ms: 1000, min: 1 / 60, h: 1 / 3600 },
    kg: { g: 1000 },
    'm/s': { 'km/h': 3.6 },
    'm/s²': { 'cm/s²': 100 },
    N: { kN: 0.001, mN: 1000 },
    J: { kJ: 0.001, mJ: 1000, eV: 6.242e18 },
    Pa: { kPa: 0.001, MPa: 0.000001 }
};

/** 单位换算 */
export function convert<U extends string>(q: Quantity<U>, targetUnit: string): number {
    const sourceUnit = q.unit;

    // 同单位直接返回
    if (sourceUnit === targetUnit) return q.value;

    // 查找正向换算
    const forward = CONVERSIONS[sourceUnit];
    if (forward && forward[targetUnit] !== undefined) {
        return q.value * forward[targetUnit];
    }

    // 查找反向换算
    const reverse = CONVERSIONS[targetUnit];
    if (reverse && reverse[sourceUnit] !== undefined) {
        return q.value / reverse[sourceUnit];
    }

    throw new Error(`不支持的单位换算: ${sourceUnit} → ${targetUnit}`);
}

/** Quantity 工厂 */
export const QuantityFactory = {
    /** 长度 (m) */
    length(value: number, unit: 'm' | 'cm' | 'mm' | 'km' = 'm'): Quantity<'m'> {
        const meters = convert({ value, unit }, 'm');
        return quantity(meters, 'm', 'l');
    },

    /** 质量 (kg) */
    mass(value: number, unit: 'kg' | 'g' = 'kg'): Quantity<'kg'> {
        const kg = convert({ value, unit }, 'kg');
        return quantity(kg, 'kg', 'm');
    },

    /** 时间 (s) */
    time(value: number, unit: 's' | 'ms' | 'min' | 'h' = 's'): Quantity<'s'> {
        const seconds = convert({ value, unit }, 's');
        return quantity(seconds, 's', 't');
    },

    /** 速度 (m/s) */
    velocity(value: number, unit: 'm/s' | 'km/h' = 'm/s'): Quantity<'m/s'> {
        const ms = convert({ value, unit }, 'm/s');
        return quantity(ms, 'm/s', 'v');
    },

    /** 力 (N) */
    force(value: number, unit: 'N' | 'kN' | 'mN' = 'N'): Quantity<'N'> {
        const n = convert({ value, unit }, 'N');
        return quantity(n, 'N', 'F');
    },

    /** 能量 (J) */
    energy(value: number, unit: 'J' | 'kJ' | 'eV' = 'J'): Quantity<'J'> {
        const j = convert({ value, unit }, 'J');
        return quantity(j, 'J', 'E');
    },

    /** 电荷 (C) */
    charge(value: number): Quantity<'C'> {
        return quantity(value, 'C', 'q');
    },

    /** 电场强度 (N/C) */
    electricField(value: number): Quantity<'N/C'> {
        return quantity(value, 'N/C', 'E');
    },

    /** 磁感应强度 (T) */
    magneticField(value: number): Quantity<'T'> {
        return quantity(value, 'T', 'B');
    }
};
