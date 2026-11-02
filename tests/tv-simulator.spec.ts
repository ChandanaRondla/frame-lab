import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'TV Simulator' }).click()
})

test('movie cards open the correct details', async ({ page }) => {
  await page.getByRole('button', {
    name: 'View details for Inception'
  }).click()

  await expect(page.locator('.movie-details h2')).toHaveText('Inception')

  await page.getByRole('button', {
    name: 'Close details'
  }).click()

  await expect(page.locator('.movie-details')).toHaveCount(0)
})

test('arrow keys change the focused movie', async ({ page }) => {
  await page.locator('body').click({ position: { x: 250, y: 250 } })

  await page.keyboard.press('ArrowRight')

  await expect(page.locator('.sim-footer')).toContainText('Inception')
})

test('switching variants changes the layout', async ({ page }) => {
  await page.getByRole('button', { name: 'Variant B' }).click()

  await expect(page.locator('.tv-screen')).toHaveClass(/editorial/)

  await page.getByRole('button', { name: 'Variant A' }).click()

  await expect(page.locator('.tv-screen')).not.toHaveClass(/editorial/)
})

test('Escape closes movie details', async ({ page }) => {
  await page.getByRole('button', {
    name: 'View details for Dune', exact: true
  }).click()

  await page.keyboard.press('Escape')

  await expect(page.locator('.movie-details')).toHaveCount(0)
})

test('movie artwork loads successfully', async ({ page }) => {
  const posters = page.locator('.poster-art img')

  await expect(posters).toHaveCount(30)

  for (const poster of await posters.all()) {
    await expect(poster).toHaveJSProperty('complete', true)
    expect(
      await poster.evaluate((img: HTMLImageElement) => img.naturalWidth)
    ).toBeGreaterThan(0)
  }
})
