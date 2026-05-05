import axios from 'axios';

const API = 'http://localhost:3000';
async function run() {
  try {
    console.log('Logging in as admin');
    const loginRes = await axios.post(`${API}/api/auth/login`, { email: 'admin@japz.com', password: 'admin123' });
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
