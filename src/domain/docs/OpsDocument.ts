// src/domain/docs/OpsDocument.ts

import { BaseEntity } from '../common/BaseEntity';
import { OpsDocumentPublishedEvent } from './OpsDocumentPublishedEvent';

export interface OpsDocumentProps {
  id: string;
  spacecraftId: string | null;
  title: string;
  category: string;
  tags: string[];
  body: string;
  publishedAt: Date;
}

export class OpsDocument extends BaseEntity {
  readonly id: string;
  readonly spacecraftId: string | null;
  readonly publishedAt: Date;

  title: string;
  category: string;
  tags: string[];
  body: string;

  private constructor(props: OpsDocumentProps) {
    super();
    this.id = props.id;
    this.spacecraftId = props.spacecraftId;
    this.title = props.title;
    this.category = props.category;
    this.tags = props.tags;
    this.body = props.body;
    this.publishedAt = props.publishedAt;
  }

  /**
   * Recreate an OpsDocument from persistence WITHOUT recording domain events.
   */
  static rehydrate(props: OpsDocumentProps): OpsDocument {
    return new OpsDocument(props);
  }

  /**
   * Domain operation:
   * Create a document in the "published" state.
   *
   * This RECORDS a domain event.
   * It does NOT persist or publish anything.
   */
  static publish(input: {
    id: string;
    spacecraftId?: string | null;
    title: string;
    category: string;
    tags?: string[];
    body: string;
    publishedAt?: Date;
  }): OpsDocument {
    const doc = new OpsDocument({
      id: input.id,
      spacecraftId: input.spacecraftId ?? null,
      title: input.title,
      category: input.category,
      tags: input.tags ?? [],
      body: input.body,
      publishedAt: input.publishedAt ?? new Date(),
    });

    // Record the domain fact
    doc.addDomainEvent(
      new OpsDocumentPublishedEvent(
        doc.id,
        doc.spacecraftId,
        doc.category,
        doc.tags,
        doc.publishedAt,
      ),
    );

    return doc;
  }

  /**
   * Archive the document.
   * (Would record OpsDocumentArchivedEvent)
   */
  archive(): void {
    throw new Error('Not implemented');
  }
}
