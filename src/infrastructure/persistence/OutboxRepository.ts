export type OutboxMessage = {
  id: string;
  type: string;
  topic: string;
  key?: string | null;
  headers?: Record<string, string> | null;
  payload: unknown;
  availableAt: Date;
  createdAt: Date;
  processed_at: Date | null;
  retries: number;
  lastError?: string | null;
};

export type NewOutboxMessage = {
  type: string;
  topic: string;
  key?: string;
  headers?: Record<string, string>;
  payload: unknown;
  availableAt?: Date;
};

export interface OutboxRepository {
  enqueue(message: NewOutboxMessage): Promise<OutboxMessage>;
  fetchPending(limit: number, now: Date): Promise<OutboxMessage[]>;
  markProcessed(id: string, processedAt: Date): Promise<void>;
  recordFailure(id: string, errorMessage: string, nextAvailableAt: Date): Promise<void>;
}
