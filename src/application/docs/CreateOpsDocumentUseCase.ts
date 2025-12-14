import { v4 as uuidv4 } from 'uuid';
import { OpsDocument } from '../../domain/docs/OpsDocument.js';
import { TransactionManager } from '../../infrastructure/persistence/TransactionManager';

export interface CreateOpsDocumentInput {
  spacecraftId?: string | null;
  title: string;
  category: string;
  tags?: string[];
  body: string;
}

export interface CreateOpsDocumentOutput {
  documentId: string;
}

export class CreateOpsDocumentUseCase {
  constructor(private readonly txManager: TransactionManager) {}

  async execute(input: CreateOpsDocumentInput): Promise<CreateOpsDocumentOutput> {
    return this.txManager.withTransaction(async (ctx) => {
      // 1) Domain constructs the entity and records domain events
      const doc = OpsDocument.publish({
        id: uuidv4(),
        spacecraftId: input.spacecraftId ?? null,
        title: input.title,
        category: input.category,
        tags: input.tags ?? [],
        body: input.body,
      });

      // 2) Persist doc
      await ctx.docs.save(doc);

      // 3) Persist domain events to outbox (same DB tx)
      const events = doc.pullDomainEvents?.() ?? [];
      if (events.length > 0) {
        for (const event of events) {
          await ctx.outbox.enqueue({
            type: event.eventType,
            topic: 'domain.OpsDocumentPublished',
            key: doc.spacecraftId ?? undefined,
            headers: { schemaVersion: '1' },
            payload: event,
          });
        }
      }

      return { documentId: doc.id };
    });
  }
}
