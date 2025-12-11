import type { SpacecraftProfileId } from './spacecraftProfiles.js';
import { spacecraftProfiles } from './spacecraftProfiles.js';

export interface DocTemplate {
  category: string; // "overview" | "parameter_reference" | "troubleshooting" | etc.
  title: string;
  tags: string[];
  body: string;
}

export interface SpacecraftDocBundle {
  profileId: SpacecraftProfileId;
  docs: DocTemplate[];
}

const leoDocs: DocTemplate[] = [
  {
    category: 'overview',
    title: 'Sat-Imager-001 Mission Overview and Subsystem Summary',
    tags: ['overview', 'power', 'thermal', 'adcs', 'payload', 'comms'],
    body: `
Mission: Sat-Imager-001 performs Earth observation imaging from Low Earth Orbit (LEO).

Orbit & Constraints:
- Sun-synchronous LEO with regular eclipse periods. Power margin depends on eclipse duration and payload duty cycle.
- Thermal transitions across day/night boundaries require careful heater setpoints and payload duty scheduling.

Subsystems (high-level):
- Power: battery_soc (%), battery_temp (°C), bus_voltage (V), solar_array_current (A)
- Thermal: panel_temp (°C), payload_temp (°C)
- ADCS: attitude_error_deg (deg), rw1_speed_rpm (rpm), rw2_speed_rpm (rpm)
- Payload: images_captured (count), imaging_mode (enum)
- Comms: not explicitly modeled in telemetry for this profile; rely on ops links for downlink windows.

Telemetry Grouping:
- Power parameters trend with orbital day/night. Expect bus_voltage and battery_soc to vary with solar_array_current.
- Thermal parameters (panel_temp, payload_temp) rise during sunlit imaging and decrease in eclipse.
- ADCS parameters (attitude_error_deg, rw*_speed_rpm) spike during slews or momentum management events.
- Payload parameters (images_captured, imaging_mode) reflect imaging activity and thermal load.
`.trim(),
  },
  {
    category: 'parameter_reference',
    title: 'Sat-Imager-001 Telemetry Parameter Reference',
    tags: ['parameter_reference', 'power', 'thermal', 'adcs', 'payload'],
    body: `
Power:
- battery_soc (%): Typical 35–95% across orbit. Warning < 25%, Critical < 15%.
- battery_temp (°C): Typical 0–35°C. Warning > 35°C or < -5°C; Critical > 45°C or < -10°C.
- bus_voltage (V): Typical 24–34V. Warning < 24V or > 34V; Critical < 22V or > 36V.
- solar_array_current (A): Typical 0.5–6A in sun, ~0A in eclipse. Warning when < 0.5A expected in sun.

Thermal:
- panel_temp (°C): Typical 0–55°C. Warning > 60°C; Critical > 75°C.
- payload_temp (°C): Typical 5–45°C during imaging. Warning > 50°C; Critical > 65°C.

ADCS:
- attitude_error_deg (deg): Typical < 2°. Warning > 2°; Critical > 5°.
- rw1_speed_rpm (rpm), rw2_speed_rpm (rpm): Typical < 6000 rpm. Warning > 6000; Critical > 8000.

Payload:
- images_captured (count): Monotonically increases during imaging windows. Use to correlate payload thermal load.
- imaging_mode (enum): e.g., IDLE, CAL, STRIPMAP; affects power and thermal duty cycle.
`.trim(),
  },
  {
    category: 'troubleshooting',
    title: 'Sat-Imager-001 Common Anomalies and Troubleshooting Playbook',
    tags: ['troubleshooting', 'thermal', 'adcs', 'power'],
    body: `
Thermal Over-Temperature:
- Symptom: battery_temp > 40°C or payload_temp > 50°C while solar_array_current is high.
- Likely Cause: Insufficient dissipation during prolonged sunlit imaging.
- Actions:
  1) Check last eclipse duration and current imaging_mode duty cycle.
  2) Reduce imaging duty cycle; schedule cool-down periods.
  3) Verify bus_voltage and battery_soc to ensure power margin for thermal control.

ADCS Saturation:
- Symptom: attitude_error_deg > 5° with rw1_speed_rpm or rw2_speed_rpm near limits.
- Likely Cause: Reaction wheel saturation or large slew commands.
- Actions:
  1) Initiate momentum management (desaturation) if safe.
  2) Reduce aggressive slew profiles.
  3) Confirm payload thermal limits if pointing is affected.

Low Power Margin:
- Symptom: battery_soc trending < 25%, bus_voltage < 24V at end of eclipse.
- Likely Cause: Eclipse longer than expected or high imaging load.
- Actions:
  1) Suspend payload operations.
  2) Wait for charging in sun; confirm solar_array_current behavior.
  3) Re-assess imaging schedule for next orbits.
`.trim(),
  },
];

