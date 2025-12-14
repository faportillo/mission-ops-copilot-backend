// src/domain/common/DomainEvent.ts
export interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
}
