import axios from 'axios';

async function testDelete() {
  try {
    // Login as admin
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@jh.com',
      password: 'admin'
    });
    const token = loginRes.data.token;

    // Get services
    const servicesRes = await axios.get('http://localhost:3000/api/services', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const serviceToDelete = servicesRes.data[0];
    if (serviceToDelete) {
      console.log('Deleting service ID:', serviceToDelete.service_id, serviceToDelete.service_name);
      const delRes = await axios.delete(`http://localhost:3000/api/services/${serviceToDelete.service_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(delRes.data);
    } else {
      console.log('Service not found');
    }
  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}

testDelete();
