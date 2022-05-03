const presets = process.env.NODE_ENV === "test"
  ? [["@babel/preset-env", { targets: { node: "current" } }]]
  : ["@babel/preset-env"];

module.exports = {
  presets,
  plugins: [
    [
      "@babel/plugin-transform-runtime",
      {
        regenerator: true,
      },
    ],
  ],
};
