import { test, expect } from '@playwright/test';

test.describe('Dental Clinic App E2E', () => {
  const testUser = {
    firstName: 'E2E',
    lastName: 'Tester',
    email: `e2e_${Date.now()}@clinic.com`,
    password: 'Password123!',
    role: 'doctor' // register as doctor to have access to everything
  };

  test('Feature: Register and Login Flow', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.waitForTimeout(1000);
    
    await page.locator('label:has-text("Prenume") + input').fill(testUser.firstName);
    await page.locator('label:has-text("Nume de familie") + input').fill(testUser.lastName);
    await page.locator('label:has-text("Email") + input').fill(testUser.email);
    await page.locator('label:has-text("Parolă") + input').fill(testUser.password);
    
    await page.click('button:has-text("Creează cont")');
    await page.waitForTimeout(2000);
    
    // Should be redirected to appointments
    await expect(page).toHaveURL(/\/appointments/);
    await expect(page.locator('h1')).toContainText(/Managementul Programărilor/i);

    // 2. Logout
    await page.click('button:has-text("Ieșire")'); // Assuming navbar has a Logout button
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);

    // 3. Login
    await page.locator('label:has-text("Email") + input').fill(testUser.email);
    await page.locator('label:has-text("Parolă") + input').fill(testUser.password);
    await page.click('button:has-text("Autentificare")');
    await page.waitForTimeout(2000);

    // Should be redirected to appointments again
    await expect(page).toHaveURL(/\/appointments/);
  });

  test.describe('Protected Features', () => {
    test.beforeEach(async ({ page }) => {
      // Fast login via API and setting localStorage directly
      const response = await page.request.post('/api/auth/register', {
        data: {
          firstName: 'Setup', lastName: 'User',
          email: `setup_${Date.now()}@clinic.com`,
          password: 'Password123!', role: 'admin'
        }
      });
      const data = await response.json();
      
      await page.goto('/');
      await page.evaluate((userData) => {
        window.localStorage.setItem('dental_auth_user', JSON.stringify(userData));
      }, data);
    });

    test('Feature 1: Navigation and Core Rendering', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('h1')).toContainText(/Îngrijire Pacienți/i);
      
      await page.click('text=Fă o Programare'); 
      await page.waitForTimeout(1000);
      
      await expect(page.locator('h1')).toContainText(/Managementul Programărilor/i);
  
      const cookies = await page.context().cookies();
      const activityCookie = cookies.find(c => c.name === 'user_activity_log');
      expect(activityCookie).toBeDefined();
      
      const logs = JSON.parse(decodeURIComponent(activityCookie.value));
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].path).toBe('/appointments');
    });
  
    test('Feature 2: Creating an Appointment', async ({ page }) => {
      await page.goto('/appointments');
      await page.waitForTimeout(1000);
      
      await page.click('button:has-text("Programare Nouă")');
      await page.waitForTimeout(1000);
      
      await page.locator('label:has-text("Nume Pacient") + input').fill('Playwright Test Patient');
      await page.locator('label:has-text("Număr de Contact") + input').fill('0712345678');
      await page.locator('label:has-text("Stare") + select').selectOption('confirmed');
      await page.locator('label:has-text("Dată") + input').fill('2027-01-01');
      await page.locator('label:has-text("Oră") + input').fill('10:00');
      await page.locator('label:has-text("Tip") + select').selectOption('Consultație');
      await page.locator('label:has-text("Medic") + input').fill('Dr. Test');
      
      await page.click('button:has-text("Salvează Programarea")');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Programare Nouă').nth(1)).not.toBeVisible();
      
      const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
      if (await nextBtn.isVisible() && !(await nextBtn.isDisabled())) {
        await nextBtn.click();
      }
  
      await expect(page.locator('td', { hasText: 'Playwright Test Patient' })).toBeVisible();
    });
  
    test('Feature 3: Deleting an Appointment', async ({ page }) => {
      await page.goto('/appointments');
      await page.waitForTimeout(1000);
      
      // Since it's a new DB each run or shared DB, we find any row that has a delete button
      const patientRow = page.locator('tr').filter({ has: page.locator('button[title="Șterge"]') }).first();
      
      if (await patientRow.isVisible()) {
        const rowText = await patientRow.locator('td').first().innerText();
        
        page.on('dialog', dialog => dialog.accept());
        
        const deleteBtn = patientRow.locator('button[title="Șterge"]');
        await page.waitForTimeout(1000);
        await deleteBtn.click();
          
        await expect(page.locator('td', { hasText: rowText })).not.toBeVisible();
      }
    });
  });
});
