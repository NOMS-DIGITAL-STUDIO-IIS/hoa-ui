const webpackStream = require('webpack-stream');
const webpack2 = require('webpack');

const gulp = require('gulp');

gulp.task('webpack', [
    'webpackSearch',
    'webpackMoreless',
    'webpackReveal',
    'webpackAdmin'
]);

gulp.task('webpackSearch', function() {
    return gulp.src('./assets/javascripts/search/search.js')
        .pipe(webpackStream({
            output: {
                filename: 'searchBundle.js'
            },
            module: {
                rules: [{
                    loader: 'babel-loader',
                    exclude: [/node_modules/],
                    query: {
                        presets: [['es2015', {'loose': true}]]
                    }
                }]
            },
            externals: {
                //  require("jquery") is external and available
                //  on the global var jQuery
                jquery: 'jQuery'
            }
        }, webpack2))
        .pipe(gulp.dest('./public/javascripts'));
});

gulp.task('webpackMoreless', function() {
    return gulp.src(['./assets/javascripts/moreless/moreless.js', './assets/javascripts/moreless/longlist.js'])
        .pipe(webpackStream({
            output: {
                filename: 'morelessBundle.js'
            },
            module: {
                rules: [{
                    loader: 'babel-loader',
                    exclude: [/node_modules/],
                    query: {
                        presets: [['es2015', {'loose': true}]]
                    }
                }]
            },
            externals: {
                //  require("jquery") is external and available
                //  on the global var jQuery
                jquery: 'jQuery'
            }
        }, webpack2))
        .pipe(gulp.dest('./public/javascripts'));
});

gulp.task('webpackReveal', function() {
    return gulp.src('./assets/javascripts/moreless/reveal.js')
        .pipe(webpackStream({
            output: {
                filename: 'revealBundle.js'
            },
            module: {
                rules: [{
                    loader: 'babel-loader',
                    exclude: [/node_modules/],
                    query: {
                        presets: [['es2015', {'loose': true}]]
                    }
                }]
            },
            externals: {
                //  require("jquery") is external and available
                //  on the global var jQuery
                jquery: 'jQuery'
            }
        }, webpack2))
        .pipe(gulp.dest('./public/javascripts'));
});

gulp.task('webpackAdmin', function() {
    return gulp.src('./assets/javascripts/admin/tableFilter.js')
        .pipe(webpackStream({
            output: {
                filename: 'adminBundle.js'
            },
            module: {
                rules: [{
                    loader: 'babel-loader',
                    exclude: [/node_modules/],
                    query: {
                        presets: [['es2015', {'loose': true}]]
                    }
                }]
            },
            externals: {
                //  require("jquery") is external and available
                //  on the global var jQuery
                jquery: 'jQuery'
            }
        }, webpack2))
        .pipe(gulp.dest('./public/javascripts'));
});
