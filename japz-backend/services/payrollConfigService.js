/**
 * PayrollConfigService — Load and cache dynamic payroll configuration.
 *
 * Config values are stored in the PayrollConfigs table so admins can
 * edit them from the UI without redeploying code.
 *
 * Pattern: mirrors the businessHoursModel pattern used in routes/index.js
 *
 * RULE: Never hardcode grace period, multipliers, or hours in the calculator.
 *       Always load from this service.
 */
import { PayrollConfig } from '../models/payrollConfigModel.js';
import { createLog } from '../utils/logger.js';

// ─── DEFAULT CONFIG SEEDS ─────────────────────────────────────────────────────
// These are inserted when the table is empty (first run / fresh DB).
const DEFAULT_SEEDS = [
  {
    configKey: 'regularHoursPerDay',
    configValue: '8',
    description: 'Standard working hours per day (used in absence deduction calculation)'
  },
  {
    configKey: 'gracePeriodMinutes',
    configValue: '5',
    description: 'Minutes after shift start before late deduction applies'
  },
  {
    configKey: 'overtimeMultiplier',
    configValue: '1.25',
    description: 'Pay multiplier for hours beyond regular shift (e.g. 1.25 = 125%)'
  },
  {
    configKey: 'restDayMultiplier',
    configValue: '1.30',
    description: 'Pay multiplier for working on a rest day'
  },
  {
    configKey: 'breakMinutes',
    configValue: '60',
    description: 'Unpaid break duration per day in minutes (deducted from totalHours)'
  },
  {
    configKey: 'workingDays',
    configValue: '1,2,3,4,5,6',
    description: 'Day-of-week ints that are working days (0=Sun,1=Mon...6=Sat). Mon-Sat default.'
  },
  {
    configKey: 'deductAbsenceDailyRate',
    configValue: 'false',
    description: 'Deduct full daily rate for absences (true = deducts DR×absences from gross pay; false = No Work No Pay, only paid for hours worked)'
  },
];

// ─── IN-MEMORY CACHE ──────────────────────────────────────────────────────────
let configCache = null;

/**
 * Invalidate the in-memory cache (call after any config update).
 */
export const invalidateConfigCache = () => {
  configCache = null;
};

// ─── SEED DEFAULTS ────────────────────────────────────────────────────────────

/**
 * Seed default config values if missing in DB.
 * Safe to call on every server start.
 */
export const seedDefaultConfigs = async () => {
  try {
    for (const seed of DEFAULT_SEEDS) {
      await PayrollConfig.findOrCreate({
        where: { configKey: seed.configKey },
        defaults: seed
      });
    }
  } catch (error) {
    console.error('❌ PayrollConfig seed error:', error);
  }
};

// ─── LOAD CONFIG ──────────────────────────────────────────────────────────────

/**
 * Load all payroll configs from the database and return as a structured object.
 * Results are cached in memory after first load.
 *
 * @returns {Promise<Object>} - Structured config object ready for PayrollCalculator
 */
export const getPayrollConfig = async () => {
  if (configCache) return configCache;

  const rows = await PayrollConfig.findAll();

  // Convert key-value rows → structured object
  const map = {};
  for (const row of rows) {
    map[row.configKey] = row.configValue;
  }

  configCache = {
    regularHoursPerDay: parseFloat(map.regularHoursPerDay) || 8,
    gracePeriodMinutes: parseInt(map.gracePeriodMinutes) || 5,
    overtimeMultiplier: parseFloat(map.overtimeMultiplier) || 1.25,
    restDayMultiplier:  parseFloat(map.restDayMultiplier)  || 1.30,
    breakMinutes:       parseInt(map.breakMinutes)         || 60,
    workingDays:        (map.workingDays || '1,2,3,4,5,6')
                          .split(',')
                          .map(Number)
                          .filter(n => !isNaN(n)),
    deductAbsenceDailyRate: map.deductAbsenceDailyRate === 'true' || map.deductAbsenceDailyRate === true,
  };

  return configCache;
};

// ─── GET ALL CONFIGS (for admin UI) ──────────────────────────────────────────

/**
 * Return raw config rows for the admin settings page.
 */
export const getAllConfigRows = async () => {
  return await PayrollConfig.findAll({ order: [['configKey', 'ASC']] });
};

// ─── UPDATE A CONFIG ──────────────────────────────────────────────────────────

/**
 * Update a single config value.
 *
 * @param {string} configKey    - The key to update
 * @param {string} configValue  - The new value (always stored as string)
 * @param {number} updatedByUserId - Admin user ID performing the update
 * @returns {Promise<PayrollConfig>}
 */
export const updateConfig = async (configKey, configValue, updatedByUserId, updatedByUserName) => {
  const config = await PayrollConfig.findOne({ where: { configKey } });
  if (!config) {
    throw new Error(`Config key "${configKey}" not found`);
  }

  const oldValue = config.configValue;
  config.configValue = String(configValue);
  config.updatedBy = updatedByUserId;
  await config.save();

  // Invalidate cache so next getPayrollConfig() re-reads from DB
  invalidateConfigCache();

  // Audit log
  await createLog({
    action: 'OTHER',
    module: 'payroll_config',
    userId: updatedByUserId,
    userName: updatedByUserName,
    entityId: config.id,
    entityType: 'PayrollConfig',
    description: `Admin updated payroll config: ${configKey} → ${configValue}`,
    changes: { before: { [configKey]: oldValue }, after: { [configKey]: configValue } },
    status: 'success'
  });

  return config;
};
