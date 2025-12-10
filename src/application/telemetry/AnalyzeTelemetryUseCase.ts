import type { TelemetryRepository } from '../../infrastructure/persistence/TelemetryRepository.js';
import type { TelemetryAnomaly } from '../../domain/telemetry/TelemetryAnomaly.js';
import type { Logger } from '../../logging/logger.js';
import type { SpacecraftConfigRepository } from '../../infrastructure/persistence/SpacecraftConfigRepository.js';
import { extractAnomalyRules } from './anomalyRulesAdapter.js';

export type AnalyzeTelemetryInput = {
  spacecraftId: string;
  limit?: number;
  from?: Date;
  to?: Date;
};

export class AnalyzeTelemetryUseCase {
  constructor(
    private readonly repo: TelemetryRepository,
    private readonly spacecraftConfigRepo: SpacecraftConfigRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: AnalyzeTelemetryInput): Promise<TelemetryAnomaly[]> {
    let snapshots;
    if (input.from && input.to) {
      snapshots = await this.repo.findInRange(input.spacecraftId, input.from, input.to);
    } else {
      const limit = input.limit ?? 20;
      snapshots = await this.repo.findRecent(input.spacecraftId, limit);
    }
    const anomalies: TelemetryAnomaly[] = [];
    if (snapshots.length === 0) return anomalies;

    const cfg = await this.spacecraftConfigRepo.getBySpacecraftId(input.spacecraftId);
    const rules = extractAnomalyRules(cfg?.config ?? {});

    for (let i = 0; i < snapshots.length; i++) {
      const current = snapshots[i];
      for (const [key, value] of Object.entries(current.parameters)) {
        const rule = rules.parameters[key];
        if (typeof value === 'number' && rule) {
          const num = value as number;
          if (typeof rule.critLow === 'number' && num < rule.critLow) {
            anomalies.push({
              id: `${current.id}:${key}:CRIT_LOW`,
              spacecraftId: current.spacecraftId,
              timestamp: current.timestamp,
              parameter: key,
              value: num,
              severity: 'HIGH',
              description: `Parameter ${key} below critLow ${rule.critLow}`,
            });
            continue;
          }
          if (typeof rule.warnLow === 'number' && num < rule.warnLow) {
            anomalies.push({
              id: `${current.id}:${key}:WARN_LOW`,
              spacecraftId: current.spacecraftId,
              timestamp: current.timestamp,
              parameter: key,
              value: num,
              severity: 'MEDIUM',
              description: `Parameter ${key} below warnLow ${rule.warnLow}`,
            });
            continue;
          }
          if (typeof rule.critHigh === 'number' && num > rule.critHigh) {
            anomalies.push({
              id: `${current.id}:${key}:CRIT_HIGH`,
              spacecraftId: current.spacecraftId,
              timestamp: current.timestamp,
              parameter: key,
              value: num,
              severity: 'HIGH',
              description: `Parameter ${key} above critHigh ${rule.critHigh}`,
            });
            continue;
          }
          if (typeof rule.warnHigh === 'number' && num > rule.warnHigh) {
            anomalies.push({
              id: `${current.id}:${key}:WARN_HIGH`,
              spacecraftId: current.spacecraftId,
              timestamp: current.timestamp,
              parameter: key,
              value: num,
              severity: 'MEDIUM',
              description: `Parameter ${key} above warnHigh ${rule.warnHigh}`,
            });
          }
        }
      }
    }
    this.logger.info('AnalyzeTelemetryUseCase completed', {
      spacecraftId: input.spacecraftId,
      anomalies: anomalies.length,
    });
    return anomalies;
  }
}
