// src/domain/common/BaseEntity.ts
import type { DomainEvent } from './DomainEvent.js';

export abstract class BaseEntity {
  private domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Returns and clears accumulated domain events.
   * Application layer should call this after persistence.
   */
  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }

  /**
   * Useful for debugging or tests.
   */
  peekDomainEvents(): readonly DomainEvent[] {
    return this.domainEvents;
  }

  protected clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
