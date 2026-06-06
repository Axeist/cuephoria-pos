import type { Plugin } from "vite";

export function buildMetaPlugin(buildId: string): Plugin {
  return {
    name: "cuephoria-build-meta",
    apply: "build",
    generateBundle() {
      const payload = {
        buildId,
        builtAt: new Date().toISOString(),
      };
      this.emitFile({
        type: "asset",
        fileName: "build-meta.json",
        source: JSON.stringify(payload),
      });
    },
  };
}
