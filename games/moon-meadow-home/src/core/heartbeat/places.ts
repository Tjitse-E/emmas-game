// Which steps the heartbeat places can serve, per wave.
export type Wave = 'A' | 'B' | 'C';
export type PlaceDecl = { id: 'nest' | 'wish' | 'naming' | 'door' | 'rollcall-door'; strand: 'r' | 's' | 'm'; steps: string[]; wave: Wave; school: boolean };

const WISH_A = ['R01', 'R02', 'R03', 'R04', 'R05', 'R07', 'R08', 'R09', 'R10', 'R13', 'R14', 'R15', 'R16', 'R17',
  'R18', 'R19', 'R21', 'R22', 'R23', 'R24', 'R26', 'R30', 'R32', 'R34', 'R36', 'R39', 'R41',
  'R04D', 'R11', 'R20', 'R38'];
const NAMING_A = ['S01', 'S02', 'S03', 'S04', 'S05', 'S07', 'S09', 'S11', 'S12', 'S13', 'S14', 'S20', 'S22',
  'S24', 'S26', 'S28', 'S29', 'S30'];

// R06 and R25 are display-only tricky-word steps (spec 3.9). S03D, S06 and S10 are served by label bubbles (places).
export const HEARTBEAT_PLACES: PlaceDecl[] = [
  { id: 'nest', strand: 'm', steps: ['M01', 'M02', 'M05', 'M09', 'M10', 'M11', 'M12'], wave: 'A', school: false },
  { id: 'nest', strand: 'm', steps: ['M04', 'M13', 'M14'], wave: 'B', school: false },
  { id: 'wish', strand: 'r', steps: WISH_A, wave: 'A', school: true },
  { id: 'wish', strand: 'r', steps: ['R12', 'R27', 'R28', 'R29'], wave: 'B', school: true },
  { id: 'wish', strand: 'r', steps: ['R33', 'R37'], wave: 'C', school: true },
  { id: 'naming', strand: 's', steps: NAMING_A, wave: 'A', school: false },
  { id: 'door', strand: 'm', steps: ['M02', 'M07'], wave: 'A', school: false },
  { id: 'rollcall-door', strand: 'm', steps: ['M07'], wave: 'A', school: false },
];

/** 'A' now; Task 24 sets 'B', Task 27 sets 'C'. */
export const BUILT_WAVE: Wave = 'A';

const ORDER: Record<Wave, number> = { A: 0, B: 1, C: 2 };
export function placesUpTo(wave: Wave): PlaceDecl[] {
  return HEARTBEAT_PLACES.filter((p) => ORDER[p.wave] <= ORDER[wave]);
}
