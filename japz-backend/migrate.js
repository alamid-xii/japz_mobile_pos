// Non-destructive entry point; schema and legacy preservation approved for branch integration.
import { runIntegrationMigration } from './migrations/integrate-branches.js';
await runIntegrationMigration();
