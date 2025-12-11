import { Command } from 'commander';
import type { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../../infrastructure/db/prisma.js';
import { spacecraftProfiles } from '../../../simulation/spacecraftProfiles.js';
import { getDocTemplatesForProfile } from '../../../simulation/docTemplates.js';

export interface SeedDocsOptions {
  overwriteExisting?: boolean;
}

export async function seedDocsForDemoSpacecraft(
  prisma: PrismaClient,
  options: SeedDocsOptions = {},
): Promise<void> {
  let totalCreated = 0;
  let totalUpdated = 0;

  for (const profile of spacecraftProfiles) {
    // Find spacecraft by name (created by seed-demo-data)
    const sc = await prisma.spacecraft.findFirst({ where: { name: profile.name } });
    if (!sc) {
      // eslint-disable-next-line no-console
      console.warn(
        `Skipping docs for ${profile.name} (${profile.missionType}) - spacecraft not found`,
      );
      continue;
    }
    const bundle = getDocTemplatesForProfile(profile.id);
    // eslint-disable-next-line no-console
    console.log(`Seeding docs for ${profile.name} (${profile.missionType})...`);
    let created = 0;
    let updated = 0;

    for (const t of bundle) {
      const spacecraftTag = `spacecraft:${sc.id}`;
      const categoryTag = `category:${t.category}`;
      const missionTag = `missionType:${profile.missionType}`;
      const tags = Array.from(new Set([spacecraftTag, categoryTag, missionTag, ...t.tags]));

      // Dedupe by (title + tags contains spacecraft/category markers)
      const existing = await prisma.opsDocument.findFirst({
        where: {
          title: t.title,
          tags: { hasEvery: [spacecraftTag, categoryTag] },
        },
      });

      if (existing) {
        if (options.overwriteExisting) {
          await prisma.opsDocument.update({
            where: { id: existing.id },
            data: { content: t.body, tags },
          });
          updated++;
        } else {
          // skip
        }
      } else {
        await prisma.opsDocument.create({
          data: {
            title: t.title,
            content: t.body,
            tags,
          },
        });
        created++;
      }
    }
    totalCreated += created;
    totalUpdated += updated;
    // eslint-disable-next-line no-console
    console.log(`  Created ${created} new docs, updated ${updated} existing docs.`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Total created=${totalCreated}, updated=${totalUpdated}.`);
}

export function seedDemoDocsCommandFactory(prisma: PrismaClient) {
  const cmd = new Command('seed-demo-docs')
    .description('Seed rich operations documents for demo spacecraft')
    .argument('[overwriteExisting]', 'Overwrite existing docs (true/false)', 'false')
    .action(async (overwriteFlag: string) => {
      const overwriteExisting =
        overwriteFlag === 'true' ||
        overwriteFlag === '1' ||
        overwriteFlag?.toLowerCase?.() === 'yes';
      await seedDocsForDemoSpacecraft(prisma, { overwriteExisting });
    });
  return cmd;
}

export function seedDemoDocsCommand() {
  const prisma = getPrisma();
  return seedDemoDocsCommandFactory(prisma as unknown as PrismaClient);
}
