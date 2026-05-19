// AgentHub build (architecture §5.3 / §6 / §18.3).
//
// Emits exactly the layout the AgentHub Build Pipeline expects:
//   dist/agent/index.js   — ESM bundle of the Agent Function entry (§8.1).
//                            `@agenthub/sdk` is type-only, erased at build.
//   dist/surface/          — static Surface bundle (§8.2, §12.3) with an
//                            index.html. `@agenthub/surface-sdk` is aliased
//                            to the runtime shim that speaks §12.2 postMessage.
import * as esbuild from "esbuild";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sdkShim = fileURLToPath(new URL("./src/surface/_sdk.tsx", import.meta.url));

await rm("dist", { recursive: true, force: true });
await mkdir("dist/agent", { recursive: true });
await mkdir("dist/surface", { recursive: true });

// ── Agent Function (server, ESM, dynamic-imported by the Runtime Host) ──
await esbuild.build({
  entryPoints: ["src/agent/index.ts"],
  outfile: "dist/agent/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Type-only import; safe to keep external in case any code path references it.
  external: ["@agenthub/sdk"],
  logLevel: "info",
});

// ── Surface (browser, sandboxed iframe) ──
await esbuild.build({
  entryPoints: ["src/surface/main.tsx"],
  outfile: "dist/surface/app.js",
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  minify: true,
  loader: { ".css": "css", ".svg": "dataurl" },
  alias: { "@agenthub/surface-sdk": sdkShim },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});

await writeFile(
  "dist/surface/index.html",
  `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>데이터 대시보드</title>
<link rel="stylesheet" href="app.css" />
</head>
<body>
<div id="root"></div>
<script src="app.js"></script>
</body>
</html>
`,
);

console.log("AgentHub build complete → dist/agent/index.js + dist/surface/");
