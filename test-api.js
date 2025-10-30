/**
 * Comprehensive API Test Script
 * Tests all major endpoints and functionality
 * 
 * Usage: node test-api.js
 * Make sure server is running on http://localhost:3000
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000/api';
let superadminToken = null;
let userToken = null;
let userId = null;
let listingId = null;
let newsId = null;

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: response, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test function
function test(name, fn) {
  return fn()
    .then(() => {
      results.passed++;
      console.log(`✅ ${name}`);
    })
    .catch((error) => {
      results.failed++;
      results.errors.push({ name, error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    });
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting API Tests...\n');

  // 1. Health Check
  await test('Health Check', async () => {
    const res = await makeRequest('GET', '/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 2. Register User
  await test('Register User', async () => {
    const res = await makeRequest('POST', '/auth/register', {
      name: 'Test User',
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      personalEmail: 'testpersonal' + Date.now() + '@gmail.com',
      schoolEmail: 'b' + Date.now() + '@students.ucu.ac.ug',
      password: 'test123456',
      dateOfBirth: '2000-01-15'
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    if (!res.data.token) throw new Error('No token in response');
    userToken = res.data.token;
    userId = res.data.data.user.id;
  });

  // 3. Login User
  await test('User Login', async () => {
    const res = await makeRequest('POST', '/auth/login', {
      email: 'superadmin@example.com',
      password: 'admin123456'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    superadminToken = res.data.token;
  });

  // 4. Superadmin Login
  await test('Superadmin Login', async () => {
    const res = await makeRequest('POST', '/auth/superadmin/login', {
      email: 'superadmin@example.com',
      password: 'admin123456'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.user.role !== 'superadmin') throw new Error('Not a superadmin');
  });

  // 5. Get Profile
  await test('Get Profile', async () => {
    const res = await makeRequest('GET', '/profile', null, userToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.data) throw new Error('No user data in response');
  });

  // 6. Update Profile
  await test('Update Profile', async () => {
    const res = await makeRequest('PUT', '/profile', {
      name: 'Updated Test User',
      phone: '+256700000000'
    }, userToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 7. Get Pending Verifications (Superadmin)
  await test('Get Pending Verifications', async () => {
    const res = await makeRequest('GET', '/admin/pending-verifications', null, superadminToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 8. Verify User (Superadmin)
  await test('Verify User', async () => {
    if (!userId) throw new Error('No user ID available');
    const res = await makeRequest('PUT', `/admin/users/${userId}/verify`, null, superadminToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 9. Get Notifications
  await test('Get Notifications', async () => {
    const res = await makeRequest('GET', '/notifications', null, userToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 10. Get Unread Count
  await test('Get Unread Notification Count', async () => {
    const res = await makeRequest('GET', '/notifications/unread-count', null, userToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 11. Create Listing (Verified User)
  await test('Create Listing', async () => {
    const res = await makeRequest('POST', '/marketplace/listings', {
      title: 'Test Item',
      description: 'This is a test item',
      price: 100,
      category: 'electronics',
      location: 'Dorm A, Room 101'
    }, userToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    listingId = res.data.data.id;
  });

  // 12. Get Listings
  await test('Get Listings', async () => {
    const res = await makeRequest('GET', '/marketplace/listings');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Listings should be an array');
  });

  // 13. Show Interest
  await test('Show Interest in Listing', async () => {
    if (!listingId) throw new Error('No listing ID available');
    const res = await makeRequest('POST', `/marketplace/listings/${listingId}/interest`, {
      message: 'I am interested'
    }, userToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // 14. Create Lost & Found Item
  await test('Create Lost & Found Item', async () => {
    const res = await makeRequest('POST', '/lost-found', {
      type: 'found',
      title: 'Found: Black Backpack',
      description: 'Found near library',
      location: 'Library Building',
      dateLostOrFound: '2024-01-15'
    }, userToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // 15. Get Lost & Found Items
  await test('Get Lost & Found Items', async () => {
    const res = await makeRequest('GET', '/lost-found');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 16. Create News (Superadmin)
  await test('Create News', async () => {
    const res = await makeRequest('POST', '/news', {
      title: 'Test News Article',
      content: 'This is a test news article',
      isUrgent: false,
      status: 'published'
    }, superadminToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    newsId = res.data.data.id;
  });

  // 17. Get News
  await test('Get News', async () => {
    const res = await makeRequest('GET', '/news');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 18. React to News
  await test('React to News', async () => {
    if (!newsId) throw new Error('No news ID available');
    const res = await makeRequest('POST', `/news/${newsId}/reaction`, {
      reactionType: 'like'
    }, userToken);
    if (res.status !== 200 && res.status !== 201) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // 19. Comment on News
  await test('Comment on News', async () => {
    if (!newsId) throw new Error('No news ID available');
    const res = await makeRequest('POST', `/news/${newsId}/comment`, {
      comment: 'This is a test comment'
    }, userToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // 20. Create Advertisement (Superadmin)
  await test('Create Advertisement', async () => {
    const res = await makeRequest('POST', '/advertisements', {
      advertiserName: 'Test Advertiser',
      title: 'Test Advertisement',
      description: 'This is a test ad',
      position: 'banner',
      status: 'active'
    }, superadminToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // 21. Get Advertisements
  await test('Get Advertisements', async () => {
    const res = await makeRequest('GET', '/advertisements');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 22. Get Dashboard Stats (Superadmin)
  await test('Get Dashboard Stats', async () => {
    const res = await makeRequest('GET', '/admin/dashboard/stats', null, superadminToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.data) throw new Error('No stats data');
  });

  // 23. Get All Users (Superadmin)
  await test('Get All Users (Superadmin)', async () => {
    const res = await makeRequest('GET', '/admin/users', null, superadminToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 24. Get All Listings (Superadmin)
  await test('Get All Listings (Superadmin)', async () => {
    const res = await makeRequest('GET', '/admin/listings', null, superadminToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 25. Get Audit Logs (Superadmin)
  await test('Get Audit Logs', async () => {
    const res = await makeRequest('GET', '/admin/audit-logs?limit=10', null, superadminToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 26. Forgot Password
  await test('Forgot Password Request', async () => {
    const res = await makeRequest('POST', '/auth/forgot-password', {
      email: 'superadmin@example.com'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // 27. Update Password
  await test('Update Password', async () => {
    const res = await makeRequest('PUT', '/auth/update-password', {
      currentPassword: 'admin123456',
      newPassword: 'admin123456' // Keep same for testing
    }, superadminToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // Print Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
  }

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check server logs for details.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});


