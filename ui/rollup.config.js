import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import postcss from 'rollup-plugin-postcss'
import progress from 'rollup-plugin-progress'
import autoprefixer from 'autoprefixer'
import livereload from 'rollup-plugin-livereload'

const production = !process.env.ROLLUP_WATCH

export default {
    input: 'src/main.js',
    output: {
        sourcemap: true,
        format: 'iife',
        name: 'app',
        file: '../ui_dist/bundle.js'
    },
    perf: false,
    plugins: [
        svelte({
            dev: !production, // enable run-time checks when not in production
        }),

        resolve(),
        commonjs(),
        postcss({
            plugins: [autoprefixer()], // not effective for svelte component
            minimize: true,
            sourcemap: !production,
            // extract: 'dist/bundle.css'
        }),
        production && progress(),
        production && terser({
            warnings: true,
            ecma: 8,
            keep_classnames: true,
            keep_fnames: true,
            compress: {
                drop_console: true,
                unsafe: true,
                passes: 3
            }
        }),
        !production && livereload('../ui_dist'),
    ]
}