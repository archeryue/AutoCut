import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run one test at a time
  reporter: 'list',
  timeout: 240000, // 4 minutes per test (video export takes time)

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Use system-installed Google Chrome
        // Enable hardware acceleration and WebCodecs support
        launchOptions: {
          headless: false, // Run in headed mode to test with real GPU
          args: [
            '--enable-features=VaapiVideoDecoder,VaapiVideoEncoder',
            '--enable-accelerated-video-decode',
            '--enable-accelerated-video-encode',
            '--disable-web-security', // Sometimes needed for WebCodecs
            '--use-fake-ui-for-media-stream', // For media permissions
          ],
        },
      },
    },
  ],

  // Don't start dev server automatically (we're managing it separately)
  webServer: undefined,
});
