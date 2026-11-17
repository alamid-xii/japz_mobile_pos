import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Attendance = sequelize.define("Attendance", {
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    // The calendar date the shift started (used for grouping)
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  clockIn: {
    // TD-01 Fix: Changed from DataTypes.TIME to DataTypes.DATE (full DATETIME)
    // This supports overnight shifts that cross midnight correctly.
    type: DataTypes.DATE,
    allowNull: true
  },
  clockOut: {
    // TD-01 Fix: Changed from DataTypes.TIME to DataTypes.DATE (full DATETIME)
    type: DataTypes.DATE,
    allowNull: true
  },
  totalHours: {
    // Computed at clock-out: (clockOut - clockIn) in decimal hours, rounded to 2dp
    type: DataTypes.DECIMAL(7, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  lateMinutes: {
    // Minutes arrived after (shiftStart + gracePeriod). 0 if on time.
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  undertimeMinutes: {
    // Minutes left before shiftEnd. 0 if stayed full shift.
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  notes: {
    // Admin correction notes
    type: DataTypes.STRING,
    allowNull: true
  },
  clockOutSource: { type:DataTypes.STRING(16), allowNull:false, defaultValue:'manual' },
  autoClockedOutAt: { type:DataTypes.DATE, allowNull:true },
  autoClockOutOriginalTime: { type:DataTypes.DATE, allowNull:true },
  overtimeApprovedAt: { type:DataTypes.DATE, allowNull:true },
  overtimeApprovedBy: { type:DataTypes.INTEGER, allowNull:true },
  overtimeApprovalReason: { type:DataTypes.STRING(255), allowNull:true
  }
}, {
  indexes: [
    {
      // EC-11 Fix: Prevent duplicate attendance for same employee on same date
      unique: true,
      fields: ['employeeId', 'date'],
      name: 'unique_employee_date'
    }
  ]
});

