// backend/minimal-test.js

// ==========================================
// CONFIGURATION
// ==========================================
const BASE_URL = 'http://localhost:4000/api'; // Ensure this matches your server port!

// Generate random 3-digit suffix for uniqueness
const RAND = Math.floor(100 + Math.random() * 900); 

const STUDENT_USER = {
  email: `student.pes${RAND}@pesu.pes.edu`, // Valid email format
  password: 'Password123!',
  confirmPassword: 'Password123!',
  role: 'student',
  roleSpecificData: {
    // STRICT FORMAT: PES[Digit][Year][5-digits]
    prn: `PES2202300${RAND}`, 
    // STRICT FORMAT: PES[Digit]UG[Year]CS[3-digits]
    srn: `PES2UG23CS${RAND}`, 
    name: 'Test Student',
    branch: 'CSE',
    currentSemester: 5,
    section: 'A'
  }
};

const TEACHER_USER = {
  email: `teacher.pes${RAND}@pesu.pes.edu`,
  password: 'Password123!',
  confirmPassword: 'Password123!',
  role: 'teacher',
  roleSpecificData: {
    // STRICT FORMAT: TCH[3-digits]
    teacherId: `TCH${RAND}`, 
    name: 'Test Teacher',
    department: 'CSE'
  }
};

// ==========================================
// TEST RUNNER ENGINE
// ==========================================
let passed = 0;
let failed = 0;
let studentCookie = null; 
let teacherCookie = null; 

async function runTest(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    console.log(`\x1b[32mPASS\x1b[0m`);
    passed++;
  } catch (error) {
    console.log(`\x1b[31mFAIL\x1b[0m`);
    console.error(`   -> ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(endpoint, method = 'GET', body = null, cookie = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    
    // Handle non-JSON responses (like 404 html pages) gracefully
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { message: text }; // Fallback for raw text errors
    }
    
    const setCookie = res.headers.get('set-cookie');
    return { status: res.status, body: data, cookie: setCookie };
  } catch (err) {
    throw new Error(`Network Error: Is the server running on ${BASE_URL}? ${err.message}`);
  }
}

// ==========================================
// TEST SUITE (15 TESTS)
// ==========================================
async function runAllTests() {
  console.log(`\n🚀 Starting 15 Tests on ${BASE_URL}`);
  console.log(`📝 Using PRN: ${STUDENT_USER.roleSpecificData.prn} | TCH: ${TEACHER_USER.roleSpecificData.teacherId}\n`);

  // --- AUTHENTICATION TESTS ---

  await runTest('1. POST /auth/signup (Student) - Should create user', async () => {
    const res = await request('/auth/signup', 'POST', STUDENT_USER);
    assert(res.status === 201, `Expected 201 Created, got ${res.status}. Msg: ${JSON.stringify(res.body)}`);
  });

  await runTest('2. POST /auth/signup (Teacher) - Should create user', async () => {
    const res = await request('/auth/signup', 'POST', TEACHER_USER);
    assert(res.status === 201, `Expected 201 Created, got ${res.status}. Msg: ${JSON.stringify(res.body)}`);
  });

  await runTest('3. POST /auth/login (Fail) - Should reject empty body', async () => {
    const res = await request('/auth/login', 'POST', {});
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  await runTest('4. POST /auth/login (Fail) - Should reject wrong password', async () => {
    const res = await request('/auth/login', 'POST', { 
      email: STUDENT_USER.email, 
      password: 'WrongPassword' 
    });
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await runTest('5. POST /auth/login (Student) - Should return cookies', async () => {
    const res = await request('/auth/login', 'POST', { 
      email: STUDENT_USER.email, 
      password: STUDENT_USER.password 
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.cookie, 'No Set-Cookie header received!');
    studentCookie = res.cookie; 
  });

  await runTest('6. POST /auth/login (Teacher) - Should return cookies', async () => {
    const res = await request('/auth/login', 'POST', { 
      email: TEACHER_USER.email, 
      password: TEACHER_USER.password 
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    teacherCookie = res.cookie; 
  });

  // --- STUDENT ROUTE TESTS ---

  await runTest('7. GET /auth/profile (Protected) - Should return student profile', async () => {
    const res = await request('/auth/profile', 'GET', null, studentCookie);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body.data.user.email === STUDENT_USER.email, 'Email mismatch in profile');
  });

  await runTest('8. GET /students/attendance/dashboard - Should return dashboard', async () => {
    const res = await request('/students/attendance/dashboard', 'GET', null, studentCookie);
    // If this fails with 404, it means the Student Profile wasn't created in Step 1
    assert(res.status === 200, `Expected 200 OK, got ${res.status}. Msg: ${res.body.message}`);
    assert(res.body.data.student.prn === STUDENT_USER.roleSpecificData.prn, 'PRN mismatch');
  });

  await runTest('9. GET /students/attendance/dashboard (Fail) - No Token', async () => {
    const res = await request('/students/attendance/dashboard', 'GET', null, null); 
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  // --- TEACHER ROUTE TESTS ---

  await runTest('10. GET /teachers/classes - Should return assigned classes', async () => {
    const res = await request('/teachers/classes', 'GET', null, teacherCookie);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}. Msg: ${res.body.message}`);
    assert(Array.isArray(res.body.data.assignedClasses), 'assignedClasses should be an array');
  });

  await runTest('11. POST /teachers/attendance (Fail) - Invalid Data', async () => {
    const res = await request('/teachers/attendance', 'POST', { invalid: 'data' }, teacherCookie);
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  await runTest('12. GET /teachers/attendance - View Records', async () => {
    const res = await request('/teachers/attendance', 'GET', null, teacherCookie);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
  });

  await runTest('13. GET /teachers/class-students/fakeId (Fail) - Invalid ID format', async () => {
    const res = await request('/teachers/class-students/123', 'GET', null, teacherCookie);
    // Your backend might return 500 or 400 for CastError (invalid ObjectID)
    assert(res.status === 500 || res.status === 400, `Expected 400/500 for invalid ID, got ${res.status}`);
  });

  // --- ADMIN ROUTE TESTS (Using Student token) ---

  await runTest('14. GET /admin/users (Fail) - Student cannot access admin', async () => {
    const res = await request('/admin/users', 'GET', null, studentCookie);
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // --- LOGOUT TEST ---

  await runTest('15. POST /auth/logout - Should clear cookies', async () => {
    const res = await request('/auth/logout', 'POST', null, studentCookie);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
  });

  console.log('\n---------------------------------------------------');
  console.log(`Total: 15 | Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[31m${failed}\x1b[0m`);
  console.log('---------------------------------------------------');
  
  if (failed > 0) process.exit(1);
}

runAllTests();