import { escapeHtml, fixtureTotals, generateSummaryHTML, grandTotal, hasSuppliers, summaryBodyHTML, supplierGroups } from './summary';

const types = [
  { name: '4ft Strip', category: 'new', sort_order: 2, supplier: 'Ledvance' },
  { name: '2x4 Troffer', category: 'new', sort_order: 1, supplier: 'Contractor Lighting Supply' },
  { name: 'Wall Pack', category: 'new', sort_order: 3, supplier: null },
  { name: 'Old T8', category: 'current', sort_order: 0 },
];

const area = (rows: any[]) => ({ light_rows: rows });

describe('fixtureTotals', () => {
  it('adds up each new light type across every area', () => {
    const totals = fixtureTotals([
      area([{ new_light_type: '4ft Strip', new_quantity: 4 }, { new_light_type: '2x4 Troffer', new_quantity: 2 }]),
      area([{ new_light_type: '4ft Strip', new_quantity: 6 }]),
    ], types);
    expect(totals).toEqual([
      { name: '2x4 Troffer', total: 2, supplier: 'Contractor Lighting Supply' },
      { name: '4ft Strip', total: 10, supplier: 'Ledvance' },
    ]);
  });

  it('leaves out "removed only" rows, rows with no new type, and zero totals', () => {
    const totals = fixtureTotals([area([
      { new_light_type: '4ft Strip', new_quantity: 5, removed_only: true },
      { new_light_type: null, new_quantity: 3 },
      { new_light_type: 'Wall Pack', new_quantity: 0 },
      { new_light_type: 'Wall Pack' },
    ])], types);
    expect(totals).toEqual([]);
  });

  it('follows the light type list order, with types no longer in the list last', () => {
    const totals = fixtureTotals([area([
      { new_light_type: 'Retired Fixture', new_quantity: 1 },
      { new_light_type: 'Wall Pack', new_quantity: 1 },
      { new_light_type: '2x4 Troffer', new_quantity: 1 },
    ])], types);
    expect(totals.map(t => t.name)).toEqual(['2x4 Troffer', 'Wall Pack', 'Retired Fixture']);
    expect(totals[2].supplier).toBeNull();
  });

  it('handles areas with no light rows', () => {
    expect(fixtureTotals([{}, area([])], types)).toEqual([]);
  });
});

describe('supplierGroups', () => {
  const totals = [
    { name: 'A', total: 3, supplier: 'Ledvance' },
    { name: 'B', total: 2, supplier: null },
    { name: 'C', total: 5, supplier: 'Contractor Lighting Supply' },
    { name: 'D', total: 1, supplier: 'Ledvance' },
  ];

  it('groups by supplier alphabetically, with no supplier last, and subtotals each group', () => {
    const groups = supplierGroups(totals);
    expect(groups.map(g => [g.supplier, g.items.map(i => i.name), g.subtotal])).toEqual([
      ['Contractor Lighting Supply', ['C'], 5],
      ['Ledvance', ['A', 'D'], 4],
      [null, ['B'], 2],
    ]);
    expect(hasSuppliers(groups)).toBe(true);
  });

  it('subtotals add up to the grand total', () => {
    const sum = supplierGroups(totals).reduce((s, g) => s + g.subtotal, 0);
    expect(sum).toBe(grandTotal(totals));
    expect(grandTotal(totals)).toBe(11);
  });

  it('reports no suppliers when none are set', () => {
    expect(hasSuppliers(supplierGroups([{ name: 'A', total: 1, supplier: null }]))).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes characters that would break the PDF markup', () => {
    expect(escapeHtml('<b>"Tom" & Sons</b>')).toBe('&lt;b&gt;&quot;Tom&quot; &amp; Sons&lt;/b&gt;');
  });
});

describe('summary HTML', () => {
  it('shows supplier headings only when a light has a supplier', () => {
    const grouped = summaryBodyHTML({}, [{ name: 'A', total: 2, supplier: 'Ledvance' }]);
    const plain = summaryBodyHTML({}, [{ name: 'A', total: 2, supplier: null }]);
    expect(grouped).toContain('sum-supplier');
    expect(grouped).toContain('Subtotal');
    expect(plain).not.toContain('sum-supplier');
    expect(plain).toContain('<td>Total</td><td class="num">2</td>');
  });

  it('says so when there are no new lights', () => {
    expect(summaryBodyHTML({}, [])).toContain('No new lights entered yet');
  });

  it('escapes customer text and only includes installer notes when present', () => {
    const html = generateSummaryHTML(
      { company_name: 'A&B <Co>', name: 'Plant 2', location: 'Pittsburgh', installer_notes: '  Use <lift>  ' },
      [],
    );
    expect(html).toContain('A&amp;B &lt;Co&gt;');
    expect(html).toContain('Use &lt;lift&gt;');
    expect(html).not.toContain('<Co>');
    expect(generateSummaryHTML({ name: 'X', installer_notes: '   ' }, [])).not.toContain('Installer notes');
  });
});
