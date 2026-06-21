const puppeteer = require('puppeteer');

(async () => {
  console.log('[E2E TEST] starting test suite...');
  const browser = await puppeteer.launch({
    headless: true, // Run headlessly
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set a standard viewport
  await page.setViewport({ width: 1280, height: 800 });

  const randomId = Math.floor(Math.random() * 100000);
  const username = `e2e_user_${randomId}`;
  const email = `e2e_${randomId}@cybershield.io`;
  const password = `Password123!`;

  try {
    // 1. Navigate to Register page
    console.log('[E2E TEST] navigating to register page...');
    await page.goto('http://localhost:8080/register', { waitUntil: 'networkidle2' });

    // 2. Fill Register form
    console.log(`[E2E TEST] filling registration fields for: ${username}...`);
    await page.waitForSelector('#username');
    await page.type('#username', username);
    await page.type('#reg-email', email);
    await page.type('#password', password);
    await page.type('#confirm', password);

    // 3. Click CREAR CUENTA
    console.log('[E2E TEST] submitting registration form...');
    await page.click('button[type="submit"]');

    // 4. Wait for success screen
    console.log('[E2E TEST] waiting for registration success...');
    await page.waitForFunction(
      () => document.body.innerText.includes('Cuenta creada') || 
            document.body.innerText.includes('verificarla'),
      { timeout: 10000 }
    );

    // 5. Activate user using dev-verify API endpoint
    console.log(`[E2E TEST] activating user: ${username} via dev-verify endpoint...`);
    const verifyPage = await browser.newPage();
    await verifyPage.goto(`http://localhost:3001/api/auth/dev-verify/${username}`, { waitUntil: 'networkidle2' });
    const content = await verifyPage.evaluate(() => document.body.innerText);
    console.log(`[E2E TEST] verification response: ${content}`);
    await verifyPage.close();

    // 6. Navigate to Login page
    console.log('[E2E TEST] navigating to login page...');
    await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });

    // 7. Fill Login form
    console.log('[E2E TEST] logging in...');
    await page.waitForSelector('#identifier');
    await page.type('#identifier', username);
    await page.type('#password', password);

    // 8. Click Submit
    console.log('[E2E TEST] submitting login form...');
    await page.click('button[type="submit"]');

    // 9. Wait for Dashboard to load (redirected to /dashboard)
    console.log('[E2E TEST] waiting for dashboard redirection...');
    await page.waitForFunction(
      () => window.location.pathname === '/dashboard',
      { timeout: 10000 }
    );
    console.log('[E2E TEST] dashboard loaded successfully.');

    // 10. Verify some elements on Dashboard are present
    console.log('[E2E TEST] verifying dashboard stats widgets...');
    await page.waitForFunction(
      () => document.body.innerText.includes('SISTEMA OPERATIVO') || 
            document.body.innerText.includes('ONLINE') ||
            document.body.innerText.includes('Escaneos'),
      { timeout: 10000 }
    );
    console.log('[E2E TEST] dashboard metrics verified.');

    // 11. Click "Darse de baja" trigger button
    console.log('[E2E TEST] opening delete account confirmation panel...');
    await page.waitForSelector('#btn-delete-account-trigger');
    await page.click('#btn-delete-account-trigger');

    // 12. Click "SÍ, ELIMINAR" button to complete E2E lifecycle (cleanup)
    console.log('[E2E TEST] confirming account deletion...');
    await page.waitForSelector('#btn-delete-account-confirm');
    await page.click('#btn-delete-account-confirm');

    // 13. Wait for redirect back to Login
    console.log('[E2E TEST] waiting for redirection back to login...');
    await page.waitForFunction(
      () => window.location.pathname === '/login',
      { timeout: 10000 }
    );

    console.log('==============================================');
    console.log('✅ [SUCCESS] ALL E2E LIFECYCLE TESTS PASSED!');
    console.log('==============================================');
    
    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ [FAILURE] E2E test failed:', error.message);
    
    // Take screenshot on failure for debugging purposes
    try {
      await page.screenshot({ path: 'e2e-failure-screenshot.png' });
      console.log('Screenshot of failure saved to: e2e-failure-screenshot.png');
    } catch (screenshotErr) {
      console.error('Failed to capture failure screenshot:', screenshotErr.message);
    }
    
    await browser.close();
    process.exit(1);
  }
})();
