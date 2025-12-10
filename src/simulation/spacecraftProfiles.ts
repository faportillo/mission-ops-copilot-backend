import type { AnomalyRules } from '../domain/telemetry/AnomalyRules.js';

export type SpacecraftProfileId =
  | 'LEO_IMAGING_DEMO'
  | 'GNSS_DEMO'
  | 'GEO_COMMS_DEMO'
  | 'CUBESAT_DEMO';

export type SpacecraftProfile = {
  id: SpacecraftProfileId;
  name: string;
  missionType: 'LEO_IMAGING' | 'GNSS' | 'GEO_COMMS' | 'CUBESAT';
  config: { parameters: AnomalyRules['parameters'] };
};

export const spacecraftProfiles: SpacecraftProfile[] = [
  {
    id: 'LEO_IMAGING_DEMO',
    name: 'Sat-Imager-001',
    missionType: 'LEO_IMAGING',
    config: {
      parameters: {
        battery_soc: { warnLow: 25, critLow: 15 },
        battery_temp: { warnHigh: 35, critHigh: 45, warnLow: -5, critLow: -10 },
        bus_voltage: { warnLow: 24, critLow: 22, warnHigh: 34, critHigh: 36 },
        solar_array_current: { warnLow: 0.5, critLow: 0.2 },
        panel_temp: { warnHigh: 60, critHigh: 75 },
        payload_temp: { warnHigh: 50, critHigh: 65 },
        attitude_error_deg: { warnHigh: 2, critHigh: 5 },
        rw1_speed_rpm: { warnHigh: 6000, critHigh: 8000 },
        rw2_speed_rpm: { warnHigh: 6000, critHigh: 8000 },
        images_captured: {},
        imaging_mode: {},
      },
    },
  },
  {
    id: 'GNSS_DEMO',
    name: 'GNSS-Nav-Alpha',
    missionType: 'GNSS',
    config: {
      parameters: {
        battery_soc: { warnLow: 30, critLow: 20 },
        bus_voltage: { warnLow: 24, critLow: 22 },
        clock_drift_ppb: { warnHigh: 50, critHigh: 100 },
        clock_bias_ns: { warnHigh: 50, critHigh: 100 },
        nav_signal_power_dbm: { warnLow: -140, critLow: -150 },
        nav_snr_db: { warnLow: 20, critLow: 10 },
      },
    },
  },
  {
    id: 'GEO_COMMS_DEMO',
    name: 'GEO-Comms-01',
    missionType: 'GEO_COMMS',
    config: {
      parameters: {
        battery_soc: { warnLow: 30, critLow: 20 },
        bus_voltage: { warnLow: 90, critLow: 85, warnHigh: 115, critHigh: 120 },
        payload_power_w: { warnHigh: 2000, critHigh: 2300 },
        transponder_load_pct: { warnHigh: 85, critHigh: 95 },
        uplink_snr_db: { warnLow: 8, critLow: 5 },
        downlink_snr_db: { warnLow: 8, critLow: 5 },
        bus_temp: { warnHigh: 55, critHigh: 70 },
        payload_temp: { warnHigh: 60, critHigh: 75 },
      },
    },
  },
  {
    id: 'CUBESAT_DEMO',
    name: 'Cube-001',
    missionType: 'CUBESAT',
    config: {
      parameters: {
        battery_soc: { warnLow: 35, critLow: 25 },
        bus_voltage: { warnLow: 6.5, critLow: 6.0 },
        attitude_error_deg: { warnHigh: 5, critHigh: 10 },
        magnetorquer_current_ma: { warnHigh: 120, critHigh: 150 },
        beacon_rssi_dbm: { warnLow: -110, critLow: -120 },
        beacon_snr_db: { warnLow: 5, critLow: 2 },
        mode: {},
      },
    },
  },
];
