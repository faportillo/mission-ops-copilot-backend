// src/domain/docs/OpsDocumentPublishedEvent.ts

import type { DomainEvent } from '../common/DomainEvent.js';

export class OpsDocumentPublishedEvent implements DomainEvent {
  readonly eventType = 'OpsDocumentPublished';
  readonly occurredAt: Date;

  constructor(
    public readonly documentId: string,
    public readonly spacecraftId: string | null,
    public readonly category: string,
    public readonly tags: string[],
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}
