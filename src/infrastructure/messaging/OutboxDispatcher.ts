import type { Logger } from '../../logging/logger.js';
import type { TimeProvider } from '../time/TimeProvider.js';
import type { OutboxRepository } from '../persistence/OutboxRepository.js';
import { createKafkaProducer, sendRecord, type KafkaProducer } from './KafkaClient.js';
import type { AppConfig } from '../../config/schema.js';

export class OutboxDispatcher {
  private readonly repo: OutboxRepository;
  private readonly logger: Logger;
  private readonly time: TimeProvider;
  private readonly config: AppConfig;
  private readonly pollMs: number;
  private readonly batchSize: number;
  private producer: KafkaProducer | null = null;
  private timer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(params: {
    repo: OutboxRepository;
    logger: Logger;
    time: TimeProvider;
    config: AppConfig;
    pollMs?: number;
    batchSize?: number;
  }) {
    this.repo = params.repo;
    this.logger = params.logger;
    this.time = params.time;
    this.config = params.config;
    this.pollMs = params.pollMs ?? Number(process.env.KAFKA_OUTBOX_POLL_MS ?? 1000);
    this.batchSize = params.batchSize ?? Number(process.env.KAFKA_OUTBOX_BATCH_SIZE ?? 50);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.producer = createKafkaProducer(this.config);
    await this.producer.connect();
    this.logger.info('OutboxDispatcher started');
    this.schedule();
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
    this.logger.info('OutboxDispatcher stopped');
  }

  private schedule(): void {
    if (!this.started) return;
    this.timer = setTimeout(() => {
      this.tick()
        .catch((err) => {
          this.logger.error('Outbox tick error', { err });
        })
        .finally(() => this.schedule());
    }, this.pollMs);
  }

  private async tick(): Promise<void> {
    if (!this.producer) return;
    const now = this.time.now();
    const pending = await this.repo.fetchPending(this.batchSize, now);
    if (pending.length === 0) return;

    for (const msg of pending) {
      try {
        const value = Buffer.from(JSON.stringify(msg.payload));
        await sendRecord(this.producer, msg.topic, {
          key: msg.key ?? null,
          value,
          headers: msg.headers ?? undefined,
        });
        await this.repo.markProcessed(msg.id, this.time.now());
      } catch (err: any) {
        const delayMs = this.backoffMs(msg.retries);
        const next = new Date(this.time.now().getTime() + delayMs);
        await this.repo.recordFailure(msg.id, err?.message ?? String(err), next);
      }
    }
  }

  private backoffMs(retries: number): number {
    const base = 1000;
    const max = 30_000;
    const factor = 2 ** Math.min(retries, 5);
    return Math.min(base * factor, max);
  }
}
