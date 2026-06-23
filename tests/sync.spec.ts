import { test, expect } from '@playwright/test';
import type { Page, FrameLocator } from '@playwright/test';

/**
 * E2E tests for bidirectional rich text sync across iframes.
 *
 * Architecture under test:
 *   Frame A  →  postMessage  →  Host  →  relay  →  Frame B
 *   Frame B  →  postMessage  →  Host  →  relay  →  Frame A
 */

/** Helper: returns FrameLocators for both editor iframes. */
function getFrames(page: Page): { frameA: FrameLocator; frameB: FrameLocator } {
  const iframes = page.locator('iframe');
  return {
    frameA: iframes.nth(0).contentFrame(),
    frameB: iframes.nth(1).contentFrame(),
  };
}

/** Helper: waits for both iframes to report "Ready" status. */
async function waitForBothFramesReady(page: Page): Promise<void> {
  const iframes = page.locator('iframe');
  await expect(iframes).toHaveCount(2);

  const { frameA, frameB } = getFrames(page);
  await expect(frameA.locator('text=Ready')).toBeVisible();
  await expect(frameB.locator('text=Ready')).toBeVisible();
}

test.describe('Bidirectional Rich Text Sync', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so tests start from a clean state.
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForBothFramesReady(page);
  });

  test('both frames load and display default content', async ({ page }) => {
    const { frameA, frameB } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');
    const editorB = frameB.locator('[contenteditable]');

    await expect(editorA).toBeVisible();
    await expect(editorB).toBeVisible();

    // Each frame shows its own default content.
    await expect(editorA).toContainText('Quick brown fox jumps');
    await expect(editorA).toContainText('over the lazy dog');
    await expect(editorB).toContainText('Frame B mirrors changes');
    await expect(editorB).toContainText('Try toggling Bold, Italic, or Strike');
  });

  test('typing in Frame A syncs to Frame B', async ({ page }) => {
    const { frameA, frameB } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');
    const editorB = frameB.locator('[contenteditable]');

    // Clear and type new content in Frame A.
    await editorA.click();
    await editorA.press('Control+a');
    await editorA.pressSequentially('Hello from Frame A', { delay: 30 });

    // Wait for debounced content sync (120ms) + relay.
    await expect(editorB).toContainText('Hello from Frame A', { timeout: 5000 });
  });

  test('typing in Frame B syncs to Frame A', async ({ page }) => {
    const { frameA, frameB } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');
    const editorB = frameB.locator('[contenteditable]');

    await editorB.click();
    await editorB.press('Control+a');
    await editorB.pressSequentially('Hello from Frame B', { delay: 30 });

    await expect(editorA).toContainText('Hello from Frame B', { timeout: 5000 });
  });

  test('bold toolbar button in Frame A syncs to Frame B', async ({ page }) => {
    const { frameA, frameB } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');
    const editorB = frameB.locator('[contenteditable]');

    // Select all text in Frame A.
    await editorA.click();
    await editorA.press('Control+a');

    // Click the Bold toolbar button.
    const boldBtn = frameA.locator('button', { hasText: 'Bold' });
    await boldBtn.click();

    // Frame B should now contain <strong> tags.
    await expect(editorB.locator('strong, b')).toBeVisible({ timeout: 5000 });
  });

  test('italic toolbar button in Frame A syncs to Frame B', async ({ page }) => {
    const { frameA, frameB } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');
    const editorB = frameB.locator('[contenteditable]');

    await editorA.click();
    await editorA.press('Control+a');

    const italicBtn = frameA.locator('button', { hasText: 'Italic' });
    await italicBtn.click();

    await expect(editorB.locator('em, i')).toBeVisible({ timeout: 5000 });
  });

  test('Ctrl+B keyboard shortcut in Frame A syncs bold to Frame B', async ({ page }) => {
    const { frameA, frameB } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');
    const editorB = frameB.locator('[contenteditable]');

    // Select all text and press Ctrl+B.
    await editorA.click();
    await editorA.press('Control+a');
    await editorA.press('Control+b');

    // Frame B should receive the bold formatting.
    await expect(editorB.locator('strong, b')).toBeVisible({ timeout: 5000 });
  });

  test('event log records relay entries', async ({ page }) => {
    const { frameA } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');

    // Trigger a format action to generate a relay event.
    await editorA.click();
    await editorA.press('Control+a');

    const boldBtn = frameA.locator('button', { hasText: 'Bold' });
    await boldBtn.click();

    // The host event log should contain at least one "relay" entry.
    const relayEntry = page.locator('text=RELAY').first();
    await expect(relayEntry).toBeVisible({ timeout: 5000 });
  });

  test('localStorage persists editor content across page reload', async ({ page }) => {
    const { frameA } = getFrames(page);

    const editorA = frameA.locator('[contenteditable]');

    // Type unique content.
    await editorA.click();
    await editorA.press('Control+a');
    await editorA.pressSequentially('Persisted content test', { delay: 30 });

    // Wait for the debounced save.
    await page.waitForTimeout(500);

    // Reload the page.
    await page.reload();
    await waitForBothFramesReady(page);

    // The content should be restored from localStorage.
    const { frameA: frameAAfter } = getFrames(page);
    const editorAAfter = frameAAfter.locator('[contenteditable]');
    await expect(editorAAfter).toContainText('Persisted content test', { timeout: 5000 });
  });
});
