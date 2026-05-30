import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { resolveAuditCommand, isAuditUnavailableError } from "./audit";

describe("resolveAuditCommand", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voiceops-audit-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns npm run audit:mock when package.json has audit:mock script", async () => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ scripts: { "audit:mock": "echo DEMO-CVE-2024-00001" } }),
    );
    const result = await resolveAuditCommand(tmpDir);
    expect(result.file).toBe("npm");
    expect(result.args).toEqual(["run", "audit:mock"]);
  });

  it("falls back to npm audit --audit-level=high when no audit:mock script", async () => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ scripts: { test: "vitest" } }),
    );
    const result = await resolveAuditCommand(tmpDir);
    expect(result.file).toBe("npm");
    expect(result.args).toEqual(["audit", "--audit-level=high"]);
  });

  it("falls back to npm audit --audit-level=high when package.json is missing", async () => {
    const result = await resolveAuditCommand(tmpDir);
    expect(result.file).toBe("npm");
    expect(result.args).toEqual(["audit", "--audit-level=high"]);
  });

  it("falls back to npm audit --audit-level=high when package.json has no scripts field", async () => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "my-app" }),
    );
    const result = await resolveAuditCommand(tmpDir);
    expect(result.file).toBe("npm");
    expect(result.args).toEqual(["audit", "--audit-level=high"]);
  });

  it("falls back to npm audit --audit-level=high when package.json is invalid JSON", async () => {
    await fs.writeFile(path.join(tmpDir, "package.json"), "{ invalid json }");
    const result = await resolveAuditCommand(tmpDir);
    expect(result.file).toBe("npm");
    expect(result.args).toEqual(["audit", "--audit-level=high"]);
  });
});

describe("isAuditUnavailableError", () => {
  it("returns true for ENOLOCK error", () => {
    expect(isAuditUnavailableError("npm ERR! code ENOLOCK", "")).toBe(true);
  });

  it("returns true for missing lockfile message", () => {
    expect(isAuditUnavailableError("", "requires an existing lockfile")).toBe(true);
  });

  it("returns false for normal audit output with vulnerabilities", () => {
    expect(isAuditUnavailableError("", "found 2 high severity vulnerabilities")).toBe(false);
  });
});
