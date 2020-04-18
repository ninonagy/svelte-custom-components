import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import pkg from "./package.json";

// TODO: add production flag, enable sourcemaps in production

export default [
    // {
        // input: "src/index.js",
        // output: [
        //     {
        //         file: pkg.module,
        //         sourcemap: false,
        //         format: "es"
        //     }
        // ],
        // plugins: [
        //     svelte({
        //         // If you have other plugins processing your CSS (e.g. rollup-plugin-scss),
        //         // and want your styles passed through to them to be bundled together
        //         // emitCss: false,

        //         // Extract CSS into a separate file.
        //         css: function(css) {
        //             // creates 'main.css' and 'main.css.map' — pass 'false'
        //             // as the second argument if you don't want the sourcemap
        //             css.write("public/main.css", false);
        //         }
        //     }),
        //     resolve(),
        //     // script module files need to be served on server
        //     serve({
        //         open: true, // launch in browser (default: false)
        //         verbose: true, // show server address in console (default: true)
        //         contentBase: "public", // folder to serve files from
        //         // Options used in setting up server
        //         host: "localhost",
        //         port: 5000
        //     }),
        //     livereload({
        //         watch: "public"
        //     })
        // ]
    // },
    // examples (build examples.js bundle)
    {
        input: "examples/index.js",
        output: [
            {
                file: "examples/examples-bundle.js",
                name: "components",
                sourcemap: false,
                format: "umd"
            }
        ],
        plugins: [svelte(), resolve()]
    }
];
