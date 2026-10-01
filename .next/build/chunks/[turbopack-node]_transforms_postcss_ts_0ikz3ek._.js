module.exports = [
"[turbopack-node]/transforms/postcss.ts?config=[project]/package.json { CONFIG => \"[project]/package.json.postcss.json.[json].cjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/node_modules_20v-8wl._.js",
  "chunks/[root-of-the-server]__0a2336z._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts?config=[project]/package.json { CONFIG => \"[project]/package.json.postcss.json.[json].cjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];