import { byName } from './byName';
import { productCodes } from './productCodes';

describe('productCodes', () => {
  it('maps each light type name to its QuickBooks code', () => {
    const codes = productCodes([
      { name: '4ft Strip', product_code: 'LS-4' },
      { name: 'Wall Pack', product_code: null },
    ]);
    expect([...codes]).toEqual([['4ft Strip', 'LS-4']]);
  });

  it('skips the code when the name already includes it', () => {
    const codes = productCodes([{ name: '2x4 Troffer (TR-24)', product_code: 'TR-24' }]);
    expect(codes.size).toBe(0);
  });
});

describe('byName', () => {
  const sorted = (names: string[]) => names.map(name => ({ name })).sort(byName).map(t => t.name);

  it('sorts alphabetically, ignoring case', () => {
    expect(sorted(['wall pack', 'Area Light', 'canopy'])).toEqual(['Area Light', 'canopy', 'wall pack']);
  });

  it('sorts numbers naturally', () => {
    expect(sorted(['Type 10', 'Type 2', 'Type 1'])).toEqual(['Type 1', 'Type 2', 'Type 10']);
  });

  it('puts missing names first instead of crashing', () => {
    expect([{ name: 'B' }, { name: null }].sort(byName).map(t => t.name)).toEqual([null, 'B']);
  });
});
