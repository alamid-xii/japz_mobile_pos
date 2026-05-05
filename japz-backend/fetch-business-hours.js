import axios from 'axios';

(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/business-hours');
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.status : err.message);
  }
})();
