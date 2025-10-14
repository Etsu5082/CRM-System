// Test the path logic
const testCases = [
  '/api/customers',
  '/api/tasks',
  '/api/meetings',
  '/api/approvals',
  '/api/reports/sales-summary',
  '/api/auth/register',
  '/api/auth/login'
];

console.log('Testing path transformation logic:\n');

testCases.forEach(reqPath => {
  let path = reqPath;
  if (path.startsWith('/api')) {
    path = path.substring(4);
  }
  console.log(`${reqPath} -> ${path}`);
});
