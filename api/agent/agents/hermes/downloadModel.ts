import { chmod, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { downloadModel } from 'cactus-needle';
import { config } from './config.ts';

/** Fetches the pinned Needle 3 weights (SHA-256 verified) to NEEDLE_MODEL_PATH; run while building the image. */
const cacheDir = await mkdtemp(join(tmpdir(), 'needle-'));
try {
  const downloaded = await downloadModel({ model: 'needle3', cacheDir });
  await mkdir(dirname(config.needleModelPath), { recursive: true });
  await rename(downloaded, config.needleModelPath);
  // Built as root; Hermes runs the MCP server as its own user
  await chmod(config.needleModelPath, 0o644);
  console.log(`Needle 3 weights saved to ${config.needleModelPath}`);
} finally {
  await rm(cacheDir, { recursive: true, force: true });
}
