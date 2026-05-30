import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function detectRepoRoot(cwd?: string): Promise<string | null> {
  const dir = cwd ?? process.env.VOICEOPS_TARGET_DIR ?? process.cwd();
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd: dir,
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export function isPathInsideRepo(childPath: string, repoRoot: string): boolean {
  const resolved = path.resolve(childPath);
  const resolvedRoot = path.resolve(repoRoot);
  const relative = path.relative(resolvedRoot, resolved);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}
