import { promises as fs } from "fs";
import path from "path";

export const MAX_SCAN_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

export const SAFE_EXTENSIONS = new Set([
  ".js", ".ts", ".tsx", ".jsx", ".json", ".env", ".example",
  ".md", ".yml", ".yaml", ".sh", ".txt",
]);

export const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "coverage", ".next", ".vercel", ".cache",
]);

export const SECRET_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "Stripe live key",     regex: /sk_live_[A-Za-z0-9]{10,}/                                     },
  { label: "Stripe test key",     regex: /sk_test_[A-Za-z0-9]{10,}/                                     },
  { label: "Demo/fake key",       regex: /sk_demo_[A-Za-z0-9_]{6,}/                                     },
  { label: "AWS Access Key",      regex: /AKIA[0-9A-Z]{16}/                                              },
  { label: "Private Key Block",   regex: /-----BEGIN[\s\w-]*PRIVATE KEY-----/i                           },
  { label: "Generic API Key",     regex: /(api[_\-]?key|API_KEY)\s*[:=]\s*["'][^"']{8,}["']/i           },
  { label: "Secret value",        regex: /\bSECRET\s*[:=]\s*["'][^"']{8,}["']/                          },
  { label: "Token value",         regex: /\bTOKEN\s*[:=]\s*["'][^"']{8,}["']/i                          },
  { label: "Password value",      regex: /\bpassword\s*=\s*["'][^"']{4,}["']/i                          },
  { label: "Private key value",   regex: /\bprivate[_\-]?key\s*[:=]\s*["'][^"']{8,}["']/i              },
];

const FAKE_IN_MATCH = /fake|demo|NOT_REAL|example|dummy|placeholder/i;
const DEMO_IN_PATH = /[/\\]demo[/\\]|[/\\]example[/\\]|\.example$/i;

export function buildSecretFindings(content: string, relPath: string): string[] {
  const findings: string[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const match = content.match(pattern.regex);
    if (!match) continue;

    const matchText = match[0];
    const isFakeDemo = FAKE_IN_MATCH.test(matchText) || DEMO_IN_PATH.test(relPath);

    if (isFakeDemo) {
      findings.push(
        `Potential secret-like value found in ${relPath}. It appears to be marked as fake/demo-only, but should still be reviewed before push.`,
      );
    } else {
      findings.push(`${pattern.label} pattern in ${relPath}`);
    }
    break; // one finding per file is enough
  }

  return findings;
}

async function collectSafeFiles(dir: string, rootDir: string): Promise<string[]> {
  const files: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await collectSafeFiles(fullPath, rootDir);
      files.push(...sub);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const base = entry.name;
      const isEnvFile = base === ".env" || base.startsWith(".env.");
      if (SAFE_EXTENSIONS.has(ext) || isEnvFile) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

export async function secretScanAllFiles(repoDir: string): Promise<{ output: string; exitCode: number }> {
  const allFiles = await collectSafeFiles(repoDir, repoDir);
  const findings: string[] = [];
  const skippedLargeFiles: string[] = [];

  for (const absolutePath of allFiles) {
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.size > MAX_SCAN_FILE_SIZE_BYTES) {
        skippedLargeFiles.push(path.relative(repoDir, absolutePath));
        continue;
      }
      const content = await fs.readFile(absolutePath, "utf8");
      const relPath = path.relative(repoDir, absolutePath);
      const fileFindings = buildSecretFindings(content, relPath);
      findings.push(...fileFindings);
    } catch {
      continue;
    }
  }

  const skipNote = skippedLargeFiles.length
    ? `\nSkipped ${skippedLargeFiles.length} large file(s) (>1MB): ${skippedLargeFiles.join(", ")}`
    : "";

  if (!findings.length) {
    return { output: `No obvious secrets found in scanned files.${skipNote}`.trim(), exitCode: 0 };
  }

  return {
    output: `Potential secret findings:\n${findings.map((f) => `- ${f}`).join("\n")}${skipNote}`.trim(),
    exitCode: 1,
  };
}
