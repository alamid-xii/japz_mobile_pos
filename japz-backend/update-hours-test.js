import "dotenv/config";
import axios from 'axios';

const API = process.env.API_URL || 'http://localhost:3000';
async function run() {
  try {
    console.log('Logging in as admin');
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!email || !password) throw new Error('Set private BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD before running this utility.');
    const loginRes = await axios.post(`${API}/api/auth/login`, { email, password });
    const token = loginRes.data.token;
    console.log('Token:', !!token);

    console.log('Updating business hours to 14:00 - 23:00');
    const updateRes = await axios.put(`${API}/api/business-hours`, { openTime: '14:00', closeTime: '23:00', applyCashier: true, applyKitchen: true }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Update response:', updateRes.data.message);

    console.log('Fetching business hours after update');
    const getRes = await axios.get(`${API}/api/business-hours`);
    console.log('Business hours:', getRes.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
