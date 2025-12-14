import { z } from 'zod';
import type { TelemetryDiff, TelemetryParameters } from '../common/types.js';
import { InvalidTelemetryError } from '../common/DomainError.js';
import { BaseEntity } from '../common/BaseEntity.js';

export type TelemetrySnapshotProps = {
  id: string;
  spacecraftId: string;
  timestamp: Date;
  parameters: TelemetryParameters;
};

export class TelemetrySnapshot extends BaseEntity {
  readonly id: string;
  readonly spacecraftId: string;
  readonly timestamp: Date;
  readonly parameters: TelemetryParameters;

  private constructor(props: TelemetrySnapshotProps) {
    super();
    this.id = props.id;
    this.spacecraftId = props.spacecraftId;
    this.timestamp = props.timestamp;
    this.parameters = props.parameters;
  }

  static create(props: TelemetrySnapshotProps): TelemetrySnapshot {
    const schema = z.object({
      id: z.string().min(1),
      spacecraftId: z.string().min(1),
      timestamp: z.date(),
      parameters: z.record(z.union([z.number(), z.string(), z.boolean()])),
    });
    const parsed = schema.safeParse(props);
    if (!parsed.success) {
      throw new InvalidTelemetryError(parsed.error.message);
    }
    return new TelemetrySnapshot(parsed.data);
  }

  diffFrom(prev: TelemetrySnapshot): TelemetryDiff {
    const changed: TelemetryDiff['changed'] = [];
    const keys = new Set([...Object.keys(this.parameters), ...Object.keys(prev.parameters)]);
    for (const key of keys) {
      const current = this.parameters[key];
      const previous = prev.parameters[key];
      if (current !== previous) {
        let delta: number | undefined = undefined;
        if (typeof current === 'number' && typeof previous === 'number') {
          delta = current - previous;
        }
        changed.push({ parameter: key, previous, current, delta });
      }
    }
    return { changed };
  }
}
