// QuickBooks product code by light type name. Left out when the name already carries the code
// (QuickBooks items that share a description get it added to their name).
export function productCodes(types: any[]): Map<string, string> {
  const codes = new Map<string, string>();
  types.forEach(t => {
    if (t.product_code && !String(t.name).includes(t.product_code)) codes.set(t.name, t.product_code);
  });
  return codes;
}
