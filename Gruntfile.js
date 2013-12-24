module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                "Gruntfile.js",
                "test/unit/*.js"
            ],
            options: {
                jshintrc: ".jshintrc"
            }
        },
        jasmine_node: {
            specNameMatcher: grunt.option("test") === "integration" ? "int" : "spec",
            projectRoot: ".",
            requirejs: false,
            forceExit: true,
            jUnit: {
                report: false,
                useDotNotation: true,
                consolidate: true
            },
            verbose: true
        },
        requirejs: {
            compile: {
                // Available options can be found here
                // https://github.com/jrburke/r.js/blob/master/build/example.build.js
                options: {
                    baseUrl: "./",
                    paths: {},
                    optimize: "none",
                    generateSourceMaps: false,
                    logLevel: 3,
                    preserveLicenseComments: false,
                    onBuildRead: function (moduleName, path, contents) {
                        var wrappedContents = "define(function (require, exports, module) {\n" + contents + "});\n";
                        return moduleName === "node_modules/almond/almond" ? contents : wrappedContents;
                    },
                    name: "node_modules/almond/almond",
                    include: ["./lib/main"],
                    insertRequire: ["./lib/main"],
                    out: "public/js/wvw-tracker.js",
                    wrap: true
                }
            }
        },
        watch: {
            scripts: {
                files: ['lib/**/*.js'],
                tasks: ['requirejs'],
            }
        }
    });
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-jasmine-node");
    grunt.loadNpmTasks("grunt-contrib-requirejs");
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask("lint", ["jshint"]);
    grunt.registerTask("test", ["lint", "jasmine_node"]);
    grunt.registerTask("build", ["test", "requirejs"]);

    grunt.registerTask("default", ["build"]);
};
