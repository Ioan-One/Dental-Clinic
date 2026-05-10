import { test, expect } from '@playwright/test';

test.describe('Dental Clinic App E2E', () => {

  test('Feature 1: Navigation and Core Rendering', async ({ page }) => {
    // Navigate to Landing Page
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check if Landing Page loaded (check for "dentalcare pro" text or similar)
    await expect(page.locator('h1')).toContainText(/Îngrijire Pacienți/i);
    
    // Navigate to Appointments
    await page.click('text=Fă o Programare'); 
    await page.waitForTimeout(1000);
    // Verify we are on MasterView
    await expect(page.locator('h1')).toContainText(/Managementul Programărilor/i);

    // Verify Cookie tracking
    const cookies = await page.context().cookies();
    const activityCookie = cookies.find(c => c.name === 'user_activity_log');
    expect(activityCookie).toBeDefined();
    
    const logs = JSON.parse(decodeURIComponent(activityCookie.value));
    expect(logs.length).toBeGreaterThan(0);
    // Should contain current page
    expect(logs[logs.length - 1].path).toBe('/appointments');
  });

  test('Feature 2: Creating an Appointment', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    
    // Open New Appointment Modal
    await page.click('button:has-text("Programare Nouă")');
    await page.waitForTimeout(1000);
    // Fill the form
    await page.locator('label:has-text("Nume Pacient") + input').fill('Playwright Test Patient');
    await page.locator('label:has-text("Număr de Contact") + input').fill('0712345678');
    await page.locator('label:has-text("Stare") + select').selectOption('confirmed');
    await page.locator('label:has-text("Dată") + input').fill('2027-01-01');
    await page.locator('label:has-text("Oră") + input').fill('10:00');
    await page.locator('label:has-text("Tip") + select').selectOption('Consultație');
    await page.locator('label:has-text("Medic") + input').fill('Dr. Test');
    
    // Submit
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Salvează Programarea")');
    
    // Wait for modal to close
    await expect(page.locator('text=Programare Nouă').nth(1)).not.toBeVisible();
    
    // The items are split 5 per page, and there are 7 initially.
    // Ensure we go to the last page to verify.
    const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
    if (await nextBtn.isVisible() && !(await nextBtn.isDisabled())) {
      await nextBtn.click();
    }

    // Assert the new appointment is in the table
    await expect(page.locator('td', { hasText: 'Playwright Test Patient' })).toBeVisible();
  });

  test('Feature 3: Deleting an Appointment', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    
    // Delete Sarah Johnson from page 1
    const patientRow = page.locator('tr').filter({ hasText: 'Sarah Johnson' }).first();
    
    // Handle the confirm dialog automatically
    page.on('dialog', dialog => dialog.accept());
    
    // Click delete on that row
    const deleteBtn = patientRow.locator('button[title="Șterge"]');
    await page.waitForTimeout(1000);
    await deleteBtn.click();
      
    // Assure it disappeared
    await expect(page.locator('td', { hasText: 'APT-001' })).not.toBeVisible();
  });

});
