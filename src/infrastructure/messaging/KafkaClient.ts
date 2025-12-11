import { Kafka, logLevel, type Producer, type Message } from 'kafkajs';
import type { AppConfig } from '../../config/schema.js';

export type KafkaProducer = Producer;

export function createKafkaProducer(config: AppConfig): KafkaProducer {
  const brokers = (process.env.KAFKA_BROKERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) || ['localhost:29092'];
  const clientId = process.env.KAFKA_CLIENT_ID;
  if (!clientId) {
    throw new Error('KAFKA_CLIENT_ID environment variable must be defined');
  }

  const kafka = new Kafka({
    clientId,
    brokers,
    logLevel: mapLogLevel(config.LOG_LEVEL),
  });

  return kafka.producer({
    allowAutoTopicCreation: true,
  });
}

function mapLogLevel(level: AppConfig['LOG_LEVEL']): logLevel {
  switch (level) {
    case 'debug':
      return logLevel.DEBUG;
    case 'warn':
      return logLevel.WARN;
    case 'error':
      return logLevel.ERROR;
    default:
      return logLevel.INFO;
  }
}

export async function sendRecord(
  producer: KafkaProducer,
  topic: string,
  record: {
    key?: string | null;
    value: string | Buffer;
    headers?: Record<string, string>;
  },
): Promise<void> {
  const msg: Message = {
    key: record.key ?? undefined,
    value: record.value,
    headers: record.headers,
  };
  await producer.send({
    topic,
    messages: [msg],
  });
}
