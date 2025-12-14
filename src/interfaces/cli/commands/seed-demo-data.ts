import { Command } from 'commander';
import type { PrismaClient, Spacecraft } from '../../../../prisma/generated/client/index.js';
import type { TelemetryRepository } from '../../../infrastructure/persistence/TelemetryRepository.js';
import type { SpacecraftConfigService } from '../../../application/spacecraft/SpacecraftConfigService.js';
import { spacecraftProfiles } from '../../../simulation/spacecraftProfiles.js';
import { simulateTelemetryForSpacecraft } from '../../../simulation/telemetrySimulator.js';

export type SeedOptions = {
  durationMinutesPerSpacecraft: number;
  intervalSeconds: number;
  dryRun?: boolean;
};

export async function seedDemoData(
  prisma: PrismaClient,
  telemetryRepo: TelemetryRepository,
  spacecraftConfigService: SpacecraftConfigService,
  options: SeedOptions,
): Promise<void> {
  const dryRunEffective =
    Boolean(options?.dryRun) ||
    process.argv.includes('--dry-run') ||
    process.env.SEED_DRY_RUN === '1' ||
    process.env.SEED_DRY_RUN === 'true';
  for (const profile of spacecraftProfiles) {
    // Upsert spacecraft by name (no unique constraint on name; emulate by find then create/update)
    let sc: Spacecraft | null = null;
    if (!dryRunEffective) {
      sc = await prisma.spacecraft.findFirst({
        where: { name: profile.name },
      });
      if (!sc) {
        sc = await prisma.spacecraft.create({
          data: { name: profile.name, missionType: profile.missionType },
        });
      } else if (sc.missionType !== profile.missionType) {
        sc = await prisma.spacecraft.update({
          where: { id: sc.id },
          data: { missionType: profile.missionType },
        });
      }
    } else {
      // fabricate an id for dry-run to compute counts deterministically
      sc = {
        id: `dry_${profile.id}`,
        name: profile.name,
        missionType: profile.missionType,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Spacecraft;
    }

    if (!dryRunEffective) {
      await spacecraftConfigService.updateConfig(sc.id, profile.config, {
        status: 'approved',
        source: 'seed',
      });
    }

    // Simulate telemetry for this spacecraft
    if (!dryRunEffective) {
      await simulateTelemetryForSpacecraft(sc, telemetryRepo, {
        durationMinutes: options.durationMinutesPerSpacecraft,
        intervalSeconds: options.intervalSeconds,
      });
    }

    // eslint-disable-next-line no-console
    console.log(
      `${dryRunEffective ? '[DRY-RUN] ' : ''}Seeded ${profile.name} (${profile.missionType}) for ${options.durationMinutesPerSpacecraft} minutes @ ${options.intervalSeconds}s interval`,
    );
  }
}

export function seedDemoDataCommandFactory(
  prisma: PrismaClient,
  telemetryRepo: TelemetryRepository,
  spacecraftConfigService: SpacecraftConfigService,
) {
  const cmd = new Command('seed-demo-data')
    .description('Seed demo spacecraft, configs, and simulated telemetry')
    .argument('[durationMinutesPerSpacecraft]', 'Minutes of history per spacecraft', '120')
    .argument('[intervalSeconds]', 'Seconds between snapshots', '60')
    .option('--dry-run', 'Dry run (no writes)', false)
    .action(async function (this: Command, durationStr: string, intervalStr: string) {
      const durationMinutesPerSpacecraft = parseInt(durationStr, 10);
      const intervalSeconds = parseInt(intervalStr, 10);
      // Commander v12: prefer optsWithGlobals if available; fallback to opts()
      const anyThis = this as unknown as { optsWithGlobals?: () => any; opts: () => any };
      const rawOpts =
        typeof anyThis.optsWithGlobals === 'function' ? anyThis.optsWithGlobals() : anyThis.opts();
      const argvDryRun = process.argv.includes('--dry-run');
      const dryRun = Boolean(rawOpts?.dryRun ?? argvDryRun);
      await seedDemoData(prisma, telemetryRepo, spacecraftConfigService, {
        durationMinutesPerSpacecraft,
        intervalSeconds,
        dryRun,
      });
    });
  return cmd;
}

// Backward-compatible shape with other CLI commands
import type { AppContext } from '../../../index.js';
import { getPrisma } from '../../../infrastructure/db/prisma.js';
export function seedDemoDataCommand(ctx: AppContext) {
  const prisma = getPrisma();
  return seedDemoDataCommandFactory(
    prisma as unknown as PrismaClient,
    ctx.telemetryRepository,
    ctx.spacecraftConfigService,
  );
}
