var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var tsify = require("tsify");
var watchify = require("watchify");
var gutil = require("gulp-util");

gulp.task("copy-html", function () {
  return gulp
    .src( [ "src/*.html", "vendor/*.js" ] )
    .pipe(gulp.dest("dist"));
});

var watchedBrowserify = watchify(browserify({
  basedir: ".",
  debug: true,
  entries: ["src/main.ts"],
  cache: {},
  packageCache: {}
}).plugin(tsify));

gulp.task("default", ["copy-html"], function () {
  return watchedBrowserify
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(gulp.dest("dist"));
});

function bundle() {
  return watchedBrowserify
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(gulp.dest("dist"));
}

watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", gutil.log);
