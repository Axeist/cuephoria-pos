import type { Plugin } from "vite";
import { writeFileSync } from "fs";
import { join } from "path";

export function buildMetaPlugin(buildId: string): Plugin {
  return {
    name: "cuephoria-build-meta",
    apply: "build",
    closeBundle() {
      const outDir = join(process.cwd(), "dist");
      const payload = {
        buildId,
        builtAt: new Date().toISOString(),
      };
      writeFileSync(
        join(outDir, "build-meta.json"),
        JSON.stringify(payload, null, 0),
        "utf8",
      );
    },
  };
}
