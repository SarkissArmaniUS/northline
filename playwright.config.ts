import { defineConfig, devices } from "@playwright/test";
import { AUTH_SECRET, HAS_STRIPE, WEBHOOK_SECRET } from "./e2e/helpers";
try {
    process.loadEnvFile(".env.test");
} catch {
    // CI
}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: "./e2e",
    globalSetup: "./e2e/global-setup.ts",
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
    use: { baseURL, trace: "retain-on-failure" },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: process.env.CI
            ? `npm run build && npm run start -- --port ${PORT}`
            : `npm run dev -- --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
            MONGODB_URI: process.env.MONGODB_URI_TEST ?? "",
            BETTER_AUTH_SECRET: AUTH_SECRET,
            // STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_dummy",
            STRIPE_SECRET_KEY: HAS_STRIPE ? process.env.STRIPE_SECRET_KEY! : "sk_test_dummy",
            STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
            NEXT_PUBLIC_APP_URL: baseURL,
        },
    },
});