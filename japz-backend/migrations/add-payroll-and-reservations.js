// Compatibility entry point: never recreate the obsolete online payroll schema.
import { runIntegrationMigration } from './integrate-branches.js';
await runIntegrationMigration();
