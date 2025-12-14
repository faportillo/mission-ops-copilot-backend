import { describe, it, expect } from 'vitest';
import { InMemoryDocsRepository } from '../../../src/infrastructure/persistence/inMemory/InMemoryDocsRepository.js';
import { SearchDocsUseCase } from '../../../src/application/docs/SearchDocsUseCase.js';
import { OpsDocument } from '../../../src/domain/docs/OpsDocument.js';

describe('SearchDocsUseCase', () => {
  it('searches docs by keyword', async () => {
    const repo = new InMemoryDocsRepository();
    const uc = new SearchDocsUseCase(repo);
    await repo.save(
      OpsDocument.publish({
        id: 'd1',
        title: 'Thermal Ops',
        body: 'Manage temp',
        tags: ['thermal'],
        category: 'general',
      }),
    );
    await repo.save(
      OpsDocument.publish({
        id: 'd2',
        title: 'Power Ops',
        body: 'Manage volt',
        tags: ['power'],
        category: 'general',
      }),
    );
    const results = await uc.execute('thermal', 10);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('d1');
  });
});
