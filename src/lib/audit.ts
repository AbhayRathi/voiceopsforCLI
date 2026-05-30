import { promises as fs } from "fs";
import path from "path";

export type AuditCommandResult = { file: string; args: string[] };

export async function resolveAuditCommand(repoDir: string): Promise<AuditCommandResult> {
  try {
    const pkgPath = path.join(repoDir, "package.json");
    const content = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
    if (pkg?.scripts?.["audit:mock"]) {
      return { file: "npm", args: ["run", "audit:mock"] };
    }
  } catch {
    // package.json missing or invalid — fall back to npm audit
  }
  return { file: "npm", args: ["audit", "--audit-level=high"] };
}

export function isAuditUnavailableError(stderr: string, stdout: string): boolean {
  const combined = `${stdout}\n${stderr}`;
  return /ENOLOCK|requires an existing lockfile|unsupported/i.test(combined);
}
