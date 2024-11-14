const esbuild = require("esbuild");

const shared = {
	entryPoints: ["lib/index.ts"],
	bundle: true,
};

Promise.all([
	// ESM build
	esbuild.build({
		...shared,
		format: "esm",
		treeShaking: true,
		outfile: "dist/index.mjs",
		platform: "neutral",
	}),
	// CJS build
	esbuild.build({
		...shared,
		format: "cjs",
		treeShaking: true,
		outfile: "dist/index.cjs",
		platform: "node",
	}),
]).catch(() => process.exit(1));
