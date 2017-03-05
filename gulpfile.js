var debug_export = false;

var gulp = require('gulp');
var gutil = require('gulp-util');
var glob = require('glob');

var _if = require('gulp-if');
var rjs = require('gulp-requirejs');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');

var less = require('gulp-less');
var rimraf = require('gulp-rimraf');
var replace = require("gulp-replace");
var jshint = require("gulp-jshint");
var server = require('gulp-server-livereload');

gulp.task("css", function () {
	return build_css();
});

var config = {
	css: './assets/*.css',
	js_views: "./views/**/*.js",
	js_locales: "./locales/**/*.js",
	js_helpers: './helpers/**/*.js',
	js_models: './models/**/*.js'
};


function build_css() {
	return gulp.src(config.css)
		.pipe(gulp.dest('./deploy/assets'));
}

gulp.task('js', function () {
	return build_js();
});

function build_js() {
	var views = glob.sync(config.js_views).map(function (value) {
		return value.replace(".js", "");
	});

	var locales = glob.sync(config.js_locales).map(function (value) {
		return value.replace(".js", "");
	});

	return rjs({
		baseUrl: './',
		out: 'app.js',
		insertRequire: ["app"],
		paths: {
			"locale": "empty:",
			"text": 'libs/text'
		},
		deps: ["app"],
		include: ["libs/almond/almond.js"].concat(views).concat(locales)
	})
		.pipe(_if(debug_export, sourcemaps.init()))
		.pipe(uglify())
		.pipe(_if(debug_export, sourcemaps.write("./")))
		.pipe(gulp.dest('./deploy/'));
}

gulp.task("clean", function () {
	return gulp.src("deploy/*", { read: false }).pipe(rimraf());
});

gulp.task('lint', function () {
	return gulp.src([config.js_views, config.js_helpers, config.js_models, './*.js', "!./jshint.conf.js"])
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('build', gulp.series('lint', 'clean', function () {
	var build = (new Date()) * 1;
	var pro = !!gutil.env.pro;

	var streams = [
		build_js(),
		build_css(),
		//assets
		gulp.src("./assets/imgs/**/*.*")
			.pipe(gulp.dest("./deploy/assets/imgs/")),
		//index
		gulp.src("./index.html")
			.pipe(replace('data-main="app" src="libs/requirejs/require.js"', 'src="app.js"'))
			.pipe(replace('<script type="text/javascript" src="libs/less.min.js"></script>', ''))
			.pipe(replace(/rel\=\"stylesheet\/less\" href=\"(.*?)\.less\"/g, 'rel="stylesheet" href="$1.css"'))
			.pipe(replace(/\.css\"/g, '.css?' + build + '"'))
			.pipe(replace(/\.js\"/g, '.js?' + build + '"'))
			.pipe(replace("require.config", "webix.production = true; require.config"))
			.pipe(replace(/libs\/webix\/codebase\//g, (pro ? 'webix/' : '//cdn.webix.com/edge/')))
			.pipe(replace('/webix_debug.js', '/webix.js'))
			.pipe(gulp.dest("./deploy/")),
		//server
		gulp.src(["./server/**/*.*",
			"!./server/*.log", "!./server/config.*",
			"!./server/dev/**/*.*", "!./server/dump/**/*.*"])
			.pipe(gulp.dest("./deploy/server/"))
	];

	if (pro)
		streams.push(gulp.src('libs/webix/codebase/**/*.*').pipe(gulp.dest('./deploy/webix/')));

	return require('event-stream').merge(streams);

}));


gulp.task('webserver', function () {
	gulp.src('./deploy').pipe(server({
			fallback: 'index.html',
			livereload: true
			
		/*	
			directoryListing: true,
			open: true
			*/
		}));
});

gulp.task('watch', function () {
	gulp.watch([config.js_views, config.js_helpers, config.js_models], gulp.parallel('build'));
});

gulp.task('default', gulp.parallel('build', 'watch', 'webserver'));