import { resolve, relative } from "path";

const ALLOWED_DIRS = [
  resolve(process.cwd(), "workspace-outputs"),
];

export function isPathSafe(filePath: string): boolean {
  const resolved = resolve(filePath);
  return ALLOWED_DIRS.some((dir) => {
    const rel = relative(dir, resolved);
    return !rel.startsWith("..") && !rel.startsWith("/");
  });
}
