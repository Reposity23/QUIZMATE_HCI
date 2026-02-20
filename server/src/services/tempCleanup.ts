import fs from "fs/promises";

export async function cleanupLocalFiles(paths: string[]): Promise<void> {
  await Promise.all(paths.map(async (p) => {
    try {
      await fs.unlink(p);
    } catch {
      // best effort
    }
  }));
}
