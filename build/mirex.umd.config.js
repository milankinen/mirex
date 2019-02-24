import buble from "rollup-plugin-buble"
import babel from "rollup-plugin-babel"
import replace from "rollup-plugin-replace"

export default {
  input: "lib/index.js",
  output: {
    name: "mirex",
    format: "umd",
    file: "dist/mirex.js",
  },
  plugins: [
    replace({
      delimiters: ["", ""],
      values: {
        "(__DEVELOPER__)": "(false)",
      },
    }),
    buble(),
    babel({
      babelrc: false,
      presets: [],
      plugins: ["annotate-pure-calls"],
      exclude: "node_modules/**",
    }),
  ],
}
