// Alphabetical by name, with numbers in order (2x2 before 10ft). Used for light type lists.
export const byName = (a: any, b: any) =>
  String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { numeric: true, sensitivity: 'base' });
