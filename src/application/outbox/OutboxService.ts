import type {
  OutboxRepository,
  NewOutboxMessage,
  OutboxMessage,
} from '../../infrastructure/persistence/OutboxRepository.js';

export class OutboxService {
  private readonly repo: OutboxRepository;

  constructor(repo: OutboxRepository) {
    this.repo = repo;
  }

  async enqueue(message: NewOutboxMessage): Promise<OutboxMessage> {
    return this.repo.enqueue(message);
  }
}