const gnssDocs: DocTemplate[] = [
  {
    category: 'overview',
    title: 'GNSS-Nav-Alpha Mission Overview and Subsystem Summary',
    tags: ['overview', 'power', 'gnss', 'timing'],
    body: `
Mission: GNSS-Nav-Alpha provides precise navigation and timing services.

Subsystems:
- Power: battery_soc (%), bus_voltage (V)
- Timing/Clock: clock_drift_ppb (ppb), clock_bias_ns (ns)
- RF Performance: nav_signal_power_dbm (dBm), nav_snr_db (dB)

Telemetry Grouping:
- Power tracks orbit day/night; ensure battery_soc remains in healthy band.
- Clock stability (drift, bias) must remain within thresholds to maintain timing accuracy.
- RF metrics (signal power, SNR) indicate link quality and antenna performance.
`.trim(),
  },
  {
    category: 'parameter_reference',
    title: 'GNSS-Nav-Alpha Telemetry Parameter Reference',
    tags: ['parameter_reference', 'gnss', 'timing'],
    body: `
Power:
- battery_soc (%): Typical 35–95%. Warning < 30%; Critical < 20%.
- bus_voltage (V): Typical >= 24V. Warning < 24V; Critical < 22V.

Timing/Clock:
- clock_drift_ppb (ppb): Typical < 50 ppb. Warning > 50; Critical > 100.
- clock_bias_ns (ns): Typical < 50 ns. Warning > 50; Critical > 100.

RF Performance:
- nav_signal_power_dbm (dBm): Typical > -140 dBm. Warning < -140; Critical < -150.
- nav_snr_db (dB): Typical > 20 dB. Warning < 20; Critical < 10.
`.trim(),
  },
  {
    category: 'troubleshooting',
    title: 'GNSS-Nav-Alpha Clock Stability and Troubleshooting',
    tags: ['troubleshooting', 'timing', 'gnss'],
    body: `
Clock Instability:
- Symptom: clock_drift_ppb > 100 or clock_bias_ns > 100.
- Likely Causes: Temperature excursions, aging of oscillator, radiation events.
- Actions:
  1) Check thermal environment and power stability (battery_soc, bus_voltage).
  2) Apply re-calibration if available; reduce thermal gradients.
  3) Monitor nav_snr_db and nav_signal_power_dbm for RF impairments.

RF Degradation:
- Symptom: nav_snr_db < 10 and nav_signal_power_dbm < -150 dBm.
- Actions:
  1) Inspect antenna pointing and possible obstructions.
  2) Review recent maneuvers impacting attitude.
  3) Check for concurrent onboard emitters increasing noise floor.
`.trim(),
  },
];

const geoDocs: DocTemplate[] = [
  {
    category: 'overview',
    title: 'GEO-Comms-01 Mission Overview and Subsystem Summary',
    tags: ['overview', 'power', 'thermal', 'payload', 'comms'],
    body: `
Mission: GEO-Comms-01 provides geostationary communications services.

Subsystems:
- Power: battery_soc (%), bus_voltage (V)
- Payload/Comms: payload_power_w (W), transponder_load_pct (%), uplink_snr_db (dB), downlink_snr_db (dB)
- Thermal: bus_temp (°C), payload_temp (°C)

Telemetry Grouping:
- Transponder load and payload power drive thermal and power usage.
- SNR metrics track link quality; monitor both uplink and downlink paths.
- Thermal parameters must remain within margins to ensure RF linearity and longevity.
`.trim(),
  },
  {
    category: 'parameter_reference',
    title: 'GEO-Comms-01 Telemetry Parameter Reference',
    tags: ['parameter_reference', 'payload', 'comms', 'thermal'],
    body: `
Power:
- battery_soc (%): Typical > 30% in GEO operations. Warning < 30%; Critical < 20%.
- bus_voltage (V): Typical 90–115V. Warning < 90V or > 115V; Critical < 85V or > 120V.

Payload/Comms:
- payload_power_w (W): Typical < 2000 W. Warning > 2000; Critical > 2300.
- transponder_load_pct (%): Typical < 85%. Warning > 85%; Critical > 95%.
- uplink_snr_db (dB), downlink_snr_db (dB): Typical > 8 dB. Warning < 8 dB; Critical < 5 dB.

Thermal:
- bus_temp (°C): Typical < 55°C. Warning > 55°C; Critical > 70°C.
- payload_temp (°C): Typical < 60°C. Warning > 60°C; Critical > 75°C.
`.trim(),
  },
  {
    category: 'troubleshooting',
    title: 'GEO-Comms-01 Link Budget and Thermal Troubleshooting',
    tags: ['troubleshooting', 'comms', 'thermal'],
    body: `
Low SNR:
- Symptom: uplink_snr_db or downlink_snr_db < 5 dB.
- Actions:
  1) Verify ground segment EIRP and G/T; check weather impacts.
  2) Confirm pointing; review recent ADCS activities.
  3) Reduce transponder_load_pct to restore margin if saturating.

Thermal Overload:
- Symptom: payload_temp > 75°C while payload_power_w and transponder_load_pct are high.
- Actions:
  1) Reduce payload_power_w via channel backoff.
  2) Temporarily lower duty cycle or redistribute traffic.
  3) Monitor bus_temp for platform thermal saturation.
`.trim(),
  },
];

