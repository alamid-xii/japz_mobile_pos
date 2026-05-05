import jwt from 'jsonwebtoken';
import axios from 'axios';

const API = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

(async () => {
  try {
    // Create token for admin user id 1
    const token = jwt.sign({ id: 1, name: 'Admin', email: 'admin@gmail.com', role: 'admin' }, JWT_SECRET);
    console.log('Generated token (first 8 chars):', token.slice(0, 8));

    // Update hours
    const updateRes = await axios.put(`${API}/api/business-hours`, { openTime: '14:00', closeTime: '23:00', applyCashier: true, applyKitchen: true }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Update response:', updateRes.data.message);

    const getRes = await axios.get(`${API}/api/business-hours`);
    console.log('Business hours after update:', getRes.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
})();
