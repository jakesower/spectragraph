export default {
  babel: {
    compileEnhancements: false,
  },
  files: ["./test/**/*.test.(j|t)s"],
  require: ["ts-node/register"],
  extensions: ["ts"],
  verbose: true,
};
