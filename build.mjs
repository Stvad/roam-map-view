import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/index.tsx"],
  outfile: "extension.js",
  bundle: true,
  format: "esm",
  target: "es2020",
  sourcemap: true,
  logLevel: "info",
});

if (watch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
