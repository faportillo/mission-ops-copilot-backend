import type { Spacecraft } from '../../prisma/generated/client/index.js';
import type { TelemetryRepository } from '../infrastructure/persistence/TelemetryRepository.js';
import { TelemetrySnapshot } from '../domain/telemetry/TelemetrySnapshot.js';

export type SimulateOptions = {
  durationMinutes: number;
  intervalSeconds: number;
  nowMs?: number;
  rng?: () => number;
};

function randn(mean: number, std: number, rng: () => number): number {
  // Box-Muller transform
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function withSpike(
  value: number,
  probability: number,
  magnitude: number,
  rng: () => number,
): number {
  if (rng() < probability) {
    const sign = rng() < 0.5 ? -1 : 1;
    return value + sign * magnitude;
  }
  return value;
}

export async function simulateTelemetryForSpacecraft(
  spacecraft: Spacecraft,
  telemetryRepo: TelemetryRepository,
  options: SimulateOptions,
): Promise<void> {
  const { durationMinutes, intervalSeconds } = options;
  const totalPoints = Math.max(1, Math.floor((durationMinutes * 60) / intervalSeconds));
  const rng = options.rng ?? Math.random;

  // Baselines by mission type
  let state: Record<string, number | string | boolean> = {};
  switch (spacecraft.missionType) {
    case 'LEO_IMAGING':
      state = {
        battery_soc: 80,
        battery_temp: 20,
        bus_voltage: 28,
        solar_array_current: 2.5,
        panel_temp: 25,
        payload_temp: 30,
        attitude_error_deg: 0.5,
        rw1_speed_rpm: 3000,
        rw2_speed_rpm: 3200,
        images_captured: 0,
        imaging_mode: 'IDLE',
      };
      break;
    case 'GNSS':
      state = {
        battery_soc: 85,
        bus_voltage: 28,
        clock_drift_ppb: 10,
        clock_bias_ns: 5,
        nav_signal_power_dbm: -130,
        nav_snr_db: 30,
      };
      break;
    case 'GEO_COMMS':
      state = {
        battery_soc: 90,
        bus_voltage: 100,
        payload_power_w: 1500,
        transponder_load_pct: 60,
        uplink_snr_db: 12,
        downlink_snr_db: 12,
        bus_temp: 35,
        payload_temp: 40,
      };
      break;
    case 'CUBESAT':
    default:
      state = {
        battery_soc: 70,
        bus_voltage: 7.2,
        attitude_error_deg: 2,
        magnetorquer_current_ma: 80,
        beacon_rssi_dbm: -90,
        beacon_snr_db: 8,
        mode: 'IDLE',
      };
  }

  const now = options.nowMs ?? Date.now();
  for (let i = 0; i < totalPoints; i++) {
    const ts = new Date(now - (totalPoints - i) * intervalSeconds * 1000);

    // Evolve state with small random jitter
    const p = { ...state };
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'number') {
        let next = v + randn(0, 0.2, rng);
        // occasional spikes per parameter of interest
        if (
          k === 'battery_temp' ||
          k === 'payload_power_w' ||
          k === 'clock_drift_ppb' ||
          k === 'bus_temp' ||
          k === 'payload_temp'
        ) {
          next = withSpike(next, 0.03, 5 + rng() * 10, rng);
        }
        if (k.includes('snr_db')) {
          next = withSpike(next, 0.02, 3, rng);
        }
        if (k.includes('rw') && k.includes('speed_rpm')) {
          next = withSpike(next, 0.02, 500, rng);
        }
        if (k === 'battery_soc') {
          next = Math.max(0, Math.min(100, next + randn(-0.05, 0.1, rng)));
        }
        (p as Record<string, number | string | boolean>)[k] = Number(next.toFixed(3));
      } else if (typeof v === 'string') {
        if (k === 'mode' || k === 'imaging_mode') {
          // occasional mode changes
          const modes = k === 'mode' ? ['IDLE', 'SAFE', 'ACTIVE'] : ['IDLE', 'CAL', 'IMAGING'];
          if (rng() < 0.01) {
            (p as Record<string, number | string | boolean>)[k] =
              modes[Math.floor(Math.random() * modes.length)];
          }
        }
      }
    }

    // special counters
    if (spacecraft.missionType === 'LEO_IMAGING') {
      const capturing = p.imaging_mode === 'IMAGING';
      const prev = (state.images_captured as number) ?? 0;
      const add = capturing ? Math.floor(Math.random() * 3) : 0;
      (p as any).images_captured = prev + add;
    }

    // Persist snapshot
    const snapshot = TelemetrySnapshot.create({
      id: `ts_${spacecraft.id}_${ts.getTime()}_${i}`,
      spacecraftId: spacecraft.id,
      timestamp: ts,
      parameters: p,
    });
    // eslint-disable-next-line no-await-in-loop
    await telemetryRepo.save(snapshot);

    // update state to new values for next iteration
    state = p;
  }
}
