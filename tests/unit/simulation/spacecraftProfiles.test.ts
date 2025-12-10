import { describe, it, expect } from 'vitest';
import { spacecraftProfiles } from '../../../src/simulation/spacecraftProfiles.js';

describe('spacecraftProfiles', () => {
  it('includes four demo profiles with parameters', () => {
    expect(spacecraftProfiles.length).toBe(4);
    for (const p of spacecraftProfiles) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(['LEO_IMAGING', 'GNSS', 'GEO_COMMS', 'CUBESAT']).toContain(p.missionType);
      expect(p.config.parameters && Object.keys(p.config.parameters).length).toBeGreaterThan(0);
    }
  });
});
