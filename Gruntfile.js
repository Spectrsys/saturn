
module.exports = function(grunt) {

	var _ = require('underscore');

	// Load required NPM tasks.
	// You must first run `npm install` in the project's root directory to get these dependencies.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('lumbar');

	// Parse config files
	var lumbarConfig = grunt.file.readJSON('lumbar.json');
	var packageConfig = grunt.file.readJSON('package.json');

	// This will eventually get passed to grunt.initConfig()
	// Initialize multitasks...
	var config = {
		concat: {},
		uglify: {},
		copy: {},
		compress: {},
		clean: {}
	};

	// Combine certain configs for the "meta" template variable (<%= meta.whatever %>)
	config.meta = _.extend({}, packageConfig);

    // The "grunt" command with no arguments
    grunt.registerTask('default', 'lumbar:build');

    grunt.registerTask('modules', 'Build the Saturn modules', [
        'lumbar:build',
        'concat:moduleVariables',
        'uglify:modules'
    ]);

    // assemble modules
    config.lumbar = {
        build: {
            build: 'lumbar.json',
            output: 'build/out' // a directory. lumbar doesn't like trailing slash
        }
    };

    // replace template variables (<%= %>), IN PLACE
    config.concat.moduleVariables = {
        options: {
            process: true // replace
        },
        expand: true,
        cwd: 'build/out/',
        src: [ '*.js', '*.css', '!jquery*' ],
        dest: 'build/out/'
    };

    // create minified versions (*.min.js)
    config.uglify.modules = {
        options: {
            preserveComments: false // keep comments starting with /*!
        },
        expand: true,
        src: 'build/out/saturn.js', // only do it for saturn.js
        ext: '.min.js'
    };

    config.clean.modules = 'build/out/*';


	// finally, give grunt the config object...
	grunt.initConfig(config);
};
