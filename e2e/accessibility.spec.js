import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const THEMES = ['light', 'beige', 'dark']
// Four-run pairwise matrix for the three binary Appearance settings. Within
// every theme, each pair covers all 00/01/10/11 combinations:
//
//   charts  density      motion
//   on      comfortable  standard
//   on      compact      reduced
//   off     comfortable  reduced
//   off     compact      standard
const BINARY_APPEARANCES = [
  { viz: 'on', density: 'comfortable', reduceMotion: false },
  { viz: 'on', density: 'compact', reduceMotion: true },
  { viz: 'off', density: 'comfortable', reduceMotion: true },
  { viz: 'off', density: 'compact', reduceMotion: false },
]
const APP_APPEARANCES = THEMES.flatMap((theme) =>
  BINARY_APPEARANCES.map((appearance) => ({ theme, ...appearance })),
)
const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
]

const seedAppearance = async (page, appearance, { entered = false } = {}) => {
  const selected = typeof appearance === 'string'
    ? { theme: appearance, viz: 'on', density: 'comfortable', reduceMotion: false }
    : appearance

  await page.addInitScript(({ selectedAppearance, enterApp }) => {
    localStorage.setItem('gt2:theme:v1', selectedAppearance.theme)
    if (enterApp) {
      sessionStorage.setItem('gt2:entered:v1', 'true')
      localStorage.setItem('gt2:onboarded:v1', 'true')
    }
    localStorage.setItem('gt2:viz:v1', selectedAppearance.viz)
    localStorage.setItem('gt2:density:v1', selectedAppearance.density)
    localStorage.setItem('gt2:reducemotion:v1', selectedAppearance.reduceMotion ? 'on' : 'off')
  }, { selectedAppearance: selected, enterApp: entered })
}

const appearanceName = ({ theme, viz, density, reduceMotion }) =>
  `${theme} theme, charts ${viz}, ${density} density, motion ${reduceMotion ? 'reduced' : 'standard'}`

const expectAppearanceApplied = async (page, appearance) => {
  const applied = await page.locator('html').evaluate((root) => ({
    theme: root.getAttribute('data-theme') || 'light',
    viz: root.classList.contains('viz-color') ? 'on' : 'off',
    density: root.getAttribute('data-density') || 'comfortable',
    reduceMotion: root.classList.contains('reduce-motion'),
  }))
  expect(applied).toEqual(appearance)
}

const formatViolations = (violations) => violations.map((violation) => {
  const nodes = violation.nodes.map((node) => [
    `    target: ${node.target.join(' ')}`,
    `    failure: ${node.failureSummary || 'No failure summary provided'}`,
  ].join('\n')).join('\n')

  return [
    `[${violation.impact || 'unknown'}] ${violation.id}: ${violation.help}`,
    `  ${violation.description}`,
    `  ${violation.helpUrl}`,
    nodes,
  ].join('\n')
}).join('\n\n')

const expectNoWcagViolations = async (page, surface, theme) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze()

  expect(
    violations,
    `${surface} (${theme}) has ${violations.length} WCAG A/AA violation(s):\n${formatViolations(violations)}`,
  ).toHaveLength(0)
}

for (const theme of THEMES) {
  test(`marketing landing is WCAG A/AA clean in ${theme} theme`, async ({ page }) => {
    await seedAppearance(page, theme)
    await page.goto('/')

    await expect(page.locator('.landing-headline')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Launch demo' })).toBeVisible()
    await expectAppearanceApplied(page, {
      theme,
      viz: 'on',
      density: 'comfortable',
      reduceMotion: false,
    })

    await expectNoWcagViolations(page, 'Marketing landing', theme)
  })
}

for (const appearance of APP_APPEARANCES) {
  test(`desktop application shell is WCAG A/AA clean in ${appearanceName(appearance)}`, async ({ page }) => {
    await seedAppearance(page, appearance, { entered: true })
    await page.goto('/')

    await expect(page.locator('.sidebar-brand .word')).toHaveText('Grant Tracker')
    await expect(page.locator('#main-content h1')).toBeVisible()
    await expectAppearanceApplied(page, appearance)

    await expectNoWcagViolations(page, 'Desktop application shell', appearanceName(appearance))
  })
}

test.describe('automatic phone shell at 390x844', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  })

  for (const appearance of APP_APPEARANCES) {
    test(`is WCAG A/AA clean in ${appearanceName(appearance)}`, async ({ page }) => {
      await seedAppearance(page, appearance, { entered: true })
      await page.goto('/')

      await expect(page.getByRole('navigation', { name: 'Primary (mobile)' })).toBeVisible()
      await expect(page.locator('#main-content h1')).toBeVisible()
      await expectAppearanceApplied(page, appearance)

      await expectNoWcagViolations(page, 'Automatic phone shell at 390x844', appearanceName(appearance))
    })
  }
})
