import { describe, it, expect } from 'vitest';
import { quantity, convert, QuantityFactory } from '../../src/units/quantity.js';
import { PHYSICS_CONSTANTS } from '../../src/units/constants.js';

describe('Quantity', () => {
  it('create', () => {
    const q = quantity(9.8, 'm/s²', 'g');
    expect(q.value).toBe(9.8);
    expect(q.unit).toBe('m/s²');
    expect(q.symbol).toBe('g');
  });
});

describe('convert', () => {
  it('same unit returns same value', () => {
    expect(convert(quantity(100, 'm'), 'm')).toBe(100);
  });

  it('m to cm', () => {
    expect(convert(quantity(1, 'm'), 'cm')).toBe(100);
  });

  it('cm to m', () => {
    expect(convert(quantity(100, 'cm'), 'm')).toBe(1);
  });

  it('km to m', () => {
    expect(convert(quantity(1, 'km'), 'm')).toBe(1000);
  });

  it('kg to g', () => {
    expect(convert(quantity(1, 'kg'), 'g')).toBe(1000);
  });

  it('m/s to km/h', () => {
    expect(convert(quantity(10, 'm/s'), 'km/h')).toBeCloseTo(36);
  });

  it('km/h to m/s', () => {
    expect(convert(quantity(36, 'km/h'), 'm/s')).toBeCloseTo(10);
  });
});

describe('QuantityFactory', () => {
  it('length converts to meters', () => {
    const q = QuantityFactory.length(100, 'cm');
    expect(q.value).toBe(1);
    expect(q.unit).toBe('m');
  });

  it('mass converts to kg', () => {
    const q = QuantityFactory.mass(500, 'g');
    expect(q.value).toBe(0.5);
    expect(q.unit).toBe('kg');
  });

  it('velocity converts to m/s', () => {
    const q = QuantityFactory.velocity(36, 'km/h');
    expect(q.value).toBeCloseTo(10);
    expect(q.unit).toBe('m/s');
  });
});

describe('PHYSICS_CONSTANTS', () => {
  it('g = 9.8 m/s²', () => {
    expect(PHYSICS_CONSTANTS.g.value).toBe(9.8);
    expect(PHYSICS_CONSTANTS.g.unit).toBe('m/s²');
  });

  it('e = 1.602e-19 C', () => {
    expect(PHYSICS_CONSTANTS.e.value).toBeCloseTo(1.602176634e-19, 25);
    expect(PHYSICS_CONSTANTS.e.unit).toBe('C');
  });

  it('k (Coulomb constant) ≈ 9e9 N·m²/C²', () => {
    expect(PHYSICS_CONSTANTS.k.value).toBeCloseTo(8.988e9, -6);
    expect(PHYSICS_CONSTANTS.k.unit).toBe('N·m²/C²');
  });

  it('electron mass ≈ 9.109e-31 kg', () => {
    expect(PHYSICS_CONSTANTS.electronMass.value).toBeGreaterThan(9e-31);
    expect(PHYSICS_CONSTANTS.electronMass.value).toBeLessThan(9.2e-31);
  });
});
