var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var watchify = require("watchify");
var tsify = require("tsify");
var gutil = require("gulp-util");
var paths = {
  pages: ["src/*.html", "vendor/*.js"]
};

var watchedBrowserify = watchify(browserify({
  basedir: ".",
  debug: true,
  entries: [
    "src/main.ts",
    "src/javascript/game.ts",
    "src/javascript/utils.ts",
    "src/javascript/logger.ts",
    "src/javascript/generators/drawn.ts",
    "src/javascript/generators/dungeon.ts"
  ],
  cache: {},
  packageCache: {}
}).plugin(tsify));

gulp.task("copy-html", function () {
  return gulp.src(paths.pages)
    .pipe(gulp.dest("dist"));
});

function bundle() {
  return watchedBrowserify
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(gulp.dest("dist"));
}

gulp.task("default", ["copy-html"], bundle);
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", gutil.log);
