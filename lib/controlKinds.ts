// Occupancy sensors, photocells and dimmers ("controls") are stored in area_controls.
// A control with a light_row_id belongs to that row; one without belongs to the whole area.
// Each kind is switched on per job by its column on jobs.

export type ControlKind = 'occupancy' | 'photocell' | 'dimmer';

export const CONTROL_KINDS: ControlKind[] = ['occupancy', 'photocell', 'dimmer'];

// Short label used on rows and lines, e.g. "OC Sensor: 2 × Ceiling PIR".
export const CONTROL_LABEL: Record<ControlKind, string> = { occupancy: 'OC Sensor', photocell: 'Photocell', dimmer: 'Dimmer' };

// Plural heading used for totals and type lists.
export const CONTROL_PLURAL: Record<ControlKind, string> = { occupancy: 'Occupancy sensors', photocell: 'Photocells', dimmer: 'Dimmers' };

export const JOB_COLUMN: Record<ControlKind, 'col_sensor' | 'col_photocell' | 'col_dimmer'> = {
  occupancy: 'col_sensor', photocell: 'col_photocell', dimmer: 'col_dimmer',
};

// The kinds switched on in Job settings. Switching one off hides it but keeps its data.
export function enabledControlKinds(job: any): ControlKind[] {
  return CONTROL_KINDS.filter(k => !!job?.[JOB_COLUMN[k]]);
}

// "Sensors, photocells & dimmers" style heading for the kinds in use.
export function controlsHeading(kinds: ControlKind[]) {
  const names = (kinds.length > 0 ? kinds : CONTROL_KINDS).map(k => CONTROL_PLURAL[k].toLowerCase());
  const text = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
