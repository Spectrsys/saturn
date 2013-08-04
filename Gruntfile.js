module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        // Define our source and build folders
        js_src_path: 'js/src',
        js_build_path: "js",
        css_src_path: "css/src",
        css_build_path: "css",

        // Grunt Tasks
        concat: {
            options:{
                separator: ';'
            },
            js: {
                src: ["js/src/angular-mocks-1.1.5.js",
                    "js/src/angular-resource-1.1.5.js",
                    "js/src/angular-ui.js",
                    "js/src/http-auth-interceptor.js",
                    "js/src/jquery.cookie.js",
                    "js/src/fullcalendar.min.js",
                    "js/src/gcal.js",
                    "js/src/bootstrap.js",
                    "js/src/ui-bootstrap-tpls-0.3.0.js",
                    "js/src/bootstrap-timepicker.js",
                    "js/src/spectrum.js",
                    "js/src/jquery.resizeStop.js",
                    "js/src/directives/timepicker.js",
                    "js/src/directives/colorpicker.js",
                    "js/src/directives/feedback.js",
                    "js/src/intro.js",
                    "js/src/application.js",
                    "js/src/outro.js"],
                dest: '<%= js_build_path %>/app.js'
            },
            css:{
                src: ["css/src/bootstrap.css",
                    "css/src/bootstrap-responsive.css",
                    "css/src/angular-ui.min.css",
                    "css/src/fullcalendar.css",
                    "css/src/bootstrap-timepicker.css",
                    "css/src/font-awesome.css",
                    "themes/smoothness/jquery-ui-1.10.2.smoothness.min.css",
                    "css/src/spectrum.css",
                    "css/src/application.css"],
                dest: '<%= css_build_path %>/app.css'
            }
        },
        uglify: {
            options:{
                mangle: true,
                banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version + "\\n" %>' +
                    '* <%= grunt.template.today("yyyy-mm-dd") + "\\n" %>' +
                    '* <%= pkg.homepage + "\\n" %>' +
                    '* Copyright (c) <%= grunt.template.today("yyyy") %> - <%= pkg.title || pkg.name %> */ <%= "\\n" %>'
            },
            js: {
                src: '<%= concat.js.dest %>',
                dest:'<%= js_build_path %>/app.min.js'
            }
        },
        cssmin: {
            css: {
                src: '<%= concat.css.dest %>',
                dest:'<%= css_build_path %>/app.min.css'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    // Default task.
    grunt.registerTask('default', ['concat', 'uglify', 'cssmin']);
};