const cubesatDocs: DocTemplate[] = [
  {
    category: 'overview',
    title: 'Cube-001 Mission Overview and Subsystem Summary',
    tags: ['overview', 'power', 'adcs', 'beacon'],
    body: `
Mission: Cube-001 demonstrates CubeSat platform operations with basic payload and beacon telemetry.

Subsystems:
- Power: battery_soc (%), bus_voltage (V)
- ADCS: attitude_error_deg (deg), magnetorquer_current_ma (mA)
- Beacon/Comms: beacon_rssi_dbm (dBm), beacon_snr_db (dB), mode (enum)

Telemetry Grouping:
- Power budget is tight; battery_soc and bus_voltage should be closely monitored.
- ADCS coarse control uses magnetorquers; attitude_error_deg degrades near poles.
- Beacon metrics (RSSI, SNR) vary with pass geometry and ground station performance.
`.trim(),
  },
  {
    category: 'parameter_reference',
    title: 'Cube-001 Telemetry Parameter Reference',
    tags: ['parameter_reference', 'adcs', 'beacon', 'power'],
    body: `
Power:
- battery_soc (%): Typical > 35%. Warning < 35%; Critical < 25%.
- bus_voltage (V): Typical > 6.5V. Warning < 6.5V; Critical < 6.0V.

ADCS:
- attitude_error_deg (deg): Typical < 5°. Warning > 5°; Critical > 10°.
- magnetorquer_current_ma (mA): Typical < 120 mA. Warning > 120; Critical > 150.

Beacon/Comms:
- beacon_rssi_dbm (dBm): Typical > -110 dBm. Warning < -110; Critical < -120.
- beacon_snr_db (dB): Typical > 5 dB. Warning < 5; Critical < 2.
- mode (enum): SAFE, IDLE, BEACON; used to constrain operations in low power.
`.trim(),
  },
  {
    category: 'troubleshooting',
    title: 'Cube-001 Safe Mode and Troubleshooting Playbook',
    tags: ['troubleshooting', 'power', 'adcs', 'beacon'],
    body: `
Low Power:
- Symptom: battery_soc < 25% and bus_voltage < 6.0V.
- Actions:
  1) Enter SAFE mode; disable non-essential loads.
  2) Wait for charging opportunities; reduce beacon duty cycle.
  3) Resume operations when battery_soc recovers > 35%.

ADCS Degradation:
- Symptom: attitude_error_deg > 10° with magnetorquer_current_ma near maximum.
- Actions:
  1) Reduce attitude demands; accept degraded pointing.
  2) Schedule operations away from high-disturbance regions.
  3) Verify thermal and power margins for ADCS activity.
`.trim(),
  },
];

const bundles: SpacecraftDocBundle[] = [
  { profileId: 'LEO_IMAGING_DEMO', docs: leoDocs },
  { profileId: 'GNSS_DEMO', docs: gnssDocs },
  { profileId: 'GEO_COMMS_DEMO', docs: geoDocs },
  { profileId: 'CUBESAT_DEMO', docs: cubesatDocs },
];

export function getDocTemplatesForProfile(profileId: SpacecraftProfileId): DocTemplate[] {
  const b = bundles.find((x) => x.profileId === profileId);
  return b ? b.docs : [];
}
