#!/usr/bin/env node
import { Command } from 'commander';
import { createAppContext } from '../../index.js';

async function main(argv: string[]) {
  const ctx = createAppContext();
  const program = new Command();
  program.name('mission-ops-copilot').description('Mission Ops Copilot CLI').version('0.1.0');

  const { ingestTelemetryCommand } = await import('./commands/ingest-telemetry.js');
  const { listTelemetryCommand } = await import('./commands/list-telemetry.js');
  const { analyzeTelemetryCommand } = await import('./commands/analyze-telemetry.js');
  const { listEventsCommand } = await import('./commands/list-events.js');
  const { searchDocsCommand } = await import('./commands/search-docs.js');
  const { seedDemoDataCommand } = await import('./commands/seed-demo-data.js');

  program.addCommand(ingestTelemetryCommand(ctx));
  program.addCommand(listTelemetryCommand(ctx));
  program.addCommand(analyzeTelemetryCommand(ctx));
  program.addCommand(listEventsCommand(ctx));
  program.addCommand(searchDocsCommand(ctx));
  program.addCommand(seedDemoDataCommand(ctx));

  await program.parseAsync(argv);
}

main(process.argv).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
