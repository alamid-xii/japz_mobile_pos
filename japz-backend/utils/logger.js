import { Log } from '../models/logModel.js';

/**
 * Create an activity log entry
 * @param {Object} logData - Log data object
 * @returns {Promise<Log>} - Created log record
 */
export const createLog = async (logData) => {
  try {
    const log = await Log.create({
      userId: logData.userId || null,
      userName: logData.userName || null,
      action: logData.action || 'OTHER',
      module: logData.module,
      entityId: logData.entityId || null,
      entityType: logData.entityType || null,
      description: logData.description || null,
      changes: logData.changes || null,
      ipAddress: logData.ipAddress || null,
      status: logData.status || 'success',
      errorMessage: logData.errorMessage || null,
    });
    return log;
  } catch (error) {
    console.error('Error creating log:', error);
    // Don't throw - logging failures shouldn't crash the app
  }
};

/**
 * Get logs with optional filtering
 * @param {Object} filters - Filter options (action, module, userId, etc.)
 * @param {number} limit - Maximum records to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} - Logs and total count
 */
export const getLogs = async (filters = {}, limit = 50, offset = 0) => {
  try {
    const where = {};
    
    if (filters.action) where.action = filters.action;
    if (filters.module) where.module = filters.module;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.status) where.status = filters.status;
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt[Op.gte] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt[Op.lte] = new Date(filters.endDate);
      }
    }

    const { count, rows } = await Log.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { logs: rows, total: count };
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return { logs: [], total: 0 };
  }
};

/**
 * Get logs for a specific entity
 * @param {string} entityType - Type of entity
 * @param {number} entityId - ID of entity
 * @returns {Promise<Array>} - Array of logs for that entity
 */
export const getEntityLogs = async (entityType, entityId) => {
  try {
    const logs = await Log.findAll({
      where: { entityType, entityId },
      order: [['createdAt', 'DESC']],
    });
    return logs;
  } catch (error) {
    console.error('Error retrieving entity logs:', error);
    return [];
  }
};

/**
 * Helper to get IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - IP address
 */
export const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
};

export default { createLog, getLogs, getEntityLogs, getClientIp };
