import { sequelize } from './models/db.js';
import { User } from './models/userModel.js';

(async () => {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { role: 'admin' } });
    console.log('Admin user:', admin ? { id: admin.id, email: admin.email, name: admin.name, status: admin.status } : 'None');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
