/** SI 基本单位和导出单位定义 */

export const SI_BASE_UNITS = {
    length: 'm',
    mass: 'kg',
    time: 's',
    electricCurrent: 'A',
    temperature: 'K',
    amountOfSubstance: 'mol',
    luminousIntensity: 'cd'
} as const;

export const SI_DERIVED_UNITS = {
    velocity: 'm/s',
    acceleration: 'm/s²',
    force: 'N',
    energy: 'J',
    power: 'W',
    pressure: 'Pa',
    electricCharge: 'C',
    electricPotential: 'V',
    electricField: 'N/C',
    magneticField: 'T',
    frequency: 'Hz'
} as const;
