import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { buildSecretFindings, secretScanAllFiles } from "./secretScan";

describe("buildSecretFindings", () => {
  it("detects sk_demo fake secret and marks it as fake/demo-only", () => {
    const content = `const apiKey = "sk_demo_FAKE_NOT_REAL_123456789";`;
    const findings = buildSecretFindings(content, "src/config.js");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("src/config.js");
    expect(findings[0]).toContain("fake/demo-only");
    expect(findings[0]).toContain("reviewed before push");
  });

  it("detects sk_live_ as a real secret (not fake)", () => {
    const content = `const stripe = "sk_live_AbCdEfGhIj1234567890";`;
    const findings = buildSecretFindings(content, "src/payments.js");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("Stripe live key");
    expect(findings[0]).not.toContain("fake/demo-only");
  });

  it("detects sk_test_ key", () => {
    const content = `const key = "sk_test_AbCdEfGhIj1234567890";`;
    const findings = buildSecretFindings(content, "src/test.js");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("Stripe test key");
  });

  it("detects AWS access key example value as fake/demo (EXAMPLE in key)", () => {
    const content = `AWS_KEY=AKIAIOSFODNN7EXAMPLE123`;
    const findings = buildSecretFindings(content, "config.env");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("fake/demo-only");
  });

  it("detects real-looking AWS access key as actual finding", () => {
    const content = `AWS_KEY=AKIAIOSFODNN7REALKEY12`;
    const findings = buildSecretFindings(content, "config.env");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("AWS Access Key");
  });

  it("detects generic API key assignment", () => {
    const content = `api_key = "abcdef1234567890abcd"`;
    const findings = buildSecretFindings(content, "src/api.js");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("Generic API Key");
  });

  it("returns empty array when no secrets found", () => {
    const content = `const greeting = "Hello, world!";`;
    const findings = buildSecretFindings(content, "src/hello.js");
    expect(findings).toHaveLength(0);
  });

  it("returns at most one finding per file (breaks after first match)", () => {
    const content = `
      const a = "sk_live_AbCdEfGhIj1234567890";
      const b = "sk_test_AbCdEfGhIj1234567890";
    `;
    const findings = buildSecretFindings(content, "src/multi.js");
    expect(findings).toHaveLength(1);
  });
});

describe("secretScanAllFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voiceops-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("detects fake secret in src/config.js even when file is not a changed/staged file", async () => {
    const srcDir = path.join(tmpDir, "src");
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, "config.js"),
      `const apiKey = "sk_demo_FAKE_NOT_REAL_123456789"; // demo only`,
    );
    // No git repo — the file is not staged or changed
    const result = await secretScanAllFiles(tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("src/config.js");
    expect(result.output).toContain("fake/demo-only");
  });

  it("returns clean result when no secrets are present", async () => {
    await fs.writeFile(path.join(tmpDir, "README.md"), "# Hello World\nThis is a demo project.");
    const result = await secretScanAllFiles(tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("No obvious secrets");
  });

  it("skips node_modules directory", async () => {
    const nmDir = path.join(tmpDir, "node_modules", "some-pkg");
    await fs.mkdir(nmDir, { recursive: true });
    await fs.writeFile(
      path.join(nmDir, "index.js"),
      `const key = "sk_live_AbCdEfGhIj1234567890";`,
    );
    const result = await secretScanAllFiles(tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.output).not.toContain("node_modules");
  });

  it("skips .git directory", async () => {
    const gitDir = path.join(tmpDir, ".git");
    await fs.mkdir(gitDir, { recursive: true });
    await fs.writeFile(
      path.join(gitDir, "config"),
      `const key = "sk_live_AbCdEfGhIj1234567890";`,
    );
    const result = await secretScanAllFiles(tmpDir);
    expect(result.exitCode).toBe(0);
  });

  it("only scans safe file extensions (ignores unknown binary extensions)", async () => {
    // .wasm file should not be scanned
    await fs.writeFile(
      path.join(tmpDir, "binary.wasm"),
      `sk_live_AbCdEfGhIj1234567890`,
    );
    const result = await secretScanAllFiles(tmpDir);
    expect(result.exitCode).toBe(0);
  });
});
