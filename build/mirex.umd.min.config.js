import buble from "rollup-plugin-buble"
import babel from "rollup-plugin-babel"
import replace from "rollup-plugin-replace"
import { uglify } from "rollup-plugin-uglify"

export default {
  input: "lib/index.js",
  output: {
    name: "mirex",
    format: "umd",
    file: "dist/mirex.min.js",
  },
  plugins: [
    replace({
      delimiters: ["", ""],
      values: {
        "process.env.NODE_ENV": JSON.stringify("production"),
        "(__DEVBUILD__)": "(false)",
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
    uglify({
      compress: true,
      mangle: true,
    }),
  ],
}
