/**
 * @license AngularJS v1.1.5
 * (c) 2010-2012 Google, Inc. http://angularjs.org
 * License: MIT
 *
 * TODO(vojta): wrap whole file into closure during build
 */

/**
 * @ngdoc overview
 * @name angular.mock
 * @description
 *
 * Namespace from 'angular-mocks.js' which contains testing related code.
 */
angular.mock = {};

/**
 * ! This is a private undocumented service !
 *
 * @name ngMock.$browser
 *
 * @description
 * This service is a mock implementation of {@link ng.$browser}. It provides fake
 * implementation for commonly used browser apis that are hard to test, e.g. setTimeout, xhr,
 * cookies, etc...
 *
 * The api of this service is the same as that of the real {@link ng.$browser $browser}, except
 * that there are several helper methods available which can be used in tests.
 */
angular.mock.$BrowserProvider = function() {
    this.$get = function(){
        return new angular.mock.$Browser();
    };
};

angular.mock.$Browser = function() {
    var self = this;

    this.isMock = true;
    self.$$url = "http://server/";
    self.$$lastUrl = self.$$url; // used by url polling fn
    self.pollFns = [];

    // TODO(vojta): remove this temporary api
    self.$$completeOutstandingRequest = angular.noop;
    self.$$incOutstandingRequestCount = angular.noop;


    // register url polling fn

    self.onUrlChange = function(listener) {
        self.pollFns.push(
            function() {
                if (self.$$lastUrl != self.$$url) {
                    self.$$lastUrl = self.$$url;
                    listener(self.$$url);
                }
            }
        );

        return listener;
    };

    self.cookieHash = {};
    self.lastCookieHash = {};
    self.deferredFns = [];
    self.deferredNextId = 0;

    self.defer = function(fn, delay) {
        delay = delay || 0;
        self.deferredFns.push({time:(self.defer.now + delay), fn:fn, id: self.deferredNextId});
        self.deferredFns.sort(function(a,b){ return a.time - b.time;});
        return self.deferredNextId++;
    };


    self.defer.now = 0;


    self.defer.cancel = function(deferId) {
        var fnIndex;

        angular.forEach(self.deferredFns, function(fn, index) {
            if (fn.id === deferId) fnIndex = index;
        });

        if (fnIndex !== undefined) {
            self.deferredFns.splice(fnIndex, 1);
            return true;
        }

        return false;
    };


    /**
     * @name ngMock.$browser#defer.flush
     * @methodOf ngMock.$browser
     *
     * @description
     * Flushes all pending requests and executes the defer callbacks.
     *
     * @param {number=} number of milliseconds to flush. See {@link #defer.now}
     */
    self.defer.flush = function(delay) {
        if (angular.isDefined(delay)) {
            self.defer.now += delay;
        } else {
            if (self.deferredFns.length) {
                self.defer.now = self.deferredFns[self.deferredFns.length-1].time;
            } else {
                throw Error('No deferred tasks to be flushed');
            }
        }

        while (self.deferredFns.length && self.deferredFns[0].time <= self.defer.now) {
            self.deferredFns.shift().fn();
        }
    };
    /**
     * @name ngMock.$browser#defer.now
     * @propertyOf ngMock.$browser
     *
     * @description
     * Current milliseconds mock time.
     */

    self.$$baseHref = '';
    self.baseHref = function() {
        return this.$$baseHref;
    };
};
angular.mock.$Browser.prototype = {

    /**
     * @name ngMock.$browser#poll
     * @methodOf ngMock.$browser
     *
     * @description
     * run all fns in pollFns
     */
    poll: function poll() {
        angular.forEach(this.pollFns, function(pollFn){
            pollFn();
        });
    },

    addPollFn: function(pollFn) {
        this.pollFns.push(pollFn);
        return pollFn;
    },

    url: function(url, replace) {
        if (url) {
            this.$$url = url;
            return this;
        }

        return this.$$url;
    },

    cookies:  function(name, value) {
        if (name) {
            if (value == undefined) {
                delete this.cookieHash[name];
            } else {
                if (angular.isString(value) &&       //strings only
                    value.length <= 4096) {          //strict cookie storage limits
                    this.cookieHash[name] = value;
                }
            }
        } else {
            if (!angular.equals(this.cookieHash, this.lastCookieHash)) {
                this.lastCookieHash = angular.copy(this.cookieHash);
                this.cookieHash = angular.copy(this.cookieHash);
            }
            return this.cookieHash;
        }
    },

    notifyWhenNoOutstandingRequests: function(fn) {
        fn();
    }
};


/**
 * @ngdoc object
 * @name ngMock.$exceptionHandlerProvider
 *
 * @description
 * Configures the mock implementation of {@link ng.$exceptionHandler} to rethrow or to log errors passed
 * into the `$exceptionHandler`.
 */

/**
 * @ngdoc object
 * @name ngMock.$exceptionHandler
 *
 * @description
 * Mock implementation of {@link ng.$exceptionHandler} that rethrows or logs errors passed
 * into it. See {@link ngMock.$exceptionHandlerProvider $exceptionHandlerProvider} for configuration
 * information.
 *
 *
 * <pre>
 *   describe('$exceptionHandlerProvider', function() {
 *
 *     it('should capture log messages and exceptions', function() {
 *
 *       module(function($exceptionHandlerProvider) {
 *         $exceptionHandlerProvider.mode('log');
 *       });
 *
 *       inject(function($log, $exceptionHandler, $timeout) {
 *         $timeout(function() { $log.log(1); });
 *         $timeout(function() { $log.log(2); throw 'banana peel'; });
 *         $timeout(function() { $log.log(3); });
 *         expect($exceptionHandler.errors).toEqual([]);
 *         expect($log.assertEmpty());
 *         $timeout.flush();
 *         expect($exceptionHandler.errors).toEqual(['banana peel']);
 *         expect($log.log.logs).toEqual([[1], [2], [3]]);
 *       });
 *     });
 *   });
 * </pre>
 */

angular.mock.$ExceptionHandlerProvider = function() {
    var handler;

    /**
     * @ngdoc method
     * @name ngMock.$exceptionHandlerProvider#mode
     * @methodOf ngMock.$exceptionHandlerProvider
     *
     * @description
     * Sets the logging mode.
     *
     * @param {string} mode Mode of operation, defaults to `rethrow`.
     *
     *   - `rethrow`: If any errors are passed into the handler in tests, it typically
     *                means that there is a bug in the application or test, so this mock will
     *                make these tests fail.
     *   - `log`: Sometimes it is desirable to test that an error is thrown, for this case the `log` mode stores an
     *            array of errors in `$exceptionHandler.errors`, to allow later assertion of them.
     *            See {@link ngMock.$log#assertEmpty assertEmpty()} and
     *             {@link ngMock.$log#reset reset()}
     */
    this.mode = function(mode) {
        switch(mode) {
            case 'rethrow':
                handler = function(e) {
                    throw e;
                };
                break;
            case 'log':
                var errors = [];

                handler = function(e) {
                    if (arguments.length == 1) {
                        errors.push(e);
                    } else {
                        errors.push([].slice.call(arguments, 0));
                    }
                };

                handler.errors = errors;
                break;
            default:
                throw Error("Unknown mode '" + mode + "', only 'log'/'rethrow' modes are allowed!");
        }
    };

    this.$get = function() {
        return handler;
    };

    this.mode('rethrow');
};


/**
 * @ngdoc service
 * @name ngMock.$log
 *
 * @description
 * Mock implementation of {@link ng.$log} that gathers all logged messages in arrays
 * (one array per logging level). These arrays are exposed as `logs` property of each of the
 * level-specific log function, e.g. for level `error` the array is exposed as `$log.error.logs`.
 *
 */
angular.mock.$LogProvider = function() {

    function concat(array1, array2, index) {
        return array1.concat(Array.prototype.slice.call(array2, index));
    }


    this.$get = function () {
        var $log = {
            log: function() { $log.log.logs.push(concat([], arguments, 0)); },
            warn: function() { $log.warn.logs.push(concat([], arguments, 0)); },
            info: function() { $log.info.logs.push(concat([], arguments, 0)); },
            error: function() { $log.error.logs.push(concat([], arguments, 0)); }
        };

        /**
         * @ngdoc method
         * @name ngMock.$log#reset
         * @methodOf ngMock.$log
         *
         * @description
         * Reset all of the logging arrays to empty.
         */
        $log.reset = function () {
            /**
             * @ngdoc property
             * @name ngMock.$log#log.logs
             * @propertyOf ngMock.$log
             *
             * @description
             * Array of messages logged using {@link ngMock.$log#log}.
             *
             * @example
             * <pre>
             * $log.log('Some Log');
             * var first = $log.log.logs.unshift();
             * </pre>
             */
            $log.log.logs = [];
            /**
             * @ngdoc property
             * @name ngMock.$log#warn.logs
             * @propertyOf ngMock.$log
             *
             * @description
             * Array of messages logged using {@link ngMock.$log#warn}.
             *
             * @example
             * <pre>
             * $log.warn('Some Warning');
             * var first = $log.warn.logs.unshift();
             * </pre>
             */
            $log.warn.logs = [];
            /**
             * @ngdoc property
             * @name ngMock.$log#info.logs
             * @propertyOf ngMock.$log
             *
             * @description
             * Array of messages logged using {@link ngMock.$log#info}.
             *
             * @example
             * <pre>
             * $log.info('Some Info');
             * var first = $log.info.logs.unshift();
             * </pre>
             */
            $log.info.logs = [];
            /**
             * @ngdoc property
             * @name ngMock.$log#error.logs
             * @propertyOf ngMock.$log
             *
             * @description
             * Array of messages logged using {@link ngMock.$log#error}.
             *
             * @example
             * <pre>
             * $log.log('Some Error');
             * var first = $log.error.logs.unshift();
             * </pre>
             */
            $log.error.logs = [];
        };

        /**
         * @ngdoc method
         * @name ngMock.$log#assertEmpty
         * @methodOf ngMock.$log
         *
         * @description
         * Assert that the all of the logging methods have no logged messages. If messages present, an exception is thrown.
         */
        $log.assertEmpty = function() {
            var errors = [];
            angular.forEach(['error', 'warn', 'info', 'log'], function(logLevel) {
                angular.forEach($log[logLevel].logs, function(log) {
                    angular.forEach(log, function (logItem) {
                        errors.push('MOCK $log (' + logLevel + '): ' + String(logItem) + '\n' + (logItem.stack || ''));
                    });
                });
            });
            if (errors.length) {
                errors.unshift("Expected $log to be empty! Either a message was logged unexpectedly, or an expected " +
                    "log message was not checked and removed:");
                errors.push('');
                throw new Error(errors.join('\n---------\n'));
            }
        };

        $log.reset();
        return $log;
    };
};


(function() {
    var R_ISO8061_STR = /^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?:\:?(\d\d)(?:\:?(\d\d)(?:\.(\d{3}))?)?)?(Z|([+-])(\d\d):?(\d\d)))?$/;

    function jsonStringToDate(string){
        var match;
        if (match = string.match(R_ISO8061_STR)) {
            var date = new Date(0),
                tzHour = 0,
                tzMin  = 0;
            if (match[9]) {
                tzHour = int(match[9] + match[10]);
                tzMin = int(match[9] + match[11]);
            }
            date.setUTCFullYear(int(match[1]), int(match[2]) - 1, int(match[3]));
            date.setUTCHours(int(match[4]||0) - tzHour, int(match[5]||0) - tzMin, int(match[6]||0), int(match[7]||0));
            return date;
        }
        return string;
    }

    function int(str) {
        return parseInt(str, 10);
    }

    function padNumber(num, digits, trim) {
        var neg = '';
        if (num < 0) {
            neg =  '-';
            num = -num;
        }
        num = '' + num;
        while(num.length < digits) num = '0' + num;
        if (trim)
            num = num.substr(num.length - digits);
        return neg + num;
    }


    /**
     * @ngdoc object
     * @name angular.mock.TzDate
     * @description
     *
     * *NOTE*: this is not an injectable instance, just a globally available mock class of `Date`.
     *
     * Mock of the Date type which has its timezone specified via constructor arg.
     *
     * The main purpose is to create Date-like instances with timezone fixed to the specified timezone
     * offset, so that we can test code that depends on local timezone settings without dependency on
     * the time zone settings of the machine where the code is running.
     *
     * @param {number} offset Offset of the *desired* timezone in hours (fractions will be honored)
     * @param {(number|string)} timestamp Timestamp representing the desired time in *UTC*
     *
     * @example
     * !!!! WARNING !!!!!
     * This is not a complete Date object so only methods that were implemented can be called safely.
     * To make matters worse, TzDate instances inherit stuff from Date via a prototype.
     *
     * We do our best to intercept calls to "unimplemented" methods, but since the list of methods is
     * incomplete we might be missing some non-standard methods. This can result in errors like:
     * "Date.prototype.foo called on incompatible Object".
     *
     * <pre>
     * var newYearInBratislava = new TzDate(-1, '2009-12-31T23:00:00Z');
     * newYearInBratislava.getTimezoneOffset() => -60;
     * newYearInBratislava.getFullYear() => 2010;
     * newYearInBratislava.getMonth() => 0;
     * newYearInBratislava.getDate() => 1;
     * newYearInBratislava.getHours() => 0;
     * newYearInBratislava.getMinutes() => 0;
     * newYearInBratislava.getSeconds() => 0;
     * </pre>
     *
     */
    angular.mock.TzDate = function (offset, timestamp) {
        var self = new Date(0);
        if (angular.isString(timestamp)) {
            var tsStr = timestamp;

            self.origDate = jsonStringToDate(timestamp);

            timestamp = self.origDate.getTime();
            if (isNaN(timestamp))
                throw {
                    name: "Illegal Argument",
                    message: "Arg '" + tsStr + "' passed into TzDate constructor is not a valid date string"
                };
        } else {
            self.origDate = new Date(timestamp);
        }

        var localOffset = new Date(timestamp).getTimezoneOffset();
        self.offsetDiff = localOffset*60*1000 - offset*1000*60*60;
        self.date = new Date(timestamp + self.offsetDiff);

        self.getTime = function() {
            return self.date.getTime() - self.offsetDiff;
        };

        self.toLocaleDateString = function() {
            return self.date.toLocaleDateString();
        };

        self.getFullYear = function() {
            return self.date.getFullYear();
        };

        self.getMonth = function() {
            return self.date.getMonth();
        };

        self.getDate = function() {
            return self.date.getDate();
        };

        self.getHours = function() {
            return self.date.getHours();
        };

        self.getMinutes = function() {
            return self.date.getMinutes();
        };

        self.getSeconds = function() {
            return self.date.getSeconds();
        };

        self.getMilliseconds = function() {
            return self.date.getMilliseconds();
        };

        self.getTimezoneOffset = function() {
            return offset * 60;
        };

        self.getUTCFullYear = function() {
            return self.origDate.getUTCFullYear();
        };

        self.getUTCMonth = function() {
            return self.origDate.getUTCMonth();
        };

        self.getUTCDate = function() {
            return self.origDate.getUTCDate();
        };

        self.getUTCHours = function() {
            return self.origDate.getUTCHours();
        };

        self.getUTCMinutes = function() {
            return self.origDate.getUTCMinutes();
        };

        self.getUTCSeconds = function() {
            return self.origDate.getUTCSeconds();
        };

        self.getUTCMilliseconds = function() {
            return self.origDate.getUTCMilliseconds();
        };

        self.getDay = function() {
            return self.date.getDay();
        };

        // provide this method only on browsers that already have it
        if (self.toISOString) {
            self.toISOString = function() {
                return padNumber(self.origDate.getUTCFullYear(), 4) + '-' +
                    padNumber(self.origDate.getUTCMonth() + 1, 2) + '-' +
                    padNumber(self.origDate.getUTCDate(), 2) + 'T' +
                    padNumber(self.origDate.getUTCHours(), 2) + ':' +
                    padNumber(self.origDate.getUTCMinutes(), 2) + ':' +
                    padNumber(self.origDate.getUTCSeconds(), 2) + '.' +
                    padNumber(self.origDate.getUTCMilliseconds(), 3) + 'Z'
            }
        }

        //hide all methods not implemented in this mock that the Date prototype exposes
        var unimplementedMethods = ['getUTCDay',
            'getYear', 'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
            'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear',
            'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth', 'setUTCSeconds',
            'setYear', 'toDateString', 'toGMTString', 'toJSON', 'toLocaleFormat', 'toLocaleString',
            'toLocaleTimeString', 'toSource', 'toString', 'toTimeString', 'toUTCString', 'valueOf'];

        angular.forEach(unimplementedMethods, function(methodName) {
            self[methodName] = function() {
                throw Error("Method '" + methodName + "' is not implemented in the TzDate mock");
            };
        });

        return self;
    };

    //make "tzDateInstance instanceof Date" return true
    angular.mock.TzDate.prototype = Date.prototype;
})();

/**
 * @ngdoc function
 * @name angular.mock.createMockWindow
 * @description
 *
 * This function creates a mock window object useful for controlling access ot setTimeout, but mocking out
 * sufficient window's properties to allow Angular to execute.
 *
 * @example
 *
 * <pre>
 beforeEach(module(function($provide) {
      $provide.value('$window', window = angular.mock.createMockWindow());
    }));

 it('should do something', inject(function($window) {
      var val = null;
      $window.setTimeout(function() { val = 123; }, 10);
      expect(val).toEqual(null);
      window.setTimeout.expect(10).process();
      expect(val).toEqual(123);
    });
 * </pre>
 *
 */
angular.mock.createMockWindow = function() {
    var mockWindow = {};
    var setTimeoutQueue = [];

    mockWindow.document = window.document;
    mockWindow.getComputedStyle = angular.bind(window, window.getComputedStyle);
    mockWindow.scrollTo = angular.bind(window, window.scrollTo);
    mockWindow.navigator = window.navigator;
    mockWindow.setTimeout = function(fn, delay) {
        setTimeoutQueue.push({fn: fn, delay: delay});
    };
    mockWindow.setTimeout.queue = setTimeoutQueue;
    mockWindow.setTimeout.expect = function(delay) {
        if (setTimeoutQueue.length > 0) {
            return {
                process: function() {
                    var tick = setTimeoutQueue.shift();
                    expect(tick.delay).toEqual(delay);
                    tick.fn();
                }
            };
        } else {
            expect('SetTimoutQueue empty. Expecting delay of ').toEqual(delay);
        }
    };

    return mockWindow;
};

/**
 * @ngdoc function
 * @name angular.mock.dump
 * @description
 *
 * *NOTE*: this is not an injectable instance, just a globally available function.
 *
 * Method for serializing common angular objects (scope, elements, etc..) into strings, useful for debugging.
 *
 * This method is also available on window, where it can be used to display objects on debug console.
 *
 * @param {*} object - any object to turn into string.
 * @return {string} a serialized string of the argument
 */
angular.mock.dump = function(object) {
    return serialize(object);

    function serialize(object) {
        var out;

        if (angular.isElement(object)) {
            object = angular.element(object);
            out = angular.element('<div></div>');
            angular.forEach(object, function(element) {
                out.append(angular.element(element).clone());
            });
            out = out.html();
        } else if (angular.isArray(object)) {
            out = [];
            angular.forEach(object, function(o) {
                out.push(serialize(o));
            });
            out = '[ ' + out.join(', ') + ' ]';
        } else if (angular.isObject(object)) {
            if (angular.isFunction(object.$eval) && angular.isFunction(object.$apply)) {
                out = serializeScope(object);
            } else if (object instanceof Error) {
                out = object.stack || ('' + object.name + ': ' + object.message);
            } else {
                out = angular.toJson(object, true);
            }
        } else {
            out = String(object);
        }

        return out;
    }

    function serializeScope(scope, offset) {
        offset = offset ||  '  ';
        var log = [offset + 'Scope(' + scope.$id + '): {'];
        for ( var key in scope ) {
            if (scope.hasOwnProperty(key) && !key.match(/^(\$|this)/)) {
                log.push('  ' + key + ': ' + angular.toJson(scope[key]));
            }
        }
        var child = scope.$$childHead;
        while(child) {
            log.push(serializeScope(child, offset + '  '));
            child = child.$$nextSibling;
        }
        log.push('}');
        return log.join('\n' + offset);
    }
};

/**
 * @ngdoc object
 * @name ngMock.$httpBackend
 * @description
 * Fake HTTP backend implementation suitable for unit testing applications that use the
 * {@link ng.$http $http service}.
 *
 * *Note*: For fake HTTP backend implementation suitable for end-to-end testing or backend-less
 * development please see {@link ngMockE2E.$httpBackend e2e $httpBackend mock}.
 *
 * During unit testing, we want our unit tests to run quickly and have no external dependencies so
 * we donâ€™t want to send {@link https://developer.mozilla.org/en/xmlhttprequest XHR} or
 * {@link http://en.wikipedia.org/wiki/JSONP JSONP} requests to a real server. All we really need is
 * to verify whether a certain request has been sent or not, or alternatively just let the
 * application make requests, respond with pre-trained responses and assert that the end result is
 * what we expect it to be.
 *
 * This mock implementation can be used to respond with static or dynamic responses via the
 * `expect` and `when` apis and their shortcuts (`expectGET`, `whenPOST`, etc).
 *
 * When an Angular application needs some data from a server, it calls the $http service, which
 * sends the request to a real server using $httpBackend service. With dependency injection, it is
 * easy to inject $httpBackend mock (which has the same API as $httpBackend) and use it to verify
 * the requests and respond with some testing data without sending a request to real server.
 *
 * There are two ways to specify what test data should be returned as http responses by the mock
 * backend when the code under test makes http requests:
 *
 * - `$httpBackend.expect` - specifies a request expectation
 * - `$httpBackend.when` - specifies a backend definition
 *
 *
 * # Request Expectations vs Backend Definitions
 *
 * Request expectations provide a way to make assertions about requests made by the application and
 * to define responses for those requests. The test will fail if the expected requests are not made
 * or they are made in the wrong order.
 *
 * Backend definitions allow you to define a fake backend for your application which doesn't assert
 * if a particular request was made or not, it just returns a trained response if a request is made.
 * The test will pass whether or not the request gets made during testing.
 *
 *
 * <table class="table">
 *   <tr><th width="220px"></th><th>Request expectations</th><th>Backend definitions</th></tr>
 *   <tr>
 *     <th>Syntax</th>
 *     <td>.expect(...).respond(...)</td>
 *     <td>.when(...).respond(...)</td>
 *   </tr>
 *   <tr>
 *     <th>Typical usage</th>
 *     <td>strict unit tests</td>
 *     <td>loose (black-box) unit testing</td>
 *   </tr>
 *   <tr>
 *     <th>Fulfills multiple requests</th>
 *     <td>NO</td>
 *     <td>YES</td>
 *   </tr>
 *   <tr>
 *     <th>Order of requests matters</th>
 *     <td>YES</td>
 *     <td>NO</td>
 *   </tr>
 *   <tr>
 *     <th>Request required</th>
 *     <td>YES</td>
 *     <td>NO</td>
 *   </tr>
 *   <tr>
 *     <th>Response required</th>
 *     <td>optional (see below)</td>
 *     <td>YES</td>
 *   </tr>
 * </table>
 *
 * In cases where both backend definitions and request expectations are specified during unit
 * testing, the request expectations are evaluated first.
 *
 * If a request expectation has no response specified, the algorithm will search your backend
 * definitions for an appropriate response.
 *
 * If a request didn't match any expectation or if the expectation doesn't have the response
 * defined, the backend definitions are evaluated in sequential order to see if any of them match
 * the request. The response from the first matched definition is returned.
 *
 *
 * # Flushing HTTP requests
 *
 * The $httpBackend used in production, always responds to requests with responses asynchronously.
 * If we preserved this behavior in unit testing, we'd have to create async unit tests, which are
 * hard to write, follow and maintain. At the same time the testing mock, can't respond
 * synchronously because that would change the execution of the code under test. For this reason the
 * mock $httpBackend has a `flush()` method, which allows the test to explicitly flush pending
 * requests and thus preserving the async api of the backend, while allowing the test to execute
 * synchronously.
 *
 *
 * # Unit testing with mock $httpBackend
 *
 * <pre>
 // controller
 function MyController($scope, $http) {
     $http.get('/auth.py').success(function(data) {
       $scope.user = data;
     });

     this.saveMessage = function(message) {
       $scope.status = 'Saving...';
       $http.post('/add-msg.py', message).success(function(response) {
         $scope.status = '';
       }).error(function() {
         $scope.status = 'ERROR!';
       });
     };
   }

 // testing controller
 var $httpBackend;

 beforeEach(inject(function($injector) {
     $httpBackend = $injector.get('$httpBackend');

     // backend definition common for all tests
     $httpBackend.when('GET', '/auth.py').respond({userId: 'userX'}, {'A-Token': 'xxx'});
   }));


 afterEach(function() {
     $httpBackend.verifyNoOutstandingExpectation();
     $httpBackend.verifyNoOutstandingRequest();
   });


 it('should fetch authentication token', function() {
     $httpBackend.expectGET('/auth.py');
     var controller = scope.$new(MyController);
     $httpBackend.flush();
   });


 it('should send msg to server', function() {
     // now you donâ€™t care about the authentication, but
     // the controller will still send the request and
     // $httpBackend will respond without you having to
     // specify the expectation and response for this request
     $httpBackend.expectPOST('/add-msg.py', 'message content').respond(201, '');

     var controller = scope.$new(MyController);
     $httpBackend.flush();
     controller.saveMessage('message content');
     expect(controller.status).toBe('Saving...');
     $httpBackend.flush();
     expect(controller.status).toBe('');
   });


 it('should send auth header', function() {
     $httpBackend.expectPOST('/add-msg.py', undefined, function(headers) {
       // check if the header was send, if it wasn't the expectation won't
       // match the request and the test will fail
       return headers['Authorization'] == 'xxx';
     }).respond(201, '');

     var controller = scope.$new(MyController);
     controller.saveMessage('whatever');
     $httpBackend.flush();
   });
 </pre>
 */
angular.mock.$HttpBackendProvider = function() {
    this.$get = ['$rootScope', createHttpBackendMock];
};

/**
 * General factory function for $httpBackend mock.
 * Returns instance for unit testing (when no arguments specified):
 *   - passing through is disabled
 *   - auto flushing is disabled
 *
 * Returns instance for e2e testing (when `$delegate` and `$browser` specified):
 *   - passing through (delegating request to real backend) is enabled
 *   - auto flushing is enabled
 *
 * @param {Object=} $delegate Real $httpBackend instance (allow passing through if specified)
 * @param {Object=} $browser Auto-flushing enabled if specified
 * @return {Object} Instance of $httpBackend mock
 */
function createHttpBackendMock($rootScope, $delegate, $browser) {
    var definitions = [],
        expectations = [],
        responses = [],
        responsesPush = angular.bind(responses, responses.push);

    function createResponse(status, data, headers) {
        if (angular.isFunction(status)) return status;

        return function() {
            return angular.isNumber(status)
                ? [status, data, headers]
                : [200, status, data];
        };
    }

    // TODO(vojta): change params to: method, url, data, headers, callback
    function $httpBackend(method, url, data, callback, headers, timeout) {
        var xhr = new MockXhr(),
            expectation = expectations[0],
            wasExpected = false;

        function prettyPrint(data) {
            return (angular.isString(data) || angular.isFunction(data) || data instanceof RegExp)
                ? data
                : angular.toJson(data);
        }

        function wrapResponse(wrapped) {
            if (!$browser && timeout && timeout.then) timeout.then(handleTimeout);

            return handleResponse;

            function handleResponse() {
                var response = wrapped.response(method, url, data, headers);
                xhr.$$respHeaders = response[2];
                callback(response[0], response[1], xhr.getAllResponseHeaders());
            }

            function handleTimeout() {
                for (var i = 0, ii = responses.length; i < ii; i++) {
                    if (responses[i] === handleResponse) {
                        responses.splice(i, 1);
                        callback(-1, undefined, '');
                        break;
                    }
                }
            }
        }

        if (expectation && expectation.match(method, url)) {
            if (!expectation.matchData(data))
                throw Error('Expected ' + expectation + ' with different data\n' +
                    'EXPECTED: ' + prettyPrint(expectation.data) + '\nGOT:      ' + data);

            if (!expectation.matchHeaders(headers))
                throw Error('Expected ' + expectation + ' with different headers\n' +
                    'EXPECTED: ' + prettyPrint(expectation.headers) + '\nGOT:      ' +
                    prettyPrint(headers));

            expectations.shift();

            if (expectation.response) {
                responses.push(wrapResponse(expectation));
                return;
            }
            wasExpected = true;
        }

        var i = -1, definition;
        while ((definition = definitions[++i])) {
            if (definition.match(method, url, data, headers || {})) {
                if (definition.response) {
                    // if $browser specified, we do auto flush all requests
                    ($browser ? $browser.defer : responsesPush)(wrapResponse(definition));
                } else if (definition.passThrough) {
                    $delegate(method, url, data, callback, headers, timeout);
                } else throw Error('No response defined !');
                return;
            }
        }
        throw wasExpected ?
            Error('No response defined !') :
            Error('Unexpected request: ' + method + ' ' + url + '\n' +
                (expectation ? 'Expected ' + expectation : 'No more request expected'));
    }

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#when
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new backend definition.
     *
     * @param {string} method HTTP method.
     * @param {string|RegExp} url HTTP url.
     * @param {(string|RegExp)=} data HTTP request body.
     * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
     *   object and returns true if the headers match the current definition.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *   request is handled.
     *
     *  - respond â€“ `{function([status,] data[, headers])|function(function(method, url, data, headers)}`
     *    â€“ The respond method takes a set of static data to be returned or a function that can return
     *    an array containing response status (number), response data (string) and response headers
     *    (Object).
     */
    $httpBackend.when = function(method, url, data, headers) {
        var definition = new MockHttpExpectation(method, url, data, headers),
            chain = {
                respond: function(status, data, headers) {
                    definition.response = createResponse(status, data, headers);
                }
            };

        if ($browser) {
            chain.passThrough = function() {
                definition.passThrough = true;
            };
        }

        definitions.push(definition);
        return chain;
    };

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#whenGET
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new backend definition for GET requests. For more info see `when()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     * request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#whenHEAD
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new backend definition for HEAD requests. For more info see `when()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     * request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#whenDELETE
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new backend definition for DELETE requests. For more info see `when()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     * request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#whenPOST
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new backend definition for POST requests. For more info see `when()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(string|RegExp)=} data HTTP request body.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     * request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#whenPUT
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new backend definition for PUT requests.  For more info see `when()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(string|RegExp)=} data HTTP request body.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     * request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#whenJSONP
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new backend definition for JSONP requests. For more info see `when()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     * request is handled.
     */
    createShortMethods('when');


    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expect
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation.
     *
     * @param {string} method HTTP method.
     * @param {string|RegExp} url HTTP url.
     * @param {(string|RegExp)=} data HTTP request body.
     * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
     *   object and returns true if the headers match the current expectation.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *  request is handled.
     *
     *  - respond â€“ `{function([status,] data[, headers])|function(function(method, url, data, headers)}`
     *    â€“ The respond method takes a set of static data to be returned or a function that can return
     *    an array containing response status (number), response data (string) and response headers
     *    (Object).
     */
    $httpBackend.expect = function(method, url, data, headers) {
        var expectation = new MockHttpExpectation(method, url, data, headers);
        expectations.push(expectation);
        return {
            respond: function(status, data, headers) {
                expectation.response = createResponse(status, data, headers);
            }
        };
    };


    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expectGET
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation for GET requests. For more info see `expect()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {Object=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     * request is handled. See #expect for more info.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expectHEAD
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation for HEAD requests. For more info see `expect()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {Object=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *   request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expectDELETE
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation for DELETE requests. For more info see `expect()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {Object=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *   request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expectPOST
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation for POST requests. For more info see `expect()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(string|RegExp)=} data HTTP request body.
     * @param {Object=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *   request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expectPUT
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation for PUT requests. For more info see `expect()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(string|RegExp)=} data HTTP request body.
     * @param {Object=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *   request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expectPATCH
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation for PATCH requests. For more info see `expect()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @param {(string|RegExp)=} data HTTP request body.
     * @param {Object=} headers HTTP headers.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *   request is handled.
     */

    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#expectJSONP
     * @methodOf ngMock.$httpBackend
     * @description
     * Creates a new request expectation for JSONP requests. For more info see `expect()`.
     *
     * @param {string|RegExp} url HTTP url.
     * @returns {requestHandler} Returns an object with `respond` method that control how a matched
     *   request is handled.
     */
    createShortMethods('expect');


    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#flush
     * @methodOf ngMock.$httpBackend
     * @description
     * Flushes all pending requests using the trained responses.
     *
     * @param {number=} count Number of responses to flush (in the order they arrived). If undefined,
     *   all pending requests will be flushed. If there are no pending requests when the flush method
     *   is called an exception is thrown (as this typically a sign of programming error).
     */
    $httpBackend.flush = function(count) {
        $rootScope.$digest();
        if (!responses.length) throw Error('No pending request to flush !');

        if (angular.isDefined(count)) {
            while (count--) {
                if (!responses.length) throw Error('No more pending request to flush !');
                responses.shift()();
            }
        } else {
            while (responses.length) {
                responses.shift()();
            }
        }
        $httpBackend.verifyNoOutstandingExpectation();
    };


    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#verifyNoOutstandingExpectation
     * @methodOf ngMock.$httpBackend
     * @description
     * Verifies that all of the requests defined via the `expect` api were made. If any of the
     * requests were not made, verifyNoOutstandingExpectation throws an exception.
     *
     * Typically, you would call this method following each test case that asserts requests using an
     * "afterEach" clause.
     *
     * <pre>
     *   afterEach($httpBackend.verifyExpectations);
     * </pre>
     */
    $httpBackend.verifyNoOutstandingExpectation = function() {
        $rootScope.$digest();
        if (expectations.length) {
            throw Error('Unsatisfied requests: ' + expectations.join(', '));
        }
    };


    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#verifyNoOutstandingRequest
     * @methodOf ngMock.$httpBackend
     * @description
     * Verifies that there are no outstanding requests that need to be flushed.
     *
     * Typically, you would call this method following each test case that asserts requests using an
     * "afterEach" clause.
     *
     * <pre>
     *   afterEach($httpBackend.verifyNoOutstandingRequest);
     * </pre>
     */
    $httpBackend.verifyNoOutstandingRequest = function() {
        if (responses.length) {
            throw Error('Unflushed requests: ' + responses.length);
        }
    };


    /**
     * @ngdoc method
     * @name ngMock.$httpBackend#resetExpectations
     * @methodOf ngMock.$httpBackend
     * @description
     * Resets all request expectations, but preserves all backend definitions. Typically, you would
     * call resetExpectations during a multiple-phase test when you want to reuse the same instance of
     * $httpBackend mock.
     */
    $httpBackend.resetExpectations = function() {
        expectations.length = 0;
        responses.length = 0;
    };

    return $httpBackend;


    function createShortMethods(prefix) {
        angular.forEach(['GET', 'DELETE', 'JSONP'], function(method) {
            $httpBackend[prefix + method] = function(url, headers) {
                return $httpBackend[prefix](method, url, undefined, headers)
            }
        });

        angular.forEach(['PUT', 'POST', 'PATCH'], function(method) {
            $httpBackend[prefix + method] = function(url, data, headers) {
                return $httpBackend[prefix](method, url, data, headers)
            }
        });
    }
}

function MockHttpExpectation(method, url, data, headers) {

    this.data = data;
    this.headers = headers;

    this.match = function(m, u, d, h) {
        if (method != m) return false;
        if (!this.matchUrl(u)) return false;
        if (angular.isDefined(d) && !this.matchData(d)) return false;
        if (angular.isDefined(h) && !this.matchHeaders(h)) return false;
        return true;
    };

    this.matchUrl = function(u) {
        if (!url) return true;
        if (angular.isFunction(url.test)) return url.test(u);
        return url == u;
    };

    this.matchHeaders = function(h) {
        if (angular.isUndefined(headers)) return true;
        if (angular.isFunction(headers)) return headers(h);
        return angular.equals(headers, h);
    };

    this.matchData = function(d) {
        if (angular.isUndefined(data)) return true;
        if (data && angular.isFunction(data.test)) return data.test(d);
        if (data && !angular.isString(data)) return angular.toJson(data) == d;
        return data == d;
    };

    this.toString = function() {
        return method + ' ' + url;
    };
}

function MockXhr() {

    // hack for testing $http, $httpBackend
    MockXhr.$$lastInstance = this;

    this.open = function(method, url, async) {
        this.$$method = method;
        this.$$url = url;
        this.$$async = async;
        this.$$reqHeaders = {};
        this.$$respHeaders = {};
    };

    this.send = function(data) {
        this.$$data = data;
    };

    this.setRequestHeader = function(key, value) {
        this.$$reqHeaders[key] = value;
    };

    this.getResponseHeader = function(name) {
        // the lookup must be case insensitive, that's why we try two quick lookups and full scan at last
        var header = this.$$respHeaders[name];
        if (header) return header;

        name = angular.lowercase(name);
        header = this.$$respHeaders[name];
        if (header) return header;

        header = undefined;
        angular.forEach(this.$$respHeaders, function(headerVal, headerName) {
            if (!header && angular.lowercase(headerName) == name) header = headerVal;
        });
        return header;
    };

    this.getAllResponseHeaders = function() {
        var lines = [];

        angular.forEach(this.$$respHeaders, function(value, key) {
            lines.push(key + ': ' + value);
        });
        return lines.join('\n');
    };

    this.abort = angular.noop;
}


/**
 * @ngdoc function
 * @name ngMock.$timeout
 * @description
 *
 * This service is just a simple decorator for {@link ng.$timeout $timeout} service
 * that adds a "flush" and "verifyNoPendingTasks" methods.
 */

angular.mock.$TimeoutDecorator = function($delegate, $browser) {

    /**
     * @ngdoc method
     * @name ngMock.$timeout#flush
     * @methodOf ngMock.$timeout
     * @description
     *
     * Flushes the queue of pending tasks.
     */
    $delegate.flush = function() {
        $browser.defer.flush();
    };

    /**
     * @ngdoc method
     * @name ngMock.$timeout#verifyNoPendingTasks
     * @methodOf ngMock.$timeout
     * @description
     *
     * Verifies that there are no pending tasks that need to be flushed.
     */
    $delegate.verifyNoPendingTasks = function() {
        if ($browser.deferredFns.length) {
            throw Error('Deferred tasks to flush (' + $browser.deferredFns.length + '): ' +
                formatPendingTasksAsString($browser.deferredFns));
        }
    };

    function formatPendingTasksAsString(tasks) {
        var result = [];
        angular.forEach(tasks, function(task) {
            result.push('{id: ' + task.id + ', ' + 'time: ' + task.time + '}');
        });

        return result.join(', ');
    }

    return $delegate;
};

/**
 *
 */
angular.mock.$RootElementProvider = function() {
    this.$get = function() {
        return angular.element('<div ng-app></div>');
    }
};

/**
 * @ngdoc overview
 * @name ngMock
 * @description
 *
 * The `ngMock` is an angular module which is used with `ng` module and adds unit-test configuration as well as useful
 * mocks to the {@link AUTO.$injector $injector}.
 */
angular.module('ngMock', ['ng']).provider({
    $browser: angular.mock.$BrowserProvider,
    $exceptionHandler: angular.mock.$ExceptionHandlerProvider,
    $log: angular.mock.$LogProvider,
    $httpBackend: angular.mock.$HttpBackendProvider,
    $rootElement: angular.mock.$RootElementProvider
}).config(function($provide) {
        $provide.decorator('$timeout', angular.mock.$TimeoutDecorator);
    });

/**
 * @ngdoc overview
 * @name ngMockE2E
 * @description
 *
 * The `ngMockE2E` is an angular module which contains mocks suitable for end-to-end testing.
 * Currently there is only one mock present in this module -
 * the {@link ngMockE2E.$httpBackend e2e $httpBackend} mock.
 */
angular.module('ngMockE2E', ['ng']).config(function($provide) {
    $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
});

/**
 * @ngdoc object
 * @name ngMockE2E.$httpBackend
 * @description
 * Fake HTTP backend implementation suitable for end-to-end testing or backend-less development of
 * applications that use the {@link ng.$http $http service}.
 *
 * *Note*: For fake http backend implementation suitable for unit testing please see
 * {@link ngMock.$httpBackend unit-testing $httpBackend mock}.
 *
 * This implementation can be used to respond with static or dynamic responses via the `when` api
 * and its shortcuts (`whenGET`, `whenPOST`, etc) and optionally pass through requests to the
 * real $httpBackend for specific requests (e.g. to interact with certain remote apis or to fetch
 * templates from a webserver).
 *
 * As opposed to unit-testing, in an end-to-end testing scenario or in scenario when an application
 * is being developed with the real backend api replaced with a mock, it is often desirable for
 * certain category of requests to bypass the mock and issue a real http request (e.g. to fetch
 * templates or static files from the webserver). To configure the backend with this behavior
 * use the `passThrough` request handler of `when` instead of `respond`.
 *
 * Additionally, we don't want to manually have to flush mocked out requests like we do during unit
 * testing. For this reason the e2e $httpBackend automatically flushes mocked out requests
 * automatically, closely simulating the behavior of the XMLHttpRequest object.
 *
 * To setup the application to run with this http backend, you have to create a module that depends
 * on the `ngMockE2E` and your application modules and defines the fake backend:
 *
 * <pre>
 *   myAppDev = angular.module('myAppDev', ['myApp', 'ngMockE2E']);
 *   myAppDev.run(function($httpBackend) {
 *     phones = [{name: 'phone1'}, {name: 'phone2'}];
 *
 *     // returns the current list of phones
 *     $httpBackend.whenGET('/phones').respond(phones);
 *
 *     // adds a new phone to the phones array
 *     $httpBackend.whenPOST('/phones').respond(function(method, url, data) {
 *       phones.push(angular.fromJSON(data));
 *     });
 *     $httpBackend.whenGET(/^\/templates\//).passThrough();
 *     //...
 *   });
 * </pre>
 *
 * Afterwards, bootstrap your app with this new module.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#when
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition.
 *
 * @param {string} method HTTP method.
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
 *   object and returns true if the headers match the current definition.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 *
 *  - respond â€“ `{function([status,] data[, headers])|function(function(method, url, data, headers)}`
 *    â€“ The respond method takes a set of static data to be returned or a function that can return
 *    an array containing response status (number), response data (string) and response headers
 *    (Object).
 *  - passThrough â€“ `{function()}` â€“ Any request matching a backend definition with `passThrough`
 *    handler, will be pass through to the real backend (an XHR request will be made to the
 *    server.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#whenGET
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition for GET requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#whenHEAD
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition for HEAD requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#whenDELETE
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition for DELETE requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#whenPOST
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition for POST requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#whenPUT
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition for PUT requests.  For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#whenPATCH
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition for PATCH requests.  For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name ngMockE2E.$httpBackend#whenJSONP
 * @methodOf ngMockE2E.$httpBackend
 * @description
 * Creates a new backend definition for JSONP requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */
angular.mock.e2e = {};
angular.mock.e2e.$httpBackendDecorator = ['$rootScope', '$delegate', '$browser', createHttpBackendMock];


angular.mock.clearDataCache = function() {
    var key,
        cache = angular.element.cache;

    for(key in cache) {
        if (cache.hasOwnProperty(key)) {
            var handle = cache[key].handle;

            handle && angular.element(handle.elem).unbind();
            delete cache[key];
        }
    }
};


window.jstestdriver && (function(window) {
    /**
     * Global method to output any number of objects into JSTD console. Useful for debugging.
     */
    window.dump = function() {
        var args = [];
        angular.forEach(arguments, function(arg) {
            args.push(angular.mock.dump(arg));
        });
        jstestdriver.console.log.apply(jstestdriver.console, args);
        if (window.console) {
            window.console.log.apply(window.console, args);
        }
    };
})(window);


(window.jasmine || window.mocha) && (function(window) {

    var currentSpec = null;

    beforeEach(function() {
        currentSpec = this;
    });

    afterEach(function() {
        var injector = currentSpec.$injector;

        currentSpec.$injector = null;
        currentSpec.$modules = null;
        currentSpec = null;

        if (injector) {
            injector.get('$rootElement').unbind();
            injector.get('$browser').pollFns.length = 0;
        }

        angular.mock.clearDataCache();

        // clean up jquery's fragment cache
        angular.forEach(angular.element.fragments, function(val, key) {
            delete angular.element.fragments[key];
        });

        MockXhr.$$lastInstance = null;

        angular.forEach(angular.callbacks, function(val, key) {
            delete angular.callbacks[key];
        });
        angular.callbacks.counter = 0;
    });

    function isSpecRunning() {
        return currentSpec && (window.mocha || currentSpec.queue.running);
    }

    /**
     * @ngdoc function
     * @name angular.mock.module
     * @description
     *
     * *NOTE*: This function is also published on window for easy access.<br>
     *
     * This function registers a module configuration code. It collects the configuration information
     * which will be used when the injector is created by {@link angular.mock.inject inject}.
     *
     * See {@link angular.mock.inject inject} for usage example
     *
     * @param {...(string|Function)} fns any number of modules which are represented as string
     *        aliases or as anonymous module initialization functions. The modules are used to
     *        configure the injector. The 'ng' and 'ngMock' modules are automatically loaded.
     */
    window.module = angular.mock.module = function() {
        var moduleFns = Array.prototype.slice.call(arguments, 0);
        return isSpecRunning() ? workFn() : workFn;
        /////////////////////
        function workFn() {
            if (currentSpec.$injector) {
                throw Error('Injector already created, can not register a module!');
            } else {
                var modules = currentSpec.$modules || (currentSpec.$modules = []);
                angular.forEach(moduleFns, function(module) {
                    modules.push(module);
                });
            }
        }
    };

    /**
     * @ngdoc function
     * @name angular.mock.inject
     * @description
     *
     * *NOTE*: This function is also published on window for easy access.<br>
     *
     * The inject function wraps a function into an injectable function. The inject() creates new
     * instance of {@link AUTO.$injector $injector} per test, which is then used for
     * resolving references.
     *
     * See also {@link angular.mock.module module}
     *
     * Example of what a typical jasmine tests looks like with the inject method.
     * <pre>
     *
     *   angular.module('myApplicationModule', [])
     *       .value('mode', 'app')
     *       .value('version', 'v1.0.1');
     *
     *
     *   describe('MyApp', function() {
   *
   *     // You need to load modules that you want to test,
   *     // it loads only the "ng" module by default.
   *     beforeEach(module('myApplicationModule'));
   *
   *
   *     // inject() is used to inject arguments of all given functions
   *     it('should provide a version', inject(function(mode, version) {
   *       expect(version).toEqual('v1.0.1');
   *       expect(mode).toEqual('app');
   *     }));
   *
   *
   *     // The inject and module method can also be used inside of the it or beforeEach
   *     it('should override a version and test the new version is injected', function() {
   *       // module() takes functions or strings (module aliases)
   *       module(function($provide) {
   *         $provide.value('version', 'overridden'); // override version here
   *       });
   *
   *       inject(function(version) {
   *         expect(version).toEqual('overridden');
   *       });
   *     ));
   *   });
   *
   * </pre>
   *
   * @param {...Function} fns any number of functions which will be injected using the injector.
     */
    window.inject = angular.mock.inject = function() {
        var blockFns = Array.prototype.slice.call(arguments, 0);
        var errorForStack = new Error('Declaration Location');
        return isSpecRunning() ? workFn() : workFn;
        /////////////////////
        function workFn() {
            var modules = currentSpec.$modules || [];

            modules.unshift('ngMock');
            modules.unshift('ng');
            var injector = currentSpec.$injector;
            if (!injector) {
                injector = currentSpec.$injector = angular.injector(modules);
            }
            for(var i = 0, ii = blockFns.length; i < ii; i++) {
                try {
                    injector.invoke(blockFns[i] || angular.noop, this);
                } catch (e) {
                    if(e.stack && errorForStack) e.stack +=  '\n' + errorForStack.stack;
                    throw e;
                } finally {
                    errorForStack = null;
                }
            }
        }
    };
})(window);
;/**
 * @license AngularJS v1.1.5
 * (c) 2010-2012 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {
    'use strict';

    /**
     * @ngdoc overview
     * @name ngResource
     * @description
     */

    /**
     * @ngdoc object
     * @name ngResource.$resource
     * @requires $http
     *
     * @description
     * A factory which creates a resource object that lets you interact with
     * [RESTful](http://en.wikipedia.org/wiki/Representational_State_Transfer) server-side data sources.
     *
     * The returned resource object has action methods which provide high-level behaviors without
     * the need to interact with the low level {@link ng.$http $http} service.
     *
     * # Installation
     * To use $resource make sure you have included the `angular-resource.js` that comes in Angular
     * package. You can also find this file on Google CDN, bower as well as at
     * {@link http://code.angularjs.org/ code.angularjs.org}.
     *
     * Finally load the module in your application:
     *
     *        angular.module('app', ['ngResource']);
     *
     * and you are ready to get started!
     *
     * @param {string} url A parametrized URL template with parameters prefixed by `:` as in
     *   `/user/:username`. If you are using a URL with a port number (e.g.
     *   `http://example.com:8080/api`), you'll need to escape the colon character before the port
     *   number, like this: `$resource('http://example.com\\:8080/api')`.
     *
     *   If you are using a url with a suffix, just add the suffix, like this:
     *   `$resource('http://example.com/resource.json')` or `$resource('http://example.com/:id.json')
     *   or even `$resource('http://example.com/resource/:resource_id.:format')`
     *   If the parameter before the suffix is empty, :resource_id in this case, then the `/.` will be
     *   collapsed down to a single `.`.  If you need this sequence to appear and not collapse then you
     *   can escape it with `/\.`.
     *
     * @param {Object=} paramDefaults Default values for `url` parameters. These can be overridden in
     *   `actions` methods. If any of the parameter value is a function, it will be executed every time
     *   when a param value needs to be obtained for a request (unless the param was overridden).
     *
     *   Each key value in the parameter object is first bound to url template if present and then any
     *   excess keys are appended to the url search query after the `?`.
     *
     *   Given a template `/path/:verb` and parameter `{verb:'greet', salutation:'Hello'}` results in
     *   URL `/path/greet?salutation=Hello`.
     *
     *   If the parameter value is prefixed with `@` then the value of that parameter is extracted from
     *   the data object (useful for non-GET operations).
     *
     * @param {Object.<Object>=} actions Hash with declaration of custom action that should extend the
     *   default set of resource actions. The declaration should be created in the format of {@link
     *   ng.$http#Parameters $http.config}:
     *
     *       {action1: {method:?, params:?, isArray:?, headers:?, ...},
 *        action2: {method:?, params:?, isArray:?, headers:?, ...},
 *        ...}
     *
     *   Where:
     *
     *   - **`action`** – {string} – The name of action. This name becomes the name of the method on your
     *     resource object.
     *   - **`method`** – {string} – HTTP request method. Valid methods are: `GET`, `POST`, `PUT`, `DELETE`,
     *     and `JSONP`.
     *   - **`params`** – {Object=} – Optional set of pre-bound parameters for this action. If any of the
     *     parameter value is a function, it will be executed every time when a param value needs to be
     *     obtained for a request (unless the param was overridden).
     *   - **`url`** – {string} – action specific `url` override. The url templating is supported just like
     *     for the resource-level urls.
     *   - **`isArray`** – {boolean=} – If true then the returned object for this action is an array, see
     *     `returns` section.
     *   - **`transformRequest`** – `{function(data, headersGetter)|Array.<function(data, headersGetter)>}` –
     *     transform function or an array of such functions. The transform function takes the http
     *     request body and headers and returns its transformed (typically serialized) version.
     *   - **`transformResponse`** – `{function(data, headersGetter)|Array.<function(data, headersGetter)>}` –
     *     transform function or an array of such functions. The transform function takes the http
     *     response body and headers and returns its transformed (typically deserialized) version.
     *   - **`cache`** – `{boolean|Cache}` – If true, a default $http cache will be used to cache the
     *     GET request, otherwise if a cache instance built with
     *     {@link ng.$cacheFactory $cacheFactory}, this cache will be used for
     *     caching.
     *   - **`timeout`** – `{number|Promise}` – timeout in milliseconds, or {@link ng.$q promise} that
     *     should abort the request when resolved.
     *   - **`withCredentials`** - `{boolean}` - whether to to set the `withCredentials` flag on the
     *     XHR object. See {@link https://developer.mozilla.org/en/http_access_control#section_5
     *     requests with credentials} for more information.
     *   - **`responseType`** - `{string}` - see {@link
     *     https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#responseType requestType}.
     *
     * @returns {Object} A resource "class" object with methods for the default set of resource actions
     *   optionally extended with custom `actions`. The default set contains these actions:
     *
     *       { 'get':    {method:'GET'},
 *         'save':   {method:'POST'},
 *         'query':  {method:'GET', isArray:true},
 *         'remove': {method:'DELETE'},
 *         'delete': {method:'DELETE'} };
     *
     *   Calling these methods invoke an {@link ng.$http} with the specified http method,
     *   destination and parameters. When the data is returned from the server then the object is an
     *   instance of the resource class. The actions `save`, `remove` and `delete` are available on it
     *   as  methods with the `$` prefix. This allows you to easily perform CRUD operations (create,
     *   read, update, delete) on server-side data like this:
     *   <pre>
     var User = $resource('/user/:userId', {userId:'@id'});
     var user = User.get({userId:123}, function() {
          user.abc = true;
          user.$save();
        });
     </pre>
     *
     *   It is important to realize that invoking a $resource object method immediately returns an
     *   empty reference (object or array depending on `isArray`). Once the data is returned from the
     *   server the existing reference is populated with the actual data. This is a useful trick since
     *   usually the resource is assigned to a model which is then rendered by the view. Having an empty
     *   object results in no rendering, once the data arrives from the server then the object is
     *   populated with the data and the view automatically re-renders itself showing the new data. This
     *   means that in most case one never has to write a callback function for the action methods.
     *
     *   The action methods on the class object or instance object can be invoked with the following
     *   parameters:
     *
     *   - HTTP GET "class" actions: `Resource.action([parameters], [success], [error])`
     *   - non-GET "class" actions: `Resource.action([parameters], postData, [success], [error])`
     *   - non-GET instance actions:  `instance.$action([parameters], [success], [error])`
     *
     *
     *   The Resource instances and collection have these additional properties:
     *
     *   - `$then`: the `then` method of a {@link ng.$q promise} derived from the underlying
     *     {@link ng.$http $http} call.
     *
     *     The success callback for the `$then` method will be resolved if the underlying `$http` requests
     *     succeeds.
     *
     *     The success callback is called with a single object which is the {@link ng.$http http response}
     *     object extended with a new property `resource`. This `resource` property is a reference to the
     *     result of the resource action — resource object or array of resources.
     *
     *     The error callback is called with the {@link ng.$http http response} object when an http
     *     error occurs.
     *
     *   - `$resolved`: true if the promise has been resolved (either with success or rejection);
     *     Knowing if the Resource has been resolved is useful in data-binding.
     *
     * @example
     *
     * # Credit card resource
     *
     * <pre>
     // Define CreditCard class
     var CreditCard = $resource('/user/:userId/card/:cardId',
     {userId:123, cardId:'@id'}, {
       charge: {method:'POST', params:{charge:true}}
      });

     // We can retrieve a collection from the server
     var cards = CreditCard.query(function() {
       // GET: /user/123/card
       // server returns: [ {id:456, number:'1234', name:'Smith'} ];

       var card = cards[0];
       // each item is an instance of CreditCard
       expect(card instanceof CreditCard).toEqual(true);
       card.name = "J. Smith";
       // non GET methods are mapped onto the instances
       card.$save();
       // POST: /user/123/card/456 {id:456, number:'1234', name:'J. Smith'}
       // server returns: {id:456, number:'1234', name: 'J. Smith'};

       // our custom method is mapped as well.
       card.$charge({amount:9.99});
       // POST: /user/123/card/456?amount=9.99&charge=true {id:456, number:'1234', name:'J. Smith'}
     });

     // we can create an instance as well
     var newCard = new CreditCard({number:'0123'});
     newCard.name = "Mike Smith";
     newCard.$save();
     // POST: /user/123/card {number:'0123', name:'Mike Smith'}
     // server returns: {id:789, number:'01234', name: 'Mike Smith'};
     expect(newCard.id).toEqual(789);
     * </pre>
     *
     * The object returned from this function execution is a resource "class" which has "static" method
     * for each action in the definition.
     *
     * Calling these methods invoke `$http` on the `url` template with the given `method`, `params` and `headers`.
     * When the data is returned from the server then the object is an instance of the resource type and
     * all of the non-GET methods are available with `$` prefix. This allows you to easily support CRUD
     * operations (create, read, update, delete) on server-side data.

     <pre>
     var User = $resource('/user/:userId', {userId:'@id'});
     var user = User.get({userId:123}, function() {
       user.abc = true;
       user.$save();
     });
     </pre>
     *
     * It's worth noting that the success callback for `get`, `query` and other method gets passed
     * in the response that came from the server as well as $http header getter function, so one
     * could rewrite the above example and get access to http headers as:
     *
     <pre>
     var User = $resource('/user/:userId', {userId:'@id'});
     User.get({userId:123}, function(u, getResponseHeaders){
       u.abc = true;
       u.$save(function(u, putResponseHeaders) {
         //u => saved user object
         //putResponseHeaders => $http header getter
       });
     });
     </pre>

     * # Buzz client

     Let's look at what a buzz client created with the `$resource` service looks like:
     <doc:example>
     <doc:source jsfiddle="false">
     <script>
     function BuzzController($resource) {
           this.userId = 'googlebuzz';
           this.Activity = $resource(
             'https://www.googleapis.com/buzz/v1/activities/:userId/:visibility/:activityId/:comments',
             {alt:'json', callback:'JSON_CALLBACK'},
             {get:{method:'JSONP', params:{visibility:'@self'}}, replies: {method:'JSONP', params:{visibility:'@self', comments:'@comments'}}}
     );
     }

     BuzzController.prototype = {
           fetch: function() {
             this.activities = this.Activity.get({userId:this.userId});
           },
           expandReplies: function(activity) {
             activity.replies = this.Activity.replies({userId:this.userId, activityId:activity.id});
           }
         };
     BuzzController.$inject = ['$resource'];
     </script>

     <div ng-controller="BuzzController">
     <input ng-model="userId"/>
     <button ng-click="fetch()">fetch</button>
     <hr/>
     <div ng-repeat="item in activities.data.items">
     <h1 style="font-size: 15px;">
     <img src="{{item.actor.thumbnailUrl}}" style="max-height:30px;max-width:30px;"/>
     <a href="{{item.actor.profileUrl}}">{{item.actor.name}}</a>
     <a href ng-click="expandReplies(item)" style="float: right;">Expand replies: {{item.links.replies[0].count}}</a>
     </h1>
     {{item.object.content | html}}
     <div ng-repeat="reply in item.replies.data.items" style="margin-left: 20px;">
     <img src="{{reply.actor.thumbnailUrl}}" style="max-height:30px;max-width:30px;"/>
     <a href="{{reply.actor.profileUrl}}">{{reply.actor.name}}</a>: {{reply.content | html}}
     </div>
     </div>
     </div>
     </doc:source>
     <doc:scenario>
     </doc:scenario>
     </doc:example>
     */
    angular.module('ngResource', ['ng']).
        factory('$resource', ['$http', '$parse', function($http, $parse) {
            var DEFAULT_ACTIONS = {
                'get':    {method:'GET'},
                'save':   {method:'POST'},
                'query':  {method:'GET', isArray:true},
                'remove': {method:'DELETE'},
                'delete': {method:'DELETE'}
            };
            var noop = angular.noop,
                forEach = angular.forEach,
                extend = angular.extend,
                copy = angular.copy,
                isFunction = angular.isFunction,
                getter = function(obj, path) {
                    return $parse(path)(obj);
                };

            /**
             * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
             * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
             * segments:
             *    segment       = *pchar
             *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
             *    pct-encoded   = "%" HEXDIG HEXDIG
             *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
             *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
             *                     / "*" / "+" / "," / ";" / "="
             */
            function encodeUriSegment(val) {
                return encodeUriQuery(val, true).
                    replace(/%26/gi, '&').
                    replace(/%3D/gi, '=').
                    replace(/%2B/gi, '+');
            }


            /**
             * This method is intended for encoding *key* or *value* parts of query component. We need a custom
             * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
             * encoded per http://tools.ietf.org/html/rfc3986:
             *    query       = *( pchar / "/" / "?" )
             *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
             *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
             *    pct-encoded   = "%" HEXDIG HEXDIG
             *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
             *                     / "*" / "+" / "," / ";" / "="
             */
            function encodeUriQuery(val, pctEncodeSpaces) {
                return encodeURIComponent(val).
                    replace(/%40/gi, '@').
                    replace(/%3A/gi, ':').
                    replace(/%24/g, '$').
                    replace(/%2C/gi, ',').
                    replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
            }

            function Route(template, defaults) {
                this.template = template;
                this.defaults = defaults || {};
                this.urlParams = {};
            }

            Route.prototype = {
                setUrlParams: function(config, params, actionUrl) {
                    var self = this,
                        url = actionUrl || self.template,
                        val,
                        encodedVal;

                    var urlParams = self.urlParams = {};
                    forEach(url.split(/\W/), function(param){
                        if (param && (new RegExp("(^|[^\\\\]):" + param + "(\\W|$)").test(url))) {
                            urlParams[param] = true;
                        }
                    });
                    url = url.replace(/\\:/g, ':');

                    params = params || {};
                    forEach(self.urlParams, function(_, urlParam){
                        val = params.hasOwnProperty(urlParam) ? params[urlParam] : self.defaults[urlParam];
                        if (angular.isDefined(val) && val !== null) {
                            encodedVal = encodeUriSegment(val);
                            url = url.replace(new RegExp(":" + urlParam + "(\\W|$)", "g"), encodedVal + "$1");
                        } else {
                            url = url.replace(new RegExp("(\/?):" + urlParam + "(\\W|$)", "g"), function(match,
                                                                                                         leadingSlashes, tail) {
                                if (tail.charAt(0) == '/') {
                                    return tail;
                                } else {
                                    return leadingSlashes + tail;
                                }
                            });
                        }
                    });

                    // strip trailing slashes and set the url
                    url = url.replace(/\/+$/, '');
                    // then replace collapse `/.` if found in the last URL path segment before the query
                    // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
                    url = url.replace(/\/\.(?=\w+($|\?))/, '.');
                    // replace escaped `/\.` with `/.`
                    config.url = url.replace(/\/\\\./, '/.');


                    // set params - delegate param encoding to $http
                    forEach(params, function(value, key){
                        if (!self.urlParams[key]) {
                            config.params = config.params || {};
                            config.params[key] = value;
                        }
                    });
                }
            };


            function ResourceFactory(url, paramDefaults, actions) {
                var route = new Route(url);

                actions = extend({}, DEFAULT_ACTIONS, actions);

                function extractParams(data, actionParams){
                    var ids = {};
                    actionParams = extend({}, paramDefaults, actionParams);
                    forEach(actionParams, function(value, key){
                        if (isFunction(value)) { value = value(); }
                        ids[key] = value && value.charAt && value.charAt(0) == '@' ? getter(data, value.substr(1)) : value;
                    });
                    return ids;
                }

                function Resource(value){
                    copy(value || {}, this);
                }

                forEach(actions, function(action, name) {
                    action.method = angular.uppercase(action.method);
                    var hasBody = action.method == 'POST' || action.method == 'PUT' || action.method == 'PATCH';
                    Resource[name] = function(a1, a2, a3, a4) {
                        var params = {};
                        var data;
                        var success = noop;
                        var error = null;
                        var promise;

                        switch(arguments.length) {
                            case 4:
                                error = a4;
                                success = a3;
                            //fallthrough
                            case 3:
                            case 2:
                                if (isFunction(a2)) {
                                    if (isFunction(a1)) {
                                        success = a1;
                                        error = a2;
                                        break;
                                    }

                                    success = a2;
                                    error = a3;
                                    //fallthrough
                                } else {
                                    params = a1;
                                    data = a2;
                                    success = a3;
                                    break;
                                }
                            case 1:
                                if (isFunction(a1)) success = a1;
                                else if (hasBody) data = a1;
                                else params = a1;
                                break;
                            case 0: break;
                            default:
                                throw "Expected between 0-4 arguments [params, data, success, error], got " +
                                    arguments.length + " arguments.";
                        }

                        var value = this instanceof Resource ? this : (action.isArray ? [] : new Resource(data));
                        var httpConfig = {},
                            promise;

                        forEach(action, function(value, key) {
                            if (key != 'params' && key != 'isArray' ) {
                                httpConfig[key] = copy(value);
                            }
                        });
                        httpConfig.data = data;
                        route.setUrlParams(httpConfig, extend({}, extractParams(data, action.params || {}), params), action.url);

                        function markResolved() { value.$resolved = true; }

                        promise = $http(httpConfig);
                        value.$resolved = false;

                        promise.then(markResolved, markResolved);
                        value.$then = promise.then(function(response) {
                            var data = response.data;
                            var then = value.$then, resolved = value.$resolved;

                            if (data) {
                                if (action.isArray) {
                                    value.length = 0;
                                    forEach(data, function(item) {
                                        value.push(new Resource(item));
                                    });
                                } else {
                                    copy(data, value);
                                    value.$then = then;
                                    value.$resolved = resolved;
                                }
                            }

                            (success||noop)(value, response.headers);

                            response.resource = value;
                            return response;
                        }, error).then;

                        return value;
                    };


                    Resource.prototype['$' + name] = function(a1, a2, a3) {
                        var params = extractParams(this),
                            success = noop,
                            error;

                        switch(arguments.length) {
                            case 3: params = a1; success = a2; error = a3; break;
                            case 2:
                            case 1:
                                if (isFunction(a1)) {
                                    success = a1;
                                    error = a2;
                                } else {
                                    params = a1;
                                    success = a2 || noop;
                                }
                            case 0: break;
                            default:
                                throw "Expected between 1-3 arguments [params, success, error], got " +
                                    arguments.length + " arguments.";
                        }
                        var data = hasBody ? this : undefined;
                        Resource[name].call(this, params, data, success, error);
                    };
                });

                Resource.bind = function(additionalParamDefaults){
                    return ResourceFactory(url, extend({}, paramDefaults, additionalParamDefaults), actions);
                };

                return Resource;
            }

            return ResourceFactory;
        }]);


})(window, window.angular);;/**
 * AngularUI - The companion suite for AngularJS
 * @version v0.4.0 - 2013-02-15
 * @link http://angular-ui.github.com
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */


angular.module('ui.config', []).value('ui.config', {});
angular.module('ui.filters', ['ui.config']);
angular.module('ui.directives', ['ui.config']);
angular.module('ui', ['ui.filters', 'ui.directives', 'ui.config']);

/**
 * Animates the injection of new DOM elements by simply creating the DOM with a class and then immediately removing it
 * Animations must be done using CSS3 transitions, but provide excellent flexibility
 *
 * @todo Add proper support for animating out
 * @param [options] {mixed} Can be an object with multiple options, or a string with the animation class
 *    class {string} the CSS class(es) to use. For example, 'ui-hide' might be an excellent alternative class.
 * @example <li ng-repeat="item in items" ui-animate=" 'ui-hide' ">{{item}}</li>
 */
angular.module('ui.directives').directive('uiAnimate', ['ui.config', '$timeout', function (uiConfig, $timeout) {
  var options = {};
  if (angular.isString(uiConfig.animate)) {
    options['class'] = uiConfig.animate;
  } else if (uiConfig.animate) {
    options = uiConfig.animate;
  }
  return {
    restrict: 'A', // supports using directive as element, attribute and class
    link: function ($scope, element, attrs) {
      var opts = {};
      if (attrs.uiAnimate) {
        opts = $scope.$eval(attrs.uiAnimate);
        if (angular.isString(opts)) {
          opts = {'class': opts};
        }
      }
      opts = angular.extend({'class': 'ui-animate'}, options, opts);

      element.addClass(opts['class']);
      $timeout(function () {
        element.removeClass(opts['class']);
      }, 20, false);
    }
  };
}]);


/*
*  AngularJs Fullcalendar Wrapper for the JQuery FullCalendar
*  API @ http://arshaw.com/fullcalendar/ 
*  
*  Angular Calendar Directive that takes in the [eventSources] nested array object as the ng-model and watches (eventSources.length + eventSources[i].length) for changes. 
*       Can also take in multiple event urls as a source object(s) and feed the events per view.
*       The calendar will watch any eventSource array and update itself when a delta is created  
*       An equalsTracker attrs has been added for use cases that would render the overall length tracker the same even though the events have changed to force updates.
*
*/

angular.module('ui.directives').directive('uiCalendar',['ui.config', '$parse', function (uiConfig,$parse) {
     uiConfig.uiCalendar = uiConfig.uiCalendar || {};       
     //returns calendar     
     return {
        require: 'ngModel',
        restrict: 'A',
          link: function(scope, elm, attrs, $timeout) {
            var sources = scope.$eval(attrs.ngModel);
            var tracker = 0;
            /* returns the length of all source arrays plus the length of eventSource itself */
            var getSources = function () {
              var equalsTracker = scope.$eval(attrs.equalsTracker);
              tracker = 0;
              angular.forEach(sources,function(value,key){
                if(angular.isArray(value)){
                  tracker += value.length;
                }
              });
               if(angular.isNumber(equalsTracker)){
                return tracker + sources.length + equalsTracker;
               }else{
                return tracker + sources.length;
              }
            };
            /* update the calendar with the correct options */
            function update() {
              //calendar object exposed on scope
              scope.calendar = elm.html('');
              var view = scope.calendar.fullCalendar('getView');
              if(view){
                view = view.name; //setting the default view to be whatever the current view is. This can be overwritten. 
              }
              /* If the calendar has options added then render them */
              var expression,
                options = {
                  defaultView : view,
                  eventSources: sources
                };
              if (attrs.uiCalendar) {
                expression = scope.$eval(attrs.uiCalendar);
              } else {
                expression = {};
              }
              angular.extend(options, uiConfig.uiCalendar, expression);
              scope.calendar.fullCalendar(options);
            }
            update();
              /* watches all eventSources */
              scope.$watch(getSources, function( newVal, oldVal )
              {
                update();
              });
         }
    };
}]);
/*global angular, CodeMirror, Error*/
/**
 * Binds a CodeMirror widget to a <textarea> element.
 */
angular.module('ui.directives').directive('uiCodemirror', ['ui.config', '$timeout', function (uiConfig, $timeout) {
	'use strict';

	var events = ["cursorActivity", "viewportChange", "gutterClick", "focus", "blur", "scroll", "update"];
	return {
		restrict:'A',
		require:'ngModel',
		link:function (scope, elm, attrs, ngModel) {
			var options, opts, onChange, deferCodeMirror, codeMirror;

			if (elm[0].type !== 'textarea') {
				throw new Error('uiCodemirror3 can only be applied to a textarea element');
			}

			options = uiConfig.codemirror || {};
			opts = angular.extend({}, options, scope.$eval(attrs.uiCodemirror));

			onChange = function (aEvent) {
				return function (instance, changeObj) {
					var newValue = instance.getValue();
					if (newValue !== ngModel.$viewValue) {
						ngModel.$setViewValue(newValue);
						scope.$apply();
					}
					if (typeof aEvent === "function")
						aEvent(instance, changeObj);
				};
			};

			deferCodeMirror = function () {
				codeMirror = CodeMirror.fromTextArea(elm[0], opts);
				codeMirror.on("change", onChange(opts.onChange));

				for (var i = 0, n = events.length, aEvent; i < n; ++i) {
					aEvent = opts["on" + events[i].charAt(0).toUpperCase() + events[i].slice(1)];
					if (aEvent === void 0) continue;
					if (typeof aEvent !== "function") continue;
					codeMirror.on(events[i], aEvent);
				}

				// CodeMirror expects a string, so make sure it gets one.
				// This does not change the model.
				ngModel.$formatters.push(function (value) {
					if (angular.isUndefined(value) || value === null) {
						return '';
					}
					else if (angular.isObject(value) || angular.isArray(value)) {
						throw new Error('ui-codemirror cannot use an object or an array as a model');
					}
					return value;
				});

				// Override the ngModelController $render method, which is what gets called when the model is updated.
				// This takes care of the synchronizing the codeMirror element with the underlying model, in the case that it is changed by something else.
				ngModel.$render = function () {
					codeMirror.setValue(ngModel.$viewValue);
				};

				// Watch ui-refresh and refresh the directive
				if (attrs.uiRefresh) {
					scope.$watch(attrs.uiRefresh, function(newVal, oldVal){
						// Skip the initial watch firing
						if (newVal !== oldVal)
							$timeout(codeMirror.refresh);
					});
				}
			};

			$timeout(deferCodeMirror);

		}
	};
}]);

/*
 Gives the ability to style currency based on its sign.
 */
angular.module('ui.directives').directive('uiCurrency', ['ui.config', 'currencyFilter' , function (uiConfig, currencyFilter) {
  var options = {
    pos: 'ui-currency-pos',
    neg: 'ui-currency-neg',
    zero: 'ui-currency-zero'
  };
  if (uiConfig.currency) {
    angular.extend(options, uiConfig.currency);
  }
  return {
    restrict: 'EAC',
    require: 'ngModel',
    link: function (scope, element, attrs, controller) {
      var opts, // instance-specific options
        renderview,
        value;

      opts = angular.extend({}, options, scope.$eval(attrs.uiCurrency));

      renderview = function (viewvalue) {
        var num;
        num = viewvalue * 1;
        element.toggleClass(opts.pos, (num > 0) );
        element.toggleClass(opts.neg, (num < 0) );
        element.toggleClass(opts.zero, (num === 0) );
        if (viewvalue === '') {
          element.text('');
        } else {
          element.text(currencyFilter(num, opts.symbol));
        }
        return true;
      };

      controller.$render = function () {
        value = controller.$viewValue;
        element.val(value);
        renderview(value);
      };

    }
  };
}]);

/*global angular */
/*
 jQuery UI Datepicker plugin wrapper

 @note If ≤ IE8 make sure you have a polyfill for Date.toISOString()
 @param [ui-date] {object} Options to pass to $.fn.datepicker() merged onto ui.config
 */

angular.module('ui.directives')

.directive('uiDate', ['ui.config', function (uiConfig) {
  'use strict';
  var options;
  options = {};
  if (angular.isObject(uiConfig.date)) {
    angular.extend(options, uiConfig.date);
  }
  return {
    require:'?ngModel',
    link:function (scope, element, attrs, controller) {
      var getOptions = function () {
        return angular.extend({}, uiConfig.date, scope.$eval(attrs.uiDate));
      };
      var initDateWidget = function () {
        var opts = getOptions();

        // If we have a controller (i.e. ngModelController) then wire it up
        if (controller) {
          var updateModel = function () {
            scope.$apply(function () {
              var date = element.datepicker("getDate");
              element.datepicker("setDate", element.val());
              controller.$setViewValue(date);
              element.blur();
            });
          };
          if (opts.onSelect) {
            // Caller has specified onSelect, so call this as well as updating the model
            var userHandler = opts.onSelect;
            opts.onSelect = function (value, picker) {
              updateModel();
              scope.$apply(function() {
                userHandler(value, picker);
              });
            };
          } else {
            // No onSelect already specified so just update the model
            opts.onSelect = updateModel;
          }
          // In case the user changes the text directly in the input box
          element.bind('change', updateModel);

          // Update the date picker when the model changes
          controller.$render = function () {
            var date = controller.$viewValue;
            if ( angular.isDefined(date) && date !== null && !angular.isDate(date) ) {
              throw new Error('ng-Model value must be a Date object - currently it is a ' + typeof date + ' - use ui-date-format to convert it from a string');
            }
            element.datepicker("setDate", date);
          };
        }
        // If we don't destroy the old one it doesn't update properly when the config changes
        element.datepicker('destroy');
        // Create the new datepicker widget
        element.datepicker(opts);
        if ( controller ) {
          // Force a render to override whatever is in the input text box
          controller.$render();
        }
      };
      // Watch for changes to the directives options
      scope.$watch(getOptions, initDateWidget, true);
    }
  };
}
])

.directive('uiDateFormat', ['ui.config', function(uiConfig) {
  var directive = {
    require:'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      var dateFormat = attrs.uiDateFormat || uiConfig.dateFormat;
      if ( dateFormat ) {
        // Use the datepicker with the attribute value as the dateFormat string to convert to and from a string
        modelCtrl.$formatters.push(function(value) {
          if (angular.isString(value) ) {
            return $.datepicker.parseDate(dateFormat, value);
          }
        });
        modelCtrl.$parsers.push(function(value){
          if (value) {
            return $.datepicker.formatDate(dateFormat, value);
          }
        });
      } else {
        // Default to ISO formatting
        modelCtrl.$formatters.push(function(value) {
          if (angular.isString(value) ) {
            return new Date(value);
          }
        });
        modelCtrl.$parsers.push(function(value){
          if (value) {
            return value.toISOString();
          }
        });
      }
    }
  };
  return directive;
}]);

/**
 * General-purpose Event binding. Bind any event not natively supported by Angular
 * Pass an object with keynames for events to ui-event
 * Allows $event object and $params object to be passed
 *
 * @example <input ui-event="{ focus : 'counter++', blur : 'someCallback()' }">
 * @example <input ui-event="{ myCustomEvent : 'myEventHandler($event, $params)'}">
 *
 * @param ui-event {string|object literal} The event to bind to as a string or a hash of events with their callbacks
 */
angular.module('ui.directives').directive('uiEvent', ['$parse',
  function ($parse) {
    return function (scope, elm, attrs) {
      var events = scope.$eval(attrs.uiEvent);
      angular.forEach(events, function (uiEvent, eventName) {
        var fn = $parse(uiEvent);
        elm.bind(eventName, function (evt) {
          var params = Array.prototype.slice.call(arguments);
          //Take out first paramater (event object);
          params = params.splice(1);
          scope.$apply(function () {
            fn(scope, {$event: evt, $params: params});
          });
        });
      });
    };
  }]);

/*
 * Defines the ui-if tag. This removes/adds an element from the dom depending on a condition
 * Originally created by @tigbro, for the @jquery-mobile-angular-adapter
 * https://github.com/tigbro/jquery-mobile-angular-adapter
 */
angular.module('ui.directives').directive('uiIf', [function () {
  return {
    transclude: 'element',
    priority: 1000,
    terminal: true,
    restrict: 'A',
    compile: function (element, attr, transclude) {
      return function (scope, element, attr) {

        var childElement;
        var childScope;
 
        scope.$watch(attr['uiIf'], function (newValue) {
          if (childElement) {
            childElement.remove();
            childElement = undefined;
          }
          if (childScope) {
            childScope.$destroy();
            childScope = undefined;
          }

          if (newValue) {
            childScope = scope.$new();
            transclude(childScope, function (clone) {
              childElement = clone;
              element.after(clone);
            });
          }
        });
      };
    }
  };
}]);
/**
 * General-purpose jQuery wrapper. Simply pass the plugin name as the expression.
 *
 * It is possible to specify a default set of parameters for each jQuery plugin.
 * Under the jq key, namespace each plugin by that which will be passed to ui-jq.
 * Unfortunately, at this time you can only pre-define the first parameter.
 * @example { jq : { datepicker : { showOn:'click' } } }
 *
 * @param ui-jq {string} The $elm.[pluginName]() to call.
 * @param [ui-options] {mixed} Expression to be evaluated and passed as options to the function
 *     Multiple parameters can be separated by commas
 * @param [ui-refresh] {expression} Watch expression and refire plugin on changes
 *
 * @example <input ui-jq="datepicker" ui-options="{showOn:'click'},secondParameter,thirdParameter" ui-refresh="iChange">
 */
angular.module('ui.directives').directive('uiJq', ['ui.config', '$timeout', function uiJqInjectingFunction(uiConfig, $timeout) {

  return {
    restrict: 'A',
    compile: function uiJqCompilingFunction(tElm, tAttrs) {

      if (!angular.isFunction(tElm[tAttrs.uiJq])) {
        throw new Error('ui-jq: The "' + tAttrs.uiJq + '" function does not exist');
      }
      var options = uiConfig.jq && uiConfig.jq[tAttrs.uiJq];

      return function uiJqLinkingFunction(scope, elm, attrs) {

        var linkOptions = [];

        // If ui-options are passed, merge (or override) them onto global defaults and pass to the jQuery method
        if (attrs.uiOptions) {
          linkOptions = scope.$eval('[' + attrs.uiOptions + ']');
          if (angular.isObject(options) && angular.isObject(linkOptions[0])) {
            linkOptions[0] = angular.extend({}, options, linkOptions[0]);
          }
        } else if (options) {
          linkOptions = [options];
        }
        // If change compatibility is enabled, the form input's "change" event will trigger an "input" event
        if (attrs.ngModel && elm.is('select,input,textarea')) {
          elm.on('change', function() {
            elm.trigger('input');
          });
        }

        // Call jQuery method and pass relevant options
        function callPlugin() {
          $timeout(function() {
            elm[attrs.uiJq].apply(elm, linkOptions);
          }, 0, false);
        }

        // If ui-refresh is used, re-fire the the method upon every change
        if (attrs.uiRefresh) {
          scope.$watch(attrs.uiRefresh, function(newVal) {
            callPlugin();
          });
        }
        callPlugin();
      };
    }
  };
}]);

angular.module('ui.directives').factory('keypressHelper', ['$parse', function keypress($parse){
  var keysByCode = {
    8: 'backspace',
    9: 'tab',
    13: 'enter',
    27: 'esc',
    32: 'space',
    33: 'pageup',
    34: 'pagedown',
    35: 'end',
    36: 'home',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    45: 'insert',
    46: 'delete'
  };

  var capitaliseFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return function(mode, scope, elm, attrs) {
    var params, combinations = [];
    params = scope.$eval(attrs['ui'+capitaliseFirstLetter(mode)]);

    // Prepare combinations for simple checking
    angular.forEach(params, function (v, k) {
      var combination, expression;
      expression = $parse(v);

      angular.forEach(k.split(' '), function(variation) {
        combination = {
          expression: expression,
          keys: {}
        };
        angular.forEach(variation.split('-'), function (value) {
          combination.keys[value] = true;
        });
        combinations.push(combination);
      });
    });

    // Check only matching of pressed keys one of the conditions
    elm.bind(mode, function (event) {
      // No need to do that inside the cycle
      var altPressed = event.metaKey || event.altKey;
      var ctrlPressed = event.ctrlKey;
      var shiftPressed = event.shiftKey;
      var keyCode = event.keyCode;

      // normalize keycodes
      if (mode === 'keypress' && !shiftPressed && keyCode >= 97 && keyCode <= 122) {
        keyCode = keyCode - 32;
      }

      // Iterate over prepared combinations
      angular.forEach(combinations, function (combination) {

        var mainKeyPressed = (combination.keys[keysByCode[event.keyCode]] || combination.keys[event.keyCode.toString()]) || false;

        var altRequired = combination.keys.alt || false;
        var ctrlRequired = combination.keys.ctrl || false;
        var shiftRequired = combination.keys.shift || false;

        if (
          mainKeyPressed &&
          ( altRequired == altPressed ) &&
          ( ctrlRequired == ctrlPressed ) &&
          ( shiftRequired == shiftPressed )
        ) {
          // Run the function
          scope.$apply(function () {
            combination.expression(scope, { '$event': event });
          });
        }
      });
    });
  };
}]);

/**
 * Bind one or more handlers to particular keys or their combination
 * @param hash {mixed} keyBindings Can be an object or string where keybinding expression of keys or keys combinations and AngularJS Exspressions are set. Object syntax: "{ keys1: expression1 [, keys2: expression2 [ , ... ]]}". String syntax: ""expression1 on keys1 [ and expression2 on keys2 [ and ... ]]"". Expression is an AngularJS Expression, and key(s) are dash-separated combinations of keys and modifiers (one or many, if any. Order does not matter). Supported modifiers are 'ctrl', 'shift', 'alt' and key can be used either via its keyCode (13 for Return) or name. Named keys are 'backspace', 'tab', 'enter', 'esc', 'space', 'pageup', 'pagedown', 'end', 'home', 'left', 'up', 'right', 'down', 'insert', 'delete'.
 * @example <input ui-keypress="{enter:'x = 1', 'ctrl-shift-space':'foo()', 'shift-13':'bar()'}" /> <input ui-keypress="foo = 2 on ctrl-13 and bar('hello') on shift-esc" />
 **/
angular.module('ui.directives').directive('uiKeydown', ['keypressHelper', function(keypressHelper){
  return {
    link: function (scope, elm, attrs) {
      keypressHelper('keydown', scope, elm, attrs);
    }
  };
}]);

angular.module('ui.directives').directive('uiKeypress', ['keypressHelper', function(keypressHelper){
  return {
    link: function (scope, elm, attrs) {
      keypressHelper('keypress', scope, elm, attrs);
    }
  };
}]);

angular.module('ui.directives').directive('uiKeyup', ['keypressHelper', function(keypressHelper){
  return {
    link: function (scope, elm, attrs) {
      keypressHelper('keyup', scope, elm, attrs);
    }
  };
}]);
(function () {
  var app = angular.module('ui.directives');

  //Setup map events from a google map object to trigger on a given element too,
  //then we just use ui-event to catch events from an element
  function bindMapEvents(scope, eventsStr, googleObject, element) {
    angular.forEach(eventsStr.split(' '), function (eventName) {
      //Prefix all googlemap events with 'map-', so eg 'click' 
      //for the googlemap doesn't interfere with a normal 'click' event
      var $event = { type: 'map-' + eventName };
      google.maps.event.addListener(googleObject, eventName, function (evt) {
        element.triggerHandler(angular.extend({}, $event, evt));
        //We create an $apply if it isn't happening. we need better support for this
        //We don't want to use timeout because tons of these events fire at once,
        //and we only need one $apply
        if (!scope.$$phase) scope.$apply();
      });
    });
  }

  app.directive('uiMap',
    ['ui.config', '$parse', function (uiConfig, $parse) {

      var mapEvents = 'bounds_changed center_changed click dblclick drag dragend ' +
        'dragstart heading_changed idle maptypeid_changed mousemove mouseout ' +
        'mouseover projection_changed resize rightclick tilesloaded tilt_changed ' +
        'zoom_changed';
      var options = uiConfig.map || {};

      return {
        restrict: 'A',
        //doesn't work as E for unknown reason
        link: function (scope, elm, attrs) {
          var opts = angular.extend({}, options, scope.$eval(attrs.uiOptions));
          var map = new google.maps.Map(elm[0], opts);
          var model = $parse(attrs.uiMap);

          //Set scope variable for the map
          model.assign(scope, map);

          bindMapEvents(scope, mapEvents, map, elm);
        }
      };
    }]);

  app.directive('uiMapInfoWindow',
    ['ui.config', '$parse', '$compile', function (uiConfig, $parse, $compile) {

      var infoWindowEvents = 'closeclick content_change domready ' +
        'position_changed zindex_changed';
      var options = uiConfig.mapInfoWindow || {};

      return {
        link: function (scope, elm, attrs) {
          var opts = angular.extend({}, options, scope.$eval(attrs.uiOptions));
          opts.content = elm[0];
          var model = $parse(attrs.uiMapInfoWindow);
          var infoWindow = model(scope);

          if (!infoWindow) {
            infoWindow = new google.maps.InfoWindow(opts);
            model.assign(scope, infoWindow);
          }

          bindMapEvents(scope, infoWindowEvents, infoWindow, elm);

          /* The info window's contents dont' need to be on the dom anymore,
           google maps has them stored.  So we just replace the infowindow element
           with an empty div. (we don't just straight remove it from the dom because
           straight removing things from the dom can mess up angular) */
          elm.replaceWith('<div></div>');

          //Decorate infoWindow.open to $compile contents before opening
          var _open = infoWindow.open;
          infoWindow.open = function open(a1, a2, a3, a4, a5, a6) {
            $compile(elm.contents())(scope);
            _open.call(infoWindow, a1, a2, a3, a4, a5, a6);
          };
        }
      };
    }]);

  /* 
   * Map overlay directives all work the same. Take map marker for example
   * <ui-map-marker="myMarker"> will $watch 'myMarker' and each time it changes,
   * it will hook up myMarker's events to the directive dom element.  Then
   * ui-event will be able to catch all of myMarker's events. Super simple.
   */
  function mapOverlayDirective(directiveName, events) {
    app.directive(directiveName, [function () {
      return {
        restrict: 'A',
        link: function (scope, elm, attrs) {
          scope.$watch(attrs[directiveName], function (newObject) {
            bindMapEvents(scope, events, newObject, elm);
          });
        }
      };
    }]);
  }

  mapOverlayDirective('uiMapMarker',
    'animation_changed click clickable_changed cursor_changed ' +
      'dblclick drag dragend draggable_changed dragstart flat_changed icon_changed ' +
      'mousedown mouseout mouseover mouseup position_changed rightclick ' +
      'shadow_changed shape_changed title_changed visible_changed zindex_changed');

  mapOverlayDirective('uiMapPolyline',
    'click dblclick mousedown mousemove mouseout mouseover mouseup rightclick');

  mapOverlayDirective('uiMapPolygon',
    'click dblclick mousedown mousemove mouseout mouseover mouseup rightclick');

  mapOverlayDirective('uiMapRectangle',
    'bounds_changed click dblclick mousedown mousemove mouseout mouseover ' +
      'mouseup rightclick');

  mapOverlayDirective('uiMapCircle',
    'center_changed click dblclick mousedown mousemove ' +
      'mouseout mouseover mouseup radius_changed rightclick');

  mapOverlayDirective('uiMapGroundOverlay',
    'click dblclick');

})();
/*
 Attaches jquery-ui input mask onto input element
 */
angular.module('ui.directives').directive('uiMask', [
  function () {
    return {
      require:'ngModel',
      link:function ($scope, element, attrs, controller) {

        /* We override the render method to run the jQuery mask plugin
         */
        controller.$render = function () {
          var value = controller.$viewValue || '';
          element.val(value);
          element.mask($scope.$eval(attrs.uiMask));
        };

        /* Add a parser that extracts the masked value into the model but only if the mask is valid
         */
        controller.$parsers.push(function (value) {
          //the second check (or) is only needed due to the fact that element.isMaskValid() will keep returning undefined
          //until there was at least one key event
          var isValid = element.isMaskValid() || angular.isUndefined(element.isMaskValid()) && element.val().length>0;
          controller.$setValidity('mask', isValid);
          return isValid ? value : undefined;
        });

        /* When keyup, update the view value
         */
        element.bind('keyup', function () {
          $scope.$apply(function () {
            controller.$setViewValue(element.mask());
          });
        });
      }
    };
  }
]);

/**
 * Add a clear button to form inputs to reset their value
 */
angular.module('ui.directives').directive('uiReset', ['ui.config', function (uiConfig) {
  var resetValue = null;
  if (uiConfig.reset !== undefined)
      resetValue = uiConfig.reset;
  return {
    require: 'ngModel',
    link: function (scope, elm, attrs, ctrl) {
      var aElement;
      aElement = angular.element('<a class="ui-reset" />');
      elm.wrap('<span class="ui-resetwrap" />').after(aElement);
      aElement.bind('click', function (e) {
        e.preventDefault();
        scope.$apply(function () {
          if (attrs.uiReset)
            ctrl.$setViewValue(scope.$eval(attrs.uiReset));
          else
            ctrl.$setViewValue(resetValue);
          ctrl.$render();
        });
      });
    }
  };
}]);

/**
 * Set a $uiRoute boolean to see if the current route matches
 */
angular.module('ui.directives').directive('uiRoute', ['$location', '$parse', function ($location, $parse) {
  return {
    restrict: 'AC',
    compile: function(tElement, tAttrs) {
      var useProperty;
      if (tAttrs.uiRoute) {
        useProperty = 'uiRoute';
      } else if (tAttrs.ngHref) {
        useProperty = 'ngHref';
      } else if (tAttrs.href) {
        useProperty = 'href';
      } else {
        throw new Error('uiRoute missing a route or href property on ' + tElement[0]);
      }
      return function ($scope, elm, attrs) {
        var modelSetter = $parse(attrs.ngModel || attrs.routeModel || '$uiRoute').assign;
        var watcher = angular.noop;

        // Used by href and ngHref
        function staticWatcher(newVal) {
          if ((hash = newVal.indexOf('#')) > -1)
            newVal = newVal.substr(hash + 1);
          watcher = function watchHref() {
            modelSetter($scope, ($location.path().indexOf(newVal) > -1));
          };
          watcher();
        }
        // Used by uiRoute
        function regexWatcher(newVal) {
          if ((hash = newVal.indexOf('#')) > -1)
            newVal = newVal.substr(hash + 1);
          watcher = function watchRegex() {
            var regexp = new RegExp('^' + newVal + '$', ['i']);
            modelSetter($scope, regexp.test($location.path()));
          };
          watcher();
        }

        switch (useProperty) {
          case 'uiRoute':
            // if uiRoute={{}} this will be undefined, otherwise it will have a value and $observe() never gets triggered
            if (attrs.uiRoute)
              regexWatcher(attrs.uiRoute);
            else
              attrs.$observe('uiRoute', regexWatcher);
            break;
          case 'ngHref':
            // Setup watcher() every time ngHref changes
            if (attrs.ngHref)
              staticWatcher(attrs.ngHref);
            else
              attrs.$observe('ngHref', staticWatcher);
            break;
          case 'href':
            // Setup watcher()
            staticWatcher(attrs.href);
        }

        $scope.$on('$routeChangeSuccess', function(){
          watcher();
        });
      }
    }
  };
}]);

/*global angular, $, document*/
/**
 * Adds a 'ui-scrollfix' class to the element when the page scrolls past it's position.
 * @param [offset] {int} optional Y-offset to override the detected offset.
 *   Takes 300 (absolute) or -300 or +300 (relative to detected)
 */
angular.module('ui.directives').directive('uiScrollfix', ['$window', function ($window) {
  'use strict';
  return {
    link: function (scope, elm, attrs) {
      var top = elm.offset().top;
      if (!attrs.uiScrollfix) {
        attrs.uiScrollfix = top;
      } else {
        // chartAt is generally faster than indexOf: http://jsperf.com/indexof-vs-chartat
        if (attrs.uiScrollfix.charAt(0) === '-') {
          attrs.uiScrollfix = top - attrs.uiScrollfix.substr(1);
        } else if (attrs.uiScrollfix.charAt(0) === '+') {
          attrs.uiScrollfix = top + parseFloat(attrs.uiScrollfix.substr(1));
        }
      }
      angular.element($window).on('scroll.ui-scrollfix', function () {
        // if pageYOffset is defined use it, otherwise use other crap for IE
        var offset;
        if (angular.isDefined($window.pageYOffset)) {
          offset = $window.pageYOffset;
        } else {
          var iebody = (document.compatMode && document.compatMode !== "BackCompat") ? document.documentElement : document.body;
          offset = iebody.scrollTop;
        }
        if (!elm.hasClass('ui-scrollfix') && offset > attrs.uiScrollfix) {
          elm.addClass('ui-scrollfix');
        } else if (elm.hasClass('ui-scrollfix') && offset < attrs.uiScrollfix) {
          elm.removeClass('ui-scrollfix');
        }
      });
    }
  };
}]);

/**
 * Enhanced Select2 Dropmenus
 *
 * @AJAX Mode - When in this mode, your value will be an object (or array of objects) of the data used by Select2
 *     This change is so that you do not have to do an additional query yourself on top of Select2's own query
 * @params [options] {object} The configuration options passed to $.fn.select2(). Refer to the documentation
 */
angular.module('ui.directives').directive('uiSelect2', ['ui.config', '$timeout', function (uiConfig, $timeout) {
  var options = {};
  if (uiConfig.select2) {
    angular.extend(options, uiConfig.select2);
  }
  return {
    require: '?ngModel',
    compile: function (tElm, tAttrs) {
      var watch,
        repeatOption,
        repeatAttr,
        isSelect = tElm.is('select'),
        isMultiple = (tAttrs.multiple !== undefined);

      // Enable watching of the options dataset if in use
      if (tElm.is('select')) {
        repeatOption = tElm.find('option[ng-repeat], option[data-ng-repeat]');

        if (repeatOption.length) {
          repeatAttr = repeatOption.attr('ng-repeat') || repeatOption.attr('data-ng-repeat');
          watch = jQuery.trim(repeatAttr.split('|')[0]).split(' ').pop();
        }
      }

      return function (scope, elm, attrs, controller) {
        // instance-specific options
        var opts = angular.extend({}, options, scope.$eval(attrs.uiSelect2));

        if (isSelect) {
          // Use <select multiple> instead
          delete opts.multiple;
          delete opts.initSelection;
        } else if (isMultiple) {
          opts.multiple = true;
        }

        if (controller) {
          // Watch the model for programmatic changes
          controller.$render = function () {
            if (isSelect) {
              elm.select2('val', controller.$modelValue);
            } else {
              if (isMultiple) {
                if (!controller.$modelValue) {
                  elm.select2('data', []);
                } else if (angular.isArray(controller.$modelValue)) {
                  elm.select2('data', controller.$modelValue);
                } else {
                  elm.select2('val', controller.$modelValue);
                }
              } else {
                if (angular.isObject(controller.$modelValue)) {
                  elm.select2('data', controller.$modelValue);
                } else {
                  elm.select2('val', controller.$modelValue);
                }
              }
            }
          };

          // Watch the options dataset for changes
          if (watch) {
            scope.$watch(watch, function (newVal, oldVal, scope) {
              if (!newVal) return;
              // Delayed so that the options have time to be rendered
              $timeout(function () {
                elm.select2('val', controller.$viewValue);
                // Refresh angular to remove the superfluous option
                elm.trigger('change');
              });
            });
          }

          if (!isSelect) {
            // Set the view and model value and update the angular template manually for the ajax/multiple select2.
            elm.bind("change", function () {
              scope.$apply(function () {
                controller.$setViewValue(elm.select2('data'));
              });
            });

            if (opts.initSelection) {
              var initSelection = opts.initSelection;
              opts.initSelection = function (element, callback) {
                initSelection(element, function (value) {
                  controller.$setViewValue(value);
                  callback(value);
                });
              };
            }
          }
        }

        attrs.$observe('disabled', function (value) {
          elm.select2(value && 'disable' || 'enable');
        });

        if (attrs.ngMultiple) {
          scope.$watch(attrs.ngMultiple, function(newVal) {
            elm.select2(opts);
          });
        }

        // Set initial value since Angular doesn't
        elm.val(scope.$eval(attrs.ngModel));

        // Initialize the plugin late so that the injected DOM does not disrupt the template compiler
        $timeout(function () {
          elm.select2(opts);
          // Not sure if I should just check for !isSelect OR if I should check for 'tags' key
          if (!opts.initSelection && !isSelect)
            controller.$setViewValue(elm.select2('data'));
        });
      };
    }
  };
}]);

/**
 * uiShow Directive
 *
 * Adds a 'ui-show' class to the element instead of display:block
 * Created to allow tighter control  of CSS without bulkier directives
 *
 * @param expression {boolean} evaluated expression to determine if the class should be added
 */
angular.module('ui.directives').directive('uiShow', [function () {
  return function (scope, elm, attrs) {
    scope.$watch(attrs.uiShow, function (newVal, oldVal) {
      if (newVal) {
        elm.addClass('ui-show');
      } else {
        elm.removeClass('ui-show');
      }
    });
  };
}])

/**
 * uiHide Directive
 *
 * Adds a 'ui-hide' class to the element instead of display:block
 * Created to allow tighter control  of CSS without bulkier directives
 *
 * @param expression {boolean} evaluated expression to determine if the class should be added
 */
  .directive('uiHide', [function () {
  return function (scope, elm, attrs) {
    scope.$watch(attrs.uiHide, function (newVal, oldVal) {
      if (newVal) {
        elm.addClass('ui-hide');
      } else {
        elm.removeClass('ui-hide');
      }
    });
  };
}])

/**
 * uiToggle Directive
 *
 * Adds a class 'ui-show' if true, and a 'ui-hide' if false to the element instead of display:block/display:none
 * Created to allow tighter control  of CSS without bulkier directives. This also allows you to override the
 * default visibility of the element using either class.
 *
 * @param expression {boolean} evaluated expression to determine if the class should be added
 */
  .directive('uiToggle', [function () {
  return function (scope, elm, attrs) {
    scope.$watch(attrs.uiToggle, function (newVal, oldVal) {
      if (newVal) {
        elm.removeClass('ui-hide').addClass('ui-show');
      } else {
        elm.removeClass('ui-show').addClass('ui-hide');
      }
    });
  };
}]);

/*
 jQuery UI Sortable plugin wrapper

 @param [ui-sortable] {object} Options to pass to $.fn.sortable() merged onto ui.config
*/
angular.module('ui.directives').directive('uiSortable', [
  'ui.config', function(uiConfig) {
    return {
      require: '?ngModel',
      link: function(scope, element, attrs, ngModel) {
        var onReceive, onRemove, onStart, onUpdate, opts, _receive, _remove, _start, _update;

        opts = angular.extend({}, uiConfig.sortable, scope.$eval(attrs.uiSortable));

        if (ngModel) {

          ngModel.$render = function() {
            element.sortable( "refresh" );
          };

          onStart = function(e, ui) {
            // Save position of dragged item
            ui.item.sortable = { index: ui.item.index() };
          };

          onUpdate = function(e, ui) {
            // For some reason the reference to ngModel in stop() is wrong
            ui.item.sortable.resort = ngModel;
          };

          onReceive = function(e, ui) {
            ui.item.sortable.relocate = true;
            // added item to array into correct position and set up flag
            ngModel.$modelValue.splice(ui.item.index(), 0, ui.item.sortable.moved);
          };

          onRemove = function(e, ui) {
            // copy data into item
            if (ngModel.$modelValue.length === 1) {
              ui.item.sortable.moved = ngModel.$modelValue.splice(0, 1)[0];
            } else {
              ui.item.sortable.moved =  ngModel.$modelValue.splice(ui.item.sortable.index, 1)[0];
            }
          };

          onStop = function(e, ui) {
            // digest all prepared changes
            if (ui.item.sortable.resort && !ui.item.sortable.relocate) {

              // Fetch saved and current position of dropped element
              var end, start;
              start = ui.item.sortable.index;
              end = ui.item.index();
              if (start < end)
                end--;

              // Reorder array and apply change to scope
              ui.item.sortable.resort.$modelValue.splice(end, 0, ui.item.sortable.resort.$modelValue.splice(start, 1)[0]);

            }
            if (ui.item.sortable.resort || ui.item.sortable.relocate) {
              scope.$apply();
            }
          };

          // If user provided 'start' callback compose it with onStart function
          _start = opts.start;
          opts.start = function(e, ui) {
            onStart(e, ui);
            if (typeof _start === "function")
              _start(e, ui);
          };

          // If user provided 'start' callback compose it with onStart function
          _stop = opts.stop;
          opts.stop = function(e, ui) {
            onStop(e, ui);
            if (typeof _stop === "function")
              _stop(e, ui);
          };

          // If user provided 'update' callback compose it with onUpdate function
          _update = opts.update;
          opts.update = function(e, ui) {
            onUpdate(e, ui);
            if (typeof _update === "function")
              _update(e, ui);
          };

          // If user provided 'receive' callback compose it with onReceive function
          _receive = opts.receive;
          opts.receive = function(e, ui) {
            onReceive(e, ui);
            if (typeof _receive === "function")
              _receive(e, ui);
          };

          // If user provided 'remove' callback compose it with onRemove function
          _remove = opts.remove;
          opts.remove = function(e, ui) {
            onRemove(e, ui);
            if (typeof _remove === "function")
              _remove(e, ui);
          };
        }

        // Create sortable
        element.sortable(opts);
      }
    };
  }
]);

/**
 * Binds a TinyMCE widget to <textarea> elements.
 */
angular.module('ui.directives').directive('uiTinymce', ['ui.config', function (uiConfig) {
  uiConfig.tinymce = uiConfig.tinymce || {};
  return {
    require: 'ngModel',
    link: function (scope, elm, attrs, ngModel) {
      var expression,
        options = {
          // Update model on button click
          onchange_callback: function (inst) {
            if (inst.isDirty()) {
              inst.save();
              ngModel.$setViewValue(elm.val());
              if (!scope.$$phase)
                scope.$apply();
            }
          },
          // Update model on keypress
          handle_event_callback: function (e) {
            if (this.isDirty()) {
              this.save();
              ngModel.$setViewValue(elm.val());
              if (!scope.$$phase)
                scope.$apply();
            }
            return true; // Continue handling
          },
          // Update model when calling setContent (such as from the source editor popup)
          setup: function (ed) {
            ed.onSetContent.add(function (ed, o) {
              if (ed.isDirty()) {
                ed.save();
                ngModel.$setViewValue(elm.val());
                if (!scope.$$phase)
                  scope.$apply();
              }
            });
          }
        };
      if (attrs.uiTinymce) {
        expression = scope.$eval(attrs.uiTinymce);
      } else {
        expression = {};
      }
      angular.extend(options, uiConfig.tinymce, expression);
      setTimeout(function () {
        elm.tinymce(options);
      });
    }
  };
}]);

/**
 * General-purpose validator for ngModel.
 * angular.js comes with several built-in validation mechanism for input fields (ngRequired, ngPattern etc.) but using
 * an arbitrary validation function requires creation of a custom formatters and / or parsers.
 * The ui-validate directive makes it easy to use any function(s) defined in scope as a validator function(s).
 * A validator function will trigger validation on both model and input changes.
 *
 * @example <input ui-validate=" 'myValidatorFunction($value)' ">
 * @example <input ui-validate="{ foo : '$value > anotherModel', bar : 'validateFoo($value)' }">
 * @example <input ui-validate="{ foo : '$value > anotherModel' }" ui-validate-watch=" 'anotherModel' ">
 * @example <input ui-validate="{ foo : '$value > anotherModel', bar : 'validateFoo($value)' }" ui-validate-watch=" { foo : 'anotherModel' } ">
 *
 * @param ui-validate {string|object literal} If strings is passed it should be a scope's function to be used as a validator.
 * If an object literal is passed a key denotes a validation error key while a value should be a validator function.
 * In both cases validator function should take a value to validate as its argument and should return true/false indicating a validation result.
 */
angular.module('ui.directives').directive('uiValidate', function () {

  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, elm, attrs, ctrl) {
      var validateFn, watch, validators = {},
        validateExpr = scope.$eval(attrs.uiValidate);

      if (!validateExpr) return;

      if (angular.isString(validateExpr)) {
        validateExpr = { validator: validateExpr };
      }

      angular.forEach(validateExpr, function (expression, key) {
        validateFn = function (valueToValidate) {
          if (scope.$eval(expression, { '$value' : valueToValidate })) {
            ctrl.$setValidity(key, true);
            return valueToValidate;
          } else {
            ctrl.$setValidity(key, false);
            return undefined;
          }
        };
        validators[key] = validateFn;
        ctrl.$formatters.push(validateFn);
        ctrl.$parsers.push(validateFn);
      });

      // Support for ui-validate-watch
      if (attrs.uiValidateWatch) {
        watch = scope.$eval(attrs.uiValidateWatch);
        if (angular.isString(watch)) {
          scope.$watch(watch, function(){
            angular.forEach(validators, function(validatorFn, key){
              validatorFn(ctrl.$modelValue);
            });
          });
        } else {
          angular.forEach(watch, function(expression, key){
            scope.$watch(expression, function(){
              validators[key](ctrl.$modelValue);
            });
          });
        }
      }
    }
  };
});


/**
 * A replacement utility for internationalization very similar to sprintf.
 *
 * @param replace {mixed} The tokens to replace depends on type
 *  string: all instances of $0 will be replaced
 *  array: each instance of $0, $1, $2 etc. will be placed with each array item in corresponding order
 *  object: all attributes will be iterated through, with :key being replaced with its corresponding value
 * @return string
 *
 * @example: 'Hello :name, how are you :day'.format({ name:'John', day:'Today' })
 * @example: 'Records $0 to $1 out of $2 total'.format(['10', '20', '3000'])
 * @example: '$0 agrees to all mentions $0 makes in the event that $0 hits a tree while $0 is driving drunk'.format('Bob')
 */
angular.module('ui.filters').filter('format', function(){
  return function(value, replace) {
    if (!value) {
      return value;
    }
    var target = value.toString(), token;
    if (replace === undefined) {
      return target;
    }
    if (!angular.isArray(replace) && !angular.isObject(replace)) {
      return target.split('$0').join(replace);
    }
    token = angular.isArray(replace) && '$' || ':';

    angular.forEach(replace, function(value, key){
      target = target.split(token+key).join(value);
    });
    return target;
  };
});

/**
 * Wraps the
 * @param text {string} haystack to search through
 * @param search {string} needle to search for
 * @param [caseSensitive] {boolean} optional boolean to use case-sensitive searching
 */
angular.module('ui.filters').filter('highlight', function () {
  return function (text, search, caseSensitive) {
    if (search || angular.isNumber(search)) {
      text = text.toString();
      search = search.toString();
      if (caseSensitive) {
        return text.split(search).join('<span class="ui-match">' + search + '</span>');
      } else {
        return text.replace(new RegExp(search, 'gi'), '<span class="ui-match">$&</span>');
      }
    } else {
      return text;
    }
  };
});

/**
 * Converts variable-esque naming conventions to something presentational, capitalized words separated by space.
 * @param {String} value The value to be parsed and prettified.
 * @param {String} [inflector] The inflector to use. Default: humanize.
 * @return {String}
 * @example {{ 'Here Is my_phoneNumber' | inflector:'humanize' }} => Here Is My Phone Number
 *          {{ 'Here Is my_phoneNumber' | inflector:'underscore' }} => here_is_my_phone_number
 *          {{ 'Here Is my_phoneNumber' | inflector:'variable' }} => hereIsMyPhoneNumber
 */
angular.module('ui.filters').filter('inflector', function () {
  function ucwords(text) {
    return text.replace(/^([a-z])|\s+([a-z])/g, function ($1) {
      return $1.toUpperCase();
    });
  }

  function breakup(text, separator) {
    return text.replace(/[A-Z]/g, function (match) {
      return separator + match;
    });
  }

  var inflectors = {
    humanize: function (value) {
      return ucwords(breakup(value, ' ').split('_').join(' '));
    },
    underscore: function (value) {
      return value.substr(0, 1).toLowerCase() + breakup(value.substr(1), '_').toLowerCase().split(' ').join('_');
    },
    variable: function (value) {
      value = value.substr(0, 1).toLowerCase() + ucwords(value.split('_').join(' ')).substr(1).split(' ').join('');
      return value;
    }
  };

  return function (text, inflector, separator) {
    if (inflector !== false && angular.isString(text)) {
      inflector = inflector || 'humanize';
      return inflectors[inflector](text);
    } else {
      return text;
    }
  };
});

/**
 * Filters out all duplicate items from an array by checking the specified key
 * @param [key] {string} the name of the attribute of each object to compare for uniqueness
 if the key is empty, the entire object will be compared
 if the key === false then no filtering will be performed
 * @return {array}
 */
angular.module('ui.filters').filter('unique', function () {

  return function (items, filterOn) {

    if (filterOn === false) {
      return items;
    }

    if ((filterOn || angular.isUndefined(filterOn)) && angular.isArray(items)) {
      var hashCheck = {}, newItems = [];

      var extractValueToCompare = function (item) {
        if (angular.isObject(item) && angular.isString(filterOn)) {
          return item[filterOn];
        } else {
          return item;
        }
      };

      angular.forEach(items, function (item) {
        var valueToCheck, isDuplicate = false;

        for (var i = 0; i < newItems.length; i++) {
          if (angular.equals(extractValueToCompare(newItems[i]), extractValueToCompare(item))) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          newItems.push(item);
        }

      });
      items = newItems;
    }
    return items;
  };
});
;/*global angular:true, browser:true */

/**
 * @license HTTP Auth Interceptor Module for AngularJS
 * (c) 2012 Witold Szczerba
 * License: MIT
 */
(function () {
  'use strict';
  
  angular.module('http-auth-interceptor', ['http-auth-interceptor-buffer'])

  .factory('authService', ['$rootScope','httpBuffer', function($rootScope, httpBuffer) {
    return {
      loginConfirmed: function() {
        $rootScope.$broadcast('event:auth-loginConfirmed');
        httpBuffer.retryAll();
      }
    };
  }])

  /**
   * $http interceptor.
   * On 401 response (without 'ignoreAuthModule' option) stores the request 
   * and broadcasts 'event:angular-auth-loginRequired'.
   */
  .config(['$httpProvider', function($httpProvider) {
    
    var interceptor = ['$rootScope', '$q', 'httpBuffer', function($rootScope, $q, httpBuffer) {
      function success(response) {
        return response;
      }
 
      function error(response) {
        if (response.status === 401 && !response.config.ignoreAuthModule) {
          var deferred = $q.defer();
          httpBuffer.append(response.config, deferred);
          $rootScope.$broadcast('event:auth-loginRequired');
          return deferred.promise;
        }
        // otherwise, default behaviour
        return $q.reject(response);
      }
 
      return function(promise) {
        return promise.then(success, error);
      };
 
    }];
    $httpProvider.responseInterceptors.push(interceptor);
  }]);
  
  /**
   * Private module, an utility, required internally by 'http-auth-interceptor'.
   */
  angular.module('http-auth-interceptor-buffer', [])

  .factory('httpBuffer', ['$injector', function($injector) {
    /** Holds all the requests, so they can be re-requested in future. */
    var buffer = [];
    
    /** Service initialized later because of circular dependency problem. */
    var $http; 
    
    function retryHttpRequest(config, deferred) {
      $http = $http || $injector.get('$http');
      $http(config).then(function(response) {
        deferred.resolve(response);
      });
    }
    
    return {
      /**
       * Appends HTTP request configuration object with deferred response attached to buffer.
       */
      append: function(config, deferred) {
        buffer.push({
          config: config, 
          deferred: deferred
        });      
      },
              
      /**
       * Retries all the buffered requests clears the buffer.
       */
      retryAll: function() {
        for (var i = 0; i < buffer.length; ++i) {
          retryHttpRequest(buffer[i].config, buffer[i].deferred);
        }
        buffer = [];
      }
    };
  }]);
})();;/*!
 * jQuery Cookie Plugin v1.3.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals.
        factory(jQuery);
    }
}(function ($) {

    var pluses = /\+/g;

    function raw(s) {
        return s;
    }

    function decoded(s) {
        return decodeURIComponent(s.replace(pluses, ' '));
    }

    function converted(s) {
        if (s.indexOf('"') === 0) {
            // This is a quoted cookie as according to RFC2068, unescape
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        try {
            return config.json ? JSON.parse(s) : s;
        } catch(er) {}
    }

    var config = $.cookie = function (key, value, options) {

        // write
        if (value !== undefined) {
            options = $.extend({}, config.defaults, options);

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            value = config.json ? JSON.stringify(value) : String(value);

            return (document.cookie = [
                config.raw ? key : encodeURIComponent(key),
                '=',
                config.raw ? value : encodeURIComponent(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path    ? '; path=' + options.path : '',
                options.domain  ? '; domain=' + options.domain : '',
                options.secure  ? '; secure' : ''
            ].join(''));
        }

        // read
        var decode = config.raw ? raw : decoded;
        var cookies = document.cookie.split('; ');
        var result = key ? undefined : {};
        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            var name = decode(parts.shift());
            var cookie = decode(parts.join('='));

            if (key && key === name) {
                result = converted(cookie);
                break;
            }

            if (!key) {
                result[name] = converted(cookie);
            }
        }

        return result;
    };

    config.defaults = {};

    $.removeCookie = function (key, options) {
        if ($.cookie(key) !== undefined) {
            // Must not alter options, thus extending a fresh object...
            $.cookie(key, '', $.extend({}, options, { expires: -1 }));
            return true;
        }
        return false;
    };

}));
;/*!
 * FullCalendar v1.6.2
 * Docs & License: http://arshaw.com/fullcalendar/
 * (c) 2013 Adam Shaw
 */
(function(t,e){function n(e){t.extend(!0,ye,e)}function r(n,r,c){function u(t){G?(T(),C(),N(),w(t)):f()}function f(){K=r.theme?"ui":"fc",n.addClass("fc"),r.isRTL?n.addClass("fc-rtl"):n.addClass("fc-ltr"),r.theme&&n.addClass("ui-widget"),G=t("<div class='fc-content' style='position:relative'/>").prependTo(n),$=new a(Z,r),Q=$.render(),Q&&n.prepend(Q),y(r.defaultView),t(window).resize(E),m()||v()}function v(){setTimeout(function(){!te.start&&m()&&w()},0)}function h(){t(window).unbind("resize",E),$.destroy(),G.remove(),n.removeClass("fc fc-rtl ui-widget")}function p(){return 0!==se.offsetWidth}function m(){return 0!==t("body")[0].offsetWidth}function y(e){if(!te||e!=te.name){ue++,W();var n,r=te;r?((r.beforeHide||O)(),L(G,G.height()),r.element.hide()):L(G,1),G.css("overflow","hidden"),te=le[e],te?te.element.show():te=le[e]=new we[e](n=re=t("<div class='fc-view fc-view-"+e+"' style='position:absolute'/>").appendTo(G),Z),r&&$.deactivateButton(r.name),$.activateButton(e),w(),G.css("overflow",""),r&&L(G,1),n||(te.afterShow||O)(),ue--}}function w(t){if(p()){ue++,W(),ne===e&&T();var r=!1;!te.start||t||te.start>fe||fe>=te.end?(te.render(fe,t||0),S(!0),r=!0):te.sizeDirty?(te.clearEvents(),S(),r=!0):te.eventsDirty&&(te.clearEvents(),r=!0),te.sizeDirty=!1,te.eventsDirty=!1,x(r),ee=n.outerWidth(),$.updateTitle(te.title);var a=new Date;a>=te.start&&te.end>a?$.disableButton("today"):$.enableButton("today"),ue--,te.trigger("viewDisplay",se)}}function M(){C(),p()&&(T(),S(),W(),te.clearEvents(),te.renderEvents(de),te.sizeDirty=!1)}function C(){t.each(le,function(t,e){e.sizeDirty=!0})}function T(){ne=r.contentHeight?r.contentHeight:r.height?r.height-(Q?Q.height():0)-R(G):Math.round(G.width()/Math.max(r.aspectRatio,.5))}function S(t){ue++,te.setHeight(ne,t),re&&(re.css("position","relative"),re=null),te.setWidth(G.width(),t),ue--}function E(){if(!ue)if(te.start){var t=++ce;setTimeout(function(){t==ce&&!ue&&p()&&ee!=(ee=n.outerWidth())&&(ue++,M(),te.trigger("windowResize",se),ue--)},200)}else v()}function x(t){!r.lazyFetching||oe(te.visStart,te.visEnd)?k():t&&F()}function k(){ie(te.visStart,te.visEnd)}function H(t){de=t,F()}function z(t){F(t)}function F(t){N(),p()&&(te.clearEvents(),te.renderEvents(de,t),te.eventsDirty=!1)}function N(){t.each(le,function(t,e){e.eventsDirty=!0})}function A(t,n,r){te.select(t,n,r===e?!0:r)}function W(){te&&te.unselect()}function _(){w(-1)}function q(){w(1)}function I(){i(fe,-1),w()}function B(){i(fe,1),w()}function P(){fe=new Date,w()}function j(t,e,n){t instanceof Date?fe=d(t):g(fe,t,e,n),w()}function Y(t,n,r){t!==e&&i(fe,t),n!==e&&s(fe,n),r!==e&&l(fe,r),w()}function J(){return d(fe)}function V(){return te}function X(t,n){return n===e?r[t]:(("height"==t||"contentHeight"==t||"aspectRatio"==t)&&(r[t]=n,M()),e)}function U(t,n){return r[t]?r[t].apply(n||se,Array.prototype.slice.call(arguments,2)):e}var Z=this;Z.options=r,Z.render=u,Z.destroy=h,Z.refetchEvents=k,Z.reportEvents=H,Z.reportEventChange=z,Z.rerenderEvents=F,Z.changeView=y,Z.select=A,Z.unselect=W,Z.prev=_,Z.next=q,Z.prevYear=I,Z.nextYear=B,Z.today=P,Z.gotoDate=j,Z.incrementDate=Y,Z.formatDate=function(t,e){return D(t,e,r)},Z.formatDates=function(t,e,n){return b(t,e,n,r)},Z.getDate=J,Z.getView=V,Z.option=X,Z.trigger=U,o.call(Z,r,c);var $,Q,G,K,te,ee,ne,re,ae,oe=Z.isFetchNeeded,ie=Z.fetchEvents,se=n[0],le={},ce=0,ue=0,fe=new Date,de=[];g(fe,r.year,r.month,r.date),r.droppable&&t(document).bind("dragstart",function(e,n){var a=e.target,o=t(a);if(!o.parents(".fc").length){var i=r.dropAccept;(t.isFunction(i)?i.call(a,o):o.is(i))&&(ae=a,te.dragStart(ae,e,n))}}).bind("dragstop",function(t,e){ae&&(te.dragStop(ae,t,e),ae=null)})}function a(n,r){function a(){v=r.theme?"ui":"fc";var n=r.header;return n?h=t("<table class='fc-header' style='width:100%'/>").append(t("<tr/>").append(i("left")).append(i("center")).append(i("right"))):e}function o(){h.remove()}function i(e){var a=t("<td class='fc-header-"+e+"'/>"),o=r.header[e];return o&&t.each(o.split(" "),function(e){e>0&&a.append("<span class='fc-header-space'/>");var o;t.each(this.split(","),function(e,i){if("title"==i)a.append("<span class='fc-header-title'><h2>&nbsp;</h2></span>"),o&&o.addClass(v+"-corner-right"),o=null;else{var s;if(n[i]?s=n[i]:we[i]&&(s=function(){u.removeClass(v+"-state-hover"),n.changeView(i)}),s){var l=r.theme?B(r.buttonIcons,i):null,c=B(r.buttonText,i),u=t("<span class='fc-button fc-button-"+i+" "+v+"-state-default'>"+(l?"<span class='fc-icon-wrap'><span class='ui-icon ui-icon-"+l+"'/>"+"</span>":c)+"</span>").click(function(){u.hasClass(v+"-state-disabled")||s()}).mousedown(function(){u.not("."+v+"-state-active").not("."+v+"-state-disabled").addClass(v+"-state-down")}).mouseup(function(){u.removeClass(v+"-state-down")}).hover(function(){u.not("."+v+"-state-active").not("."+v+"-state-disabled").addClass(v+"-state-hover")},function(){u.removeClass(v+"-state-hover").removeClass(v+"-state-down")}).appendTo(a);j(u),o||u.addClass(v+"-corner-left"),o=u}}}),o&&o.addClass(v+"-corner-right")}),a}function s(t){h.find("h2").html(t)}function l(t){h.find("span.fc-button-"+t).addClass(v+"-state-active")}function c(t){h.find("span.fc-button-"+t).removeClass(v+"-state-active")}function u(t){h.find("span.fc-button-"+t).addClass(v+"-state-disabled")}function f(t){h.find("span.fc-button-"+t).removeClass(v+"-state-disabled")}var d=this;d.render=a,d.destroy=o,d.updateTitle=s,d.activateButton=l,d.deactivateButton=c,d.disableButton=u,d.enableButton=f;var v,h=t([])}function o(n,r){function a(t,e){return!T||T>t||e>S}function o(t,e){T=t,S=e,A=[];var n=++F,r=z.length;R=r;for(var a=0;r>a;a++)i(z[a],n)}function i(e,r){s(e,function(a){if(r==F){if(a){n.eventDataTransform&&(a=t.map(a,n.eventDataTransform)),e.eventDataTransform&&(a=t.map(a,e.eventDataTransform));for(var o=0;a.length>o;o++)a[o].source=e,D(a[o]);A=A.concat(a)}R--,R||k(A)}})}function s(r,a){var o,i,l=be.sourceFetchers;for(o=0;l.length>o;o++){if(i=l[o](r,T,S,a),i===!0)return;if("object"==typeof i)return s(i,a),e}var c=r.events;if(c)t.isFunction(c)?(m(),c(d(T),d(S),function(t){a(t),y()})):t.isArray(c)?a(c):a();else{var u=r.url;if(u){var f=r.success,v=r.error,h=r.complete,g=t.extend({},r.data||{}),p=X(r.startParam,n.startParam),D=X(r.endParam,n.endParam);p&&(g[p]=Math.round(+T/1e3)),D&&(g[D]=Math.round(+S/1e3)),m(),t.ajax(t.extend({},Me,r,{data:g,success:function(e){e=e||[];var n=V(f,this,arguments);t.isArray(n)&&(e=n),a(e)},error:function(){V(v,this,arguments),a()},complete:function(){V(h,this,arguments),y()}}))}else a()}}function l(t){t=c(t),t&&(R++,i(t,F))}function c(n){return t.isFunction(n)||t.isArray(n)?n={events:n}:"string"==typeof n&&(n={url:n}),"object"==typeof n?(b(n),z.push(n),n):e}function u(e){z=t.grep(z,function(t){return!w(t,e)}),A=t.grep(A,function(t){return!w(t.source,e)}),k(A)}function f(t){var e,n,r=A.length,a=x().defaultEventEnd,o=t.start-t._start,i=t.end?t.end-(t._end||a(t)):0;for(e=0;r>e;e++)n=A[e],n._id==t._id&&n!=t&&(n.start=new Date(+n.start+o),n.end=t.end?n.end?new Date(+n.end+i):new Date(+a(n)+i):null,n.title=t.title,n.url=t.url,n.allDay=t.allDay,n.className=t.className,n.editable=t.editable,n.color=t.color,n.backgroundColor=t.backgroundColor,n.borderColor=t.borderColor,n.textColor=t.textColor,D(n));D(t),k(A)}function v(t,e){D(t),t.source||(e&&(H.events.push(t),t.source=H),A.push(t)),k(A)}function h(e){if(e){if(!t.isFunction(e)){var n=e+"";e=function(t){return t._id==n}}A=t.grep(A,e,!0);for(var r=0;z.length>r;r++)t.isArray(z[r].events)&&(z[r].events=t.grep(z[r].events,e,!0))}else{A=[];for(var r=0;z.length>r;r++)t.isArray(z[r].events)&&(z[r].events=[])}k(A)}function g(e){return t.isFunction(e)?t.grep(A,e):e?(e+="",t.grep(A,function(t){return t._id==e})):A}function m(){N++||E("loading",null,!0)}function y(){--N||E("loading",null,!1)}function D(t){var r=t.source||{},a=X(r.ignoreTimezone,n.ignoreTimezone);t._id=t._id||(t.id===e?"_fc"+Ce++:t.id+""),t.date&&(t.start||(t.start=t.date),delete t.date),t._start=d(t.start=p(t.start,a)),t.end=p(t.end,a),t.end&&t.end<=t.start&&(t.end=null),t._end=t.end?d(t.end):null,t.allDay===e&&(t.allDay=X(r.allDayDefault,n.allDayDefault)),t.className?"string"==typeof t.className&&(t.className=t.className.split(/\s+/)):t.className=[]}function b(t){t.className?"string"==typeof t.className&&(t.className=t.className.split(/\s+/)):t.className=[];for(var e=be.sourceNormalizers,n=0;e.length>n;n++)e[n](t)}function w(t,e){return t&&e&&M(t)==M(e)}function M(t){return("object"==typeof t?t.events||t.url:"")||t}var C=this;C.isFetchNeeded=a,C.fetchEvents=o,C.addEventSource=l,C.removeEventSource=u,C.updateEvent=f,C.renderEvent=v,C.removeEvents=h,C.clientEvents=g,C.normalizeEvent=D;for(var T,S,E=C.trigger,x=C.getView,k=C.reportEvents,H={events:[]},z=[H],F=0,R=0,N=0,A=[],W=0;r.length>W;W++)c(r[W])}function i(t,e,n){return t.setFullYear(t.getFullYear()+e),n||f(t),t}function s(t,e,n){if(+t){var r=t.getMonth()+e,a=d(t);for(a.setDate(1),a.setMonth(r),t.setMonth(r),n||f(t);t.getMonth()!=a.getMonth();)t.setDate(t.getDate()+(a>t?1:-1))}return t}function l(t,e,n){if(+t){var r=t.getDate()+e,a=d(t);a.setHours(9),a.setDate(r),t.setDate(r),n||f(t),c(t,a)}return t}function c(t,e){if(+t)for(;t.getDate()!=e.getDate();)t.setTime(+t+(e>t?1:-1)*Ee)}function u(t,e){return t.setMinutes(t.getMinutes()+e),t}function f(t){return t.setHours(0),t.setMinutes(0),t.setSeconds(0),t.setMilliseconds(0),t}function d(t,e){return e?f(new Date(+t)):new Date(+t)}function v(){var t,e=0;do t=new Date(1970,e++,1);while(t.getHours());return t}function h(t,e){return Math.round((d(t,!0)-d(e,!0))/Se)}function g(t,n,r,a){n!==e&&n!=t.getFullYear()&&(t.setDate(1),t.setMonth(0),t.setFullYear(n)),r!==e&&r!=t.getMonth()&&(t.setDate(1),t.setMonth(r)),a!==e&&t.setDate(a)}function p(t,n){return"object"==typeof t?t:"number"==typeof t?new Date(1e3*t):"string"==typeof t?t.match(/^\d+(\.\d+)?$/)?new Date(1e3*parseFloat(t)):(n===e&&(n=!0),m(t,n)||(t?new Date(t):null)):null}function m(t,e){var n=t.match(/^([0-9]{4})(-([0-9]{2})(-([0-9]{2})([T ]([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([-+])([0-9]{2})(:?([0-9]{2}))?))?)?)?)?$/);if(!n)return null;var r=new Date(n[1],0,1);if(e||!n[13]){var a=new Date(n[1],0,1,9,0);n[3]&&(r.setMonth(n[3]-1),a.setMonth(n[3]-1)),n[5]&&(r.setDate(n[5]),a.setDate(n[5])),c(r,a),n[7]&&r.setHours(n[7]),n[8]&&r.setMinutes(n[8]),n[10]&&r.setSeconds(n[10]),n[12]&&r.setMilliseconds(1e3*Number("0."+n[12])),c(r,a)}else if(r.setUTCFullYear(n[1],n[3]?n[3]-1:0,n[5]||1),r.setUTCHours(n[7]||0,n[8]||0,n[10]||0,n[12]?1e3*Number("0."+n[12]):0),n[14]){var o=60*Number(n[16])+(n[18]?Number(n[18]):0);o*="-"==n[15]?1:-1,r=new Date(+r+1e3*60*o)}return r}function y(t){if("number"==typeof t)return 60*t;if("object"==typeof t)return 60*t.getHours()+t.getMinutes();var e=t.match(/(\d+)(?::(\d+))?\s*(\w+)?/);if(e){var n=parseInt(e[1],10);return e[3]&&(n%=12,"p"==e[3].toLowerCase().charAt(0)&&(n+=12)),60*n+(e[2]?parseInt(e[2],10):0)}}function D(t,e,n){return b(t,null,e,n)}function b(t,e,n,r){r=r||ye;var a,o,i,s,l=t,c=e,u=n.length,f="";for(a=0;u>a;a++)if(o=n.charAt(a),"'"==o){for(i=a+1;u>i;i++)if("'"==n.charAt(i)){l&&(f+=i==a+1?"'":n.substring(a+1,i),a=i);break}}else if("("==o){for(i=a+1;u>i;i++)if(")"==n.charAt(i)){var d=D(l,n.substring(a+1,i),r);parseInt(d.replace(/\D/,""),10)&&(f+=d),a=i;break}}else if("["==o){for(i=a+1;u>i;i++)if("]"==n.charAt(i)){var v=n.substring(a+1,i),d=D(l,v,r);d!=D(c,v,r)&&(f+=d),a=i;break}}else if("{"==o)l=e,c=t;else if("}"==o)l=t,c=e;else{for(i=u;i>a;i--)if(s=ke[n.substring(a,i)]){l&&(f+=s(l,r)),a=i-1;break}i==a&&l&&(f+=o)}return f}function w(t){var e,n=new Date(t.getTime());return n.setDate(n.getDate()+4-(n.getDay()||7)),e=n.getTime(),n.setMonth(0),n.setDate(1),Math.floor(Math.round((e-n)/864e5)/7)+1}function M(t){return t.end?C(t.end,t.allDay):l(d(t.start),1)}function C(t,e){return t=d(t),e||t.getHours()||t.getMinutes()?l(t,1):f(t)}function T(n,r,a){n.unbind("mouseover").mouseover(function(n){for(var o,i,s,l=n.target;l!=this;)o=l,l=l.parentNode;(i=o._fci)!==e&&(o._fci=e,s=r[i],a(s.event,s.element,s),t(n.target).trigger(n)),n.stopPropagation()})}function S(e,n,r){for(var a,o=0;e.length>o;o++)a=t(e[o]),a.width(Math.max(0,n-x(a,r)))}function E(e,n,r){for(var a,o=0;e.length>o;o++)a=t(e[o]),a.height(Math.max(0,n-R(a,r)))}function x(t,e){return k(t)+F(t)+(e?H(t):0)}function k(e){return(parseFloat(t.css(e[0],"paddingLeft",!0))||0)+(parseFloat(t.css(e[0],"paddingRight",!0))||0)}function H(e){return(parseFloat(t.css(e[0],"marginLeft",!0))||0)+(parseFloat(t.css(e[0],"marginRight",!0))||0)}function F(e){return(parseFloat(t.css(e[0],"borderLeftWidth",!0))||0)+(parseFloat(t.css(e[0],"borderRightWidth",!0))||0)}function R(t,e){return N(t)+W(t)+(e?A(t):0)}function N(e){return(parseFloat(t.css(e[0],"paddingTop",!0))||0)+(parseFloat(t.css(e[0],"paddingBottom",!0))||0)}function A(e){return(parseFloat(t.css(e[0],"marginTop",!0))||0)+(parseFloat(t.css(e[0],"marginBottom",!0))||0)}function W(e){return(parseFloat(t.css(e[0],"borderTopWidth",!0))||0)+(parseFloat(t.css(e[0],"borderBottomWidth",!0))||0)}function L(t,e){e="number"==typeof e?e+"px":e,t.each(function(t,n){n.style.cssText+=";min-height:"+e+";_height:"+e})}function O(){}function _(t,e){return t-e}function q(t){return Math.max.apply(Math,t)}function I(t){return(10>t?"0":"")+t}function B(t,n){if(t[n]!==e)return t[n];for(var r,a=n.split(/(?=[A-Z])/),o=a.length-1;o>=0;o--)if(r=t[a[o].toLowerCase()],r!==e)return r;return t[""]}function P(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&#039;").replace(/"/g,"&quot;").replace(/\n/g,"<br />")}function j(t){t.attr("unselectable","on").css("MozUserSelect","none").bind("selectstart.ui",function(){return!1})}function Y(t){t.children().removeClass("fc-first fc-last").filter(":first-child").addClass("fc-first").end().filter(":last-child").addClass("fc-last")}function J(t,e){var n=t.source||{},r=t.color,a=n.color,o=e("eventColor"),i=t.backgroundColor||r||n.backgroundColor||a||e("eventBackgroundColor")||o,s=t.borderColor||r||n.borderColor||a||e("eventBorderColor")||o,l=t.textColor||n.textColor||e("eventTextColor"),c=[];return i&&c.push("background-color:"+i),s&&c.push("border-color:"+s),l&&c.push("color:"+l),c.join(";")}function V(e,n,r){if(t.isFunction(e)&&(e=[e]),e){var a,o;for(a=0;e.length>a;a++)o=e[a].apply(n,r)||o;return o}}function X(){for(var t=0;arguments.length>t;t++)if(arguments[t]!==e)return arguments[t]}function U(t,e){function n(t,e){e&&(s(t,e),t.setDate(1));var n=a("firstDay"),f=d(t,!0);f.setDate(1);var v=s(d(f),1),g=d(f);l(g,-((g.getDay()-n+7)%7)),i(g);var p=d(v);l(p,(7-p.getDay()+n)%7),i(p,-1,!0);var m=c(),y=Math.round(h(p,g)/7);"fixed"==a("weekMode")&&(l(p,7*(6-y)),y=6),r.title=u(f,a("titleFormat")),r.start=f,r.end=v,r.visStart=g,r.visEnd=p,o(y,m,!0)}var r=this;r.render=n,Q.call(r,t,e,"month");var a=r.opt,o=r.renderBasic,i=r.skipHiddenDays,c=r.getCellsPerWeek,u=e.formatDate}function Z(t,e){function n(t,e){e&&l(t,7*e);var n=l(d(t),-((t.getDay()-a("firstDay")+7)%7)),u=l(d(n),7),f=d(n);i(f);var v=d(u);i(v,-1,!0);var h=s();r.start=n,r.end=u,r.visStart=f,r.visEnd=v,r.title=c(f,l(d(v),-1),a("titleFormat")),o(1,h,!1)}var r=this;r.render=n,Q.call(r,t,e,"basicWeek");var a=r.opt,o=r.renderBasic,i=r.skipHiddenDays,s=r.getCellsPerWeek,c=e.formatDates}function $(t,e){function n(t,e){e&&l(t,e),i(t,0>e?-1:1);var n=d(t,!0),c=l(d(n),1);r.title=s(t,a("titleFormat")),r.start=r.visStart=n,r.end=r.visEnd=c,o(1,1,!1)}var r=this;r.render=n,Q.call(r,t,e,"basicDay");var a=r.opt,o=r.renderBasic,i=r.skipHiddenDays,s=e.formatDate}function Q(e,n,r){function a(t,e,n){ae=t,oe=e,ie=n,o();var r=!V;r?i():Se(),s()}function o(){pe=Me("theme")?"ui":"fc",ye=Me("columnFormat"),De=Me("weekNumbers"),be=Me("weekNumberTitle"),we="iso"!=Me("weekNumberCalculation")?"w":"W"}function i(){K=t("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(e)}function s(){var n=c();O(),I&&I.remove(),I=t(n).appendTo(e),B=I.find("thead"),J=B.find(".fc-day-header"),V=I.find("tbody"),X=V.find("tr"),U=V.find(".fc-day"),Z=X.find("td:first-child"),$=X.eq(0).find(".fc-day > div"),Q=X.eq(0).find(".fc-day-content > div"),Y(B.add(B.find("tr"))),Y(X),X.eq(0).addClass("fc-first"),X.filter(":last").addClass("fc-last"),U.each(function(e,n){var r=He(Math.floor(e/oe),e%oe);Ce("dayRender",q,r,t(n))}),y(U)}function c(){var t="<table class='fc-border-separate' style='width:100%' cellspacing='0'>"+u()+v()+"</table>";return t}function u(){var t,e,n=pe+"-widget-header",r="";for(r+="<thead><tr>",De&&(r+="<th class='fc-week-number "+n+"'>"+P(be)+"</th>"),t=0;oe>t;t++)e=He(0,t),r+="<th class='fc-day-header fc-"+Te[e.getDay()]+" "+n+"'>"+P(Re(e,ye))+"</th>";return r+="</tr></thead>"}function v(){var t,e,n,r=pe+"-widget-content",a="";for(a+="<tbody>",t=0;ae>t;t++){for(a+="<tr class='fc-week'>",De&&(n=He(t,0),a+="<td class='fc-week-number "+r+"'>"+"<div>"+P(Re(n,we))+"</div>"+"</td>"),e=0;oe>e;e++)n=He(t,e),a+=h(n);a+="</tr>"}return a+="</tbody>"}function h(t){var e=pe+"-widget-content",n=q.start.getMonth(),r=f(new Date),a="",o=["fc-day","fc-"+Te[t.getDay()],e];return t.getMonth()!=n&&o.push("fc-other-month"),+t==+r&&o.push("fc-today",pe+"-state-highlight"),a+="<td class='"+o.join(" ")+"'"+" data-date='"+Re(t,"yyyy-MM-dd")+"'"+">"+"<div>",ie&&(a+="<div class='fc-day-number'>"+t.getDate()+"</div>"),a+="<div class='fc-day-content'><div style='position:relative'>&nbsp;</div></div></div></td>"}function g(e){ee=e;var n,r,a,o=ee-B.height();"variable"==Me("weekMode")?n=r=Math.floor(o/(1==ae?2:6)):(n=Math.floor(o/ae),r=o-n*(ae-1)),Z.each(function(e,o){ae>e&&(a=t(o),L(a.find("> div"),(e==ae-1?r:n)-R(a)))}),_()}function p(t){te=t,ue.clear(),fe.clear(),re=0,De&&(re=B.find("th.fc-week-number").outerWidth()),ne=Math.floor((te-re)/oe),S(J.slice(0,-1),ne)}function y(t){t.click(D).mousedown(ke)}function D(e){if(!Me("selectable")){var n=m(t(this).data("date"));Ce("dayClick",this,n,!0,e)}}function b(t,e,n){n&&se.build();for(var r=Fe(t,e),a=0;r.length>a;a++){var o=r[a];y(w(o.row,o.leftCol,o.row,o.rightCol))}}function w(t,n,r,a){var o=se.rect(t,n,r,a,e);return Ee(o,e)}function M(t){return d(t)}function C(t,e){b(t,l(d(e),1),!0)}function T(){xe()}function E(t,e,n){var r=ze(t),a=U[r.row*oe+r.col];Ce("dayClick",a,t,e,n)}function x(t,e){ce.start(function(t){xe(),t&&w(t.row,t.col,t.row,t.col)},e)}function k(t,e,n){var r=ce.stop();if(xe(),r){var a=He(r);Ce("drop",t,a,!0,e,n)}}function H(t){return d(t.start)}function z(t){return ue.left(t)}function F(t){return ue.right(t)}function N(t){return fe.left(t)}function A(t){return fe.right(t)}function W(t){return X.eq(t)}function O(){L(e,e.height())}function _(){L(e,1)}var q=this;q.renderBasic=a,q.setHeight=g,q.setWidth=p,q.renderDayOverlay=b,q.defaultSelectionEnd=M,q.renderSelection=C,q.clearSelection=T,q.reportDayClick=E,q.dragStart=x,q.dragStop=k,q.defaultEventEnd=H,q.getHoverListener=function(){return ce},q.colLeft=z,q.colRight=F,q.colContentLeft=N,q.colContentRight=A,q.getIsCellAllDay=function(){return!0},q.allDayRow=W,q.getRowCnt=function(){return ae},q.getColCnt=function(){return oe},q.getColWidth=function(){return ne},q.getDaySegmentContainer=function(){return K},le.call(q,e,n,r),ve.call(q),de.call(q),G.call(q);var I,B,J,V,X,U,Z,$,Q,K,te,ee,ne,re,ae,oe,ie,se,ce,ue,fe,pe,ye,De,be,we,Me=q.opt,Ce=q.trigger,Se=q.clearEvents,Ee=q.renderOverlay,xe=q.clearOverlays,ke=q.daySelectionMousedown,He=q.cellToDate,ze=q.dateToCell,Fe=q.rangeToSegments,Re=n.formatDate;j(e.addClass("fc-grid")),se=new he(function(e,n){var r,a,o;J.each(function(e,i){r=t(i),a=r.offset().left,e&&(o[1]=a),o=[a],n[e]=o}),o[1]=a+r.outerWidth(),X.each(function(n,i){ae>n&&(r=t(i),a=r.offset().top,n&&(o[1]=a),o=[a],e[n]=o)}),o[1]=a+r.outerHeight()}),ce=new ge(se),ue=new me(function(t){return $.eq(t)}),fe=new me(function(t){return Q.eq(t)})}function G(){function t(t,e){n.reportEvents(t),n.renderDayEvents(t,e),n.trigger("eventAfterAllRender")}function e(){n.reportEventClear(),n.getDaySegmentContainer().empty()}var n=this;n.renderEvents=t,n.clearEvents=e,ce.call(n)}function K(t,e){function n(t,e){e&&l(t,7*e);var n=l(d(t),-((t.getDay()-a("firstDay")+7)%7)),u=l(d(n),7),f=d(n);i(f);var v=d(u);i(v,-1,!0);var h=s();r.title=c(f,l(d(v),-1),a("titleFormat")),r.start=n,r.end=u,r.visStart=f,r.visEnd=v,o(h)}var r=this;r.render=n,re.call(r,t,e,"agendaWeek");var a=r.opt,o=r.renderAgenda,i=r.skipHiddenDays,s=r.getCellsPerWeek,c=e.formatDates}function te(t,e){function n(t,e){e&&l(t,e),i(t,0>e?-1:1);var n=d(t,!0),c=l(d(n),1);r.title=s(t,a("titleFormat")),r.start=r.visStart=n,r.end=r.visEnd=c,o(1)}var r=this;r.render=n,re.call(r,t,e,"agendaDay");var a=r.opt,o=r.renderAgenda,i=r.skipHiddenDays,s=e.formatDate}function ee(t,e){function n(t,e){e&&(s(t,e),t.setDate(1));var n,l,c,u;n=d(t,!0),n.setDate(1),l=s(d(n),1),c=d(n),u=d(l),r.title=i(n,a("titleFormat")),r.start=n,r.end=l,r.visStart=c,r.visEnd=u,o(!1)}var r=this;r.render=n,ne.call(r,t,e);var a=r.opt,o=r.renderAgendaList,i=e.formatDate}function ne(e,n){function r(){var t=!h;t?a():c()}function a(){h=!0}function o(t){m=t}function i(t){p=t}function s(n){var r,a,o,i,s,c,h,g=t("<table class='table'></table>"),p=0,m=v(u.visStart,"MM"),y=[];for(p in n)z=p,eMonth=v(n[p].start,"MM"),eMonth==m&&(r=v(n[p].start,"MMM"),a=v(n[p].start,"dddd"),i=v(n[p].start,"MMM d"),lDDay=v(n[p].start,"dddd, MMM d"),c=n[p].title,allDay=n[p].allDay,o=v(n[p].start,"h(:mm)tt"),s=n[p].url,null!=s&&(c="<a href='"+P(s)+"'>"+c+"</a>"),p!=h&&(l(y,lDDay)||(t("<tr><th>"+lDDay+"</th></tr>").appendTo(g),h=z,y.push(lDDay))),eventdisplay=0==p%2?allDay?t("<tr><td>"+c+"</a><span style='float:right'>"+f("allDayText")+"</span></td></tr>").appendTo(g):t("<tr><td>"+c+"</a><span style='float:right'>"+o+"</span></td></tr>").appendTo(g):allDay?t("<tr><td>"+c+"</a><span style='float:right'>"+f("allDayText")+"</span></td></tr>").appendTo(g):t("<tr><td>"+c+"</a><span style='float:right'>"+o+"</span></td></tr>").appendTo(g),D(n[p],eventdisplay));t(e).html(g),d("eventAfterAllRender")}function l(t,e){for(var n=0;t.length>n;n++)if(t[n]==e)return!0;return!1}function c(){b()}var u=this;u.renderAgendaList=r,u.setHeight=o,u.setWidth=i,u.renderEvents=s,u.clearEvents=c,u.cellIsAllDay=function(){return!0},u.getColWidth=function(){return y},u.getDaySegmentContainer=function(){return g},le.call(u,e,n,"agendaList"),ve.call(u),de.call(u);var f=u.opt,d=u.trigger;u.renderOverlay,u.clearOverlays,u.daySelectionMousedown;var v=n.formatDate;u.calendar.updateEvents;var h,g,p,m,y,D=u.eventElementHandlers,b=u.reportEventClear;u.getDaySegmentContainer}function re(n,r,a){function o(t){Le=t,i(),te?(c(),Ke()):s()}function i(){je=Qe("theme")?"ui":"fc",Ye=Qe("isRTL"),Je=y(Qe("minTime")),Ve=y(Qe("maxTime")),Xe=Qe("columnFormat"),Ue=Qe("weekNumbers"),Ze=Qe("weekNumberTitle"),$e="iso"!=Qe("weekNumberCalculation")?"w":"W",Ne=Qe("snapMinutes")||Qe("slotMinutes")}function s(){var e,r,a,o,i,s=je+"-widget-header",l=je+"-widget-content",f=0==Qe("slotMinutes")%15;for(c(),fe=t("<div style='position:absolute;z-index:2;left:0;width:100%'/>").appendTo(n),Qe("allDaySlot")?(pe=t("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(fe),e="<table style='width:100%' class='fc-agenda-allday' cellspacing='0'><tr><th class='"+s+" fc-agenda-axis'>"+Qe("allDayText")+"</th>"+"<td>"+"<div class='fc-day-content'><div style='position:relative'/></div>"+"</td>"+"<th class='"+s+" fc-agenda-gutter'>&nbsp;</th>"+"</tr>"+"</table>",ye=t(e).appendTo(fe),De=ye.find("tr"),C(De.find("td")),fe.append("<div class='fc-agenda-divider "+s+"'>"+"<div class='fc-agenda-divider-inner'/>"+"</div>")):pe=t([]),be=t("<div style='position:absolute;width:100%;overflow-x:hidden;overflow-y:auto'/>").appendTo(fe),we=t("<div style='position:relative;width:100%;overflow:hidden'/>").appendTo(be),Me=t("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(we),e="<table class='fc-agenda-slots' style='width:100%' cellspacing='0'><tbody>",r=v(),o=u(d(r),Ve),u(r,Je),Oe=0,a=0;o>r;a++)i=r.getMinutes(),e+="<tr class='fc-slot"+a+" "+(i?"fc-minor":"")+"'>"+"<th class='fc-agenda-axis "+s+"'>"+(f&&i?"&nbsp;":un(r,Qe("axisFormat")))+"</th>"+"<td class='"+l+"'>"+"<div style='position:relative'>&nbsp;</div>"+"</td>"+"</tr>",u(r,Qe("slotMinutes")),Oe++;e+="</tbody></table>",Ce=t(e).appendTo(we),Se=Ce.find("div:first"),T(Ce.find("td"))}function c(){var e=h();te&&te.remove(),te=t(e).appendTo(n),ee=te.find("thead"),ne=ee.find("th").slice(1,-1),re=te.find("tbody"),oe=re.find("td").slice(0,-1),ie=oe.find("> div"),se=oe.find(".fc-day-content > div"),ce=oe.eq(0),ue=ie.eq(0),Y(ee.add(ee.find("tr"))),Y(re.add(re.find("tr")))}function h(){var t="<table style='width:100%' class='fc-agenda-days fc-border-separate' cellspacing='0'>"+g()+p()+"</table>";return t}function g(){var t,e,n,r=je+"-widget-header",a="";for(a+="<thead><tr>",Ue?(e=un(t,$e),Ye?e+=Ze:e=Ze+e,a+="<th class='fc-agenda-axis fc-week-number "+r+"'>"+P(e)+"</th>"):a+="<th class='fc-agenda-axis "+r+"'>&nbsp;</th>",n=0;Le>n;n++)t=sn(0,n),a+="<th class='fc-"+Te[t.getDay()]+" fc-col"+n+" "+r+"'>"+P(un(t,Xe))+"</th>";return a+="<th class='fc-agenda-gutter "+r+"'>&nbsp;</th>"+"</tr>"+"</thead>"}function p(){var t,e,n,r,a,o=je+"-widget-header",i=je+"-widget-content",s=f(new Date),l="";for(l+="<tbody><tr><th class='fc-agenda-axis "+o+"'>&nbsp;</th>",n="",e=0;Le>e;e++)t=sn(0,e),a=["fc-col"+e,"fc-"+Te[t.getDay()],i],+t==+s&&a.push(je+"-state-highlight","fc-today"),r="<td class='"+a.join(" ")+"'>"+"<div>"+"<div class='fc-day-content'>"+"<div style='position:relative'>&nbsp;</div>"+"</div>"+"</div>"+"</td>",n+=r;return l+=n,l+="<td class='fc-agenda-gutter "+i+"'>&nbsp;</td>"+"</tr>"+"</tbody>"}function m(t,n){t===e&&(t=ke),ke=t,fn={};var r=re.position().top,a=be.position().top,o=Math.min(t-r,Ce.height()+a+1);ue.height(o-R(ce)),fe.css("top",r),be.height(o-a-1),Re=Se.height()+1,Ae=Qe("slotMinutes")/Ne,We=Re/Ae,n&&b()}function D(e){xe=e,Ie.clear(),Be.clear();var n=ee.find("th:first");ye&&(n=n.add(ye.find("th:first"))),n=n.add(Ce.find("th:first")),He=0,S(n.width("").each(function(e,n){He=Math.max(He,t(n).outerWidth())}),He);var r=te.find(".fc-agenda-gutter");ye&&(r=r.add(ye.find("th.fc-agenda-gutter")));var a=be[0].clientWidth;Fe=be.width()-a,Fe?(S(r,Fe),r.show().prev().removeClass("fc-last")):r.hide().prev().addClass("fc-last"),ze=Math.floor((a-He)/Le),S(ne.slice(0,-1),ze)}function b(){function t(){be.scrollTop(r)}var e=v(),n=d(e);n.setHours(Qe("firstHour"));var r=q(e,n)+1;t(),setTimeout(t,0)}function w(){Pe=be.scrollTop()}function M(){be.scrollTop(Pe)}function C(t){t.click(x).mousedown(an)}function T(t){t.click(x).mousedown(Z)}function x(t){if(!Qe("selectable")){var e=Math.min(Le-1,Math.floor((t.pageX-te.offset().left-He)/ze)),n=sn(0,e),r=this.parentNode.className.match(/fc-slot(\d+)/);if(r){var a=parseInt(r[1])*Qe("slotMinutes"),o=Math.floor(a/60);n.setHours(o),n.setMinutes(a%60+Je),Ge("dayClick",oe[e],n,!1,t)}else Ge("dayClick",oe[e],n,!0,t)}}function k(t,e,n){n&&_e.build();for(var r=cn(t,e),a=0;r.length>a;a++){var o=r[a];C(H(o.row,o.leftCol,o.row,o.rightCol))}}function H(t,e,n,r){var a=_e.rect(t,e,n,r,fe);return tn(a,fe)}function z(t,e){for(var n=0;Le>n;n++){var r=sn(0,n),a=l(d(r),1),o=new Date(Math.max(r,t)),i=new Date(Math.min(a,e));if(i>o){var s=_e.rect(0,n,0,n,we),c=q(r,o),u=q(r,i);s.top=c,s.height=u-c,T(tn(s,we))}}}function F(t){return Ie.left(t)}function N(t){return Be.left(t)}function A(t){return Ie.right(t)}function W(t){return Be.right(t)}function L(t){return Qe("allDaySlot")&&!t.row}function O(t){var e=sn(0,t.col),n=t.row;return Qe("allDaySlot")&&n--,n>=0&&u(e,Je+n*Ne),e}function q(t,n){if(t=d(t,!0),u(d(t),Je)>n)return 0;if(n>=u(d(t),Ve))return Ce.height();var r=Qe("slotMinutes"),a=60*n.getHours()+n.getMinutes()-Je,o=Math.floor(a/r),i=fn[o];return i===e&&(i=fn[o]=Ce.find("tr:eq("+o+") td div")[0].offsetTop),Math.max(0,Math.round(i-1+Re*(a%r/r)))}function I(){return De}function B(t){var e=d(t.start);return t.allDay?e:u(e,Qe("defaultEventMinutes"))}function J(t,e){return e?d(t):u(d(t),Qe("slotMinutes"))}function V(t,e,n){n?Qe("allDaySlot")&&k(t,l(d(e),1),!0):X(t,e)}function X(e,n){var r=Qe("selectHelper");if(_e.build(),r){var a=ln(e).col;if(a>=0&&Le>a){var o=_e.rect(0,a,0,a,we),i=q(e,e),s=q(e,n);if(s>i){if(o.top=i,o.height=s-i,o.left+=2,o.width-=5,t.isFunction(r)){var l=r(e,n);l&&(o.position="absolute",o.zIndex=8,Ee=t(l).css(o).appendTo(we))}else o.isStart=!0,o.isEnd=!0,Ee=t(on({title:"",start:e,end:n,className:["fc-select-helper"],editable:!1},o)),Ee.css("opacity",Qe("dragOpacity"));Ee&&(T(Ee),we.append(Ee),S(Ee,o.width,!0),E(Ee,o.height,!0))}}}else z(e,n)}function U(){en(),Ee&&(Ee.remove(),Ee=null)}function Z(e){if(1==e.which&&Qe("selectable")){rn(e);var n;qe.start(function(t,e){if(U(),t&&t.col==e.col&&!L(t)){var r=O(e),a=O(t);n=[r,u(d(r),Ne),a,u(d(a),Ne)].sort(_),X(n[0],n[3])}else n=null},e),t(document).one("mouseup",function(t){qe.stop(),n&&(+n[0]==+n[1]&&$(n[0],!1,t),nn(n[0],n[3],!1,t))})}}function $(t,e,n){Ge("dayClick",oe[ln(t).col],t,e,n)}function Q(t,e){qe.start(function(t){if(en(),t)if(L(t))H(t.row,t.col,t.row,t.col);else{var e=O(t),n=u(d(e),Qe("defaultEventMinutes"));z(e,n)}},e)}function G(t,e,n){var r=qe.stop();en(),r&&Ge("drop",t,O(r),L(r),e,n)}var K=this;K.renderAgenda=o,K.setWidth=D,K.setHeight=m,K.beforeHide=w,K.afterShow=M,K.defaultEventEnd=B,K.timePosition=q,K.getIsCellAllDay=L,K.allDayRow=I,K.getHoverListener=function(){return qe},K.colLeft=F,K.colRight=A,K.colContentLeft=N,K.colContentRight=W,K.getDaySegmentContainer=function(){return pe},K.getSlotSegmentContainer=function(){return Me},K.getMinMinute=function(){return Je},K.getMaxMinute=function(){return Ve},K.getSlotContainer=function(){return we},K.getRowCnt=function(){return 1},K.getColCnt=function(){return Le},K.getColWidth=function(){return ze},K.getSnapHeight=function(){return We},K.getSnapMinutes=function(){return Ne},K.defaultSelectionEnd=J,K.renderDayOverlay=k,K.renderSelection=V,K.clearSelection=U,K.reportDayClick=$,K.dragStart=Q,K.dragStop=G,le.call(K,n,r,a),ve.call(K),de.call(K),ae.call(K);var te,ee,ne,re,oe,ie,se,ce,ue,fe,pe,ye,De,be,we,Me,Ce,Se,Ee,xe,ke,He,ze,Fe,Re,Ne,Ae,We,Le,Oe,_e,qe,Ie,Be,Pe,je,Ye,Je,Ve,Xe,Ue,Ze,$e,Qe=K.opt,Ge=K.trigger,Ke=K.clearEvents,tn=K.renderOverlay,en=K.clearOverlays,nn=K.reportSelection,rn=K.unselect,an=K.daySelectionMousedown,on=K.slotSegHtml,sn=K.cellToDate,ln=K.dateToCell,cn=K.rangeToSegments,un=r.formatDate,fn={};j(n.addClass("fc-agenda")),_e=new he(function(e,n){function r(t){return Math.max(l,Math.min(c,t))}var a,o,i;ne.each(function(e,r){a=t(r),o=a.offset().left,e&&(i[1]=o),i=[o],n[e]=i}),i[1]=o+a.outerWidth(),Qe("allDaySlot")&&(a=De,o=a.offset().top,e[0]=[o,o+a.outerHeight()]);for(var s=we.offset().top,l=be.offset().top,c=l+be.outerHeight(),u=0;Oe*Ae>u;u++)e.push([r(s+We*u),r(s+We*(u+1))])}),qe=new ge(_e),Ie=new me(function(t){return ie.eq(t)}),Be=new me(function(t){return se.eq(t)})}function ae(){function n(t,e){S(t);var n,r=t.length,o=[],i=[];for(n=0;r>n;n++)t[n].allDay?o.push(t[n]):i.push(t[n]);y("allDaySlot")&&(ne(o,e),z()),s(a(i),e),D("eventAfterAllRender")}function r(){k(),F().empty(),N().empty()}function a(e){var n,r,a,s,l,c,f,v=j(),h=L(),g=W(),p=t.map(e,i),m=[];for(r=0;v>r;r++)for(n=I(0,r),u(n,h),a=oe(o(e,p,n,u(d(n),g-h))),ie(a),s=0;a.length>s;s++)for(l=a[s],c=0;l.length>c;c++)f=l[c],f.col=r,f.level=s,m.push(f);return m}function o(t,e,n,r){var a,o,i,s,l,c,u,f,v=[],h=t.length;for(a=0;h>a;a++)o=t[a],i=o.start,s=e[a],s>n&&r>i&&(n>i?(l=d(n),u=!1):(l=i,u=!0),s>r?(c=d(r),f=!1):(c=s,f=!0),v.push({event:o,start:l,end:c,isStart:u,isEnd:f,msLength:c-l}));return v.sort(B)}function i(t){return t.end?d(t.end):u(d(t.start),y("defaultEventMinutes"))}function s(n,r){var a,o,i,s,l,u,d,v,h,g,p,m,b,w,M,C,S,E,k,H=n.length,z="",F=N();for(k=(E=y("isRTL"))?-1:1,a=0;H>a;a++)o=n[a],i=o.event,s=O(o.start,o.start),l=O(o.start,o.end),u=o.col,d=o.level,v=o.forward||0,h=_(u),g=q(u)-h,g=Math.min(g-6,.95*g),p=d?g/(d+v+1):v?2*(g/(v+1)-6):g,m=h+g/(d+v+1)*d*k+(E?g-p:0),o.top=s,o.left=m,o.outerWidth=p,o.outerHeight=l-s,z+=c(i,o);for(F[0].innerHTML=z,b=F.children(),a=0;H>a;a++)o=n[a],i=o.event,w=t(b[a]),M=D("eventRender",i,i,w),M===!1?w.remove():(M&&M!==!0&&(w.remove(),w=t(M).css({position:"absolute",top:o.top,left:o.left}).appendTo(F)),o.element=w,i._id===r?f(i,w,o):w[0]._fci=a,Z(i,w));
for(T(F,n,f),a=0;H>a;a++)o=n[a],(w=o.element)&&(o.vsides=R(w,!0),o.hsides=x(w,!0),C=w.find(".fc-event-title"),C.length&&(o.contentTop=C[0].offsetTop));for(a=0;H>a;a++)o=n[a],(w=o.element)&&(w[0].style.width=Math.max(0,o.outerWidth-o.hsides)+"px",S=Math.max(0,o.outerHeight-o.vsides),w[0].style.height=S+"px",i=o.event,o.contentTop!==e&&10>S-o.contentTop&&(w.find("div.fc-event-time").text(ae(i.start,y("timeFormat"))+" - "+i.title),w.find("div.fc-event-title").remove()),D("eventAfterRender",i,i,w))}function c(t,e){var n="<",r=t.url,a=J(t,y),o=["fc-event","fc-event-vert"];return b(t)&&o.push("fc-event-draggable"),e.isStart&&o.push("fc-event-start"),e.isEnd&&o.push("fc-event-end"),o=o.concat(t.className),t.source&&(o=o.concat(t.source.className||[])),n+=r?"a href='"+P(t.url)+"'":"div",n+=" class='"+o.join(" ")+"'"+" style='position:absolute;z-index:8;top:"+e.top+"px;left:"+e.left+"px;"+a+"'"+">"+"<div class='fc-event-inner'>"+"<div class='fc-event-time'>"+P(se(t.start,t.end,y("timeFormat")))+"</div>"+"<div class='fc-event-title'>"+P(t.title)+"</div>"+"</div>"+"<div class='fc-event-bg'></div>",e.isEnd&&w(t)&&(n+="<div class='ui-resizable-handle ui-resizable-s'>=</div>"),n+="</"+(r?"a":"div")+">"}function f(t,e,n){var r=e.find("div.fc-event-time");b(t)&&g(t,e,r),n.isEnd&&w(t)&&p(t,e,r),H(t,e)}function v(t,e,n){function r(){c||(e.width(a).height("").draggable("option","grid",null),c=!0)}var a,o,i,s=n.isStart,c=!0,u=A(),f=Y(),v=V(),g=X(),p=L();e.draggable({zIndex:9,opacity:y("dragOpacity","month"),revertDuration:y("dragRevertDuration"),start:function(n,p){D("eventDragStart",e,t,n,p),Q(t,e),a=e.width(),u.start(function(n,a){if(ee(),n){o=!1;var u=I(0,a.col),p=I(0,n.col);i=h(p,u),n.row?s?c&&(e.width(f-10),E(e,v*Math.round((t.end?(t.end-t.start)/xe:y("defaultEventMinutes"))/g)),e.draggable("option","grid",[f,1]),c=!1):o=!0:(te(l(d(t.start),i),l(M(t),i)),r()),o=o||c&&!i}else r(),o=!0;e.draggable("option","revert",o)},n,"drag")},stop:function(n,a){if(u.stop(),ee(),D("eventDragStop",e,t,n,a),o)r(),e.css("filter",""),$(t,e);else{var s=0;c||(s=Math.round((e.offset().top-U().offset().top)/v)*g+p-(60*t.start.getHours()+t.start.getMinutes())),G(this,t,i,s,c,n,a)}}})}function g(t,e,n){function r(e){var r,a=u(d(t.start),e);t.end&&(r=u(d(t.end),e)),n.text(se(a,r,y("timeFormat")))}function a(){f&&(n.css("display",""),e.draggable("option","grid",[p,m]),f=!1)}var o,i,s,c,f=!1,v=A(),g=j(),p=Y(),m=V(),b=X();e.draggable({zIndex:9,scroll:!1,grid:[p,m],axis:1==g?"y":!1,opacity:y("dragOpacity"),revertDuration:y("dragRevertDuration"),start:function(r,u){D("eventDragStart",e,t,r,u),Q(t,e),o=e.position(),s=c=0,v.start(function(r,o){if(e.draggable("option","revert",!r),ee(),r){var s=I(0,o.col),c=I(0,r.col);i=h(c,s),y("allDaySlot")&&!r.row?(f||(f=!0,n.hide(),e.draggable("option","grid",null)),te(l(d(t.start),i),l(M(t),i))):a()}},r,"drag")},drag:function(t,e){s=Math.round((e.position.top-o.top)/m)*b,s!=c&&(f||r(s),c=s)},stop:function(n,l){var c=v.stop();ee(),D("eventDragStop",e,t,n,l),c&&(i||s||f)?G(this,t,i,f?0:s,f,n,l):(a(),e.css("filter",""),e.css(o),r(0),$(t,e))}})}function p(t,e,n){var r,a,o=V(),i=X();e.resizable({handles:{s:".ui-resizable-handle"},grid:o,start:function(n,o){r=a=0,Q(t,e),e.css("z-index",9),D("eventResizeStart",this,t,n,o)},resize:function(s,l){r=Math.round((Math.max(o,e.height())-l.originalSize.height)/o),r!=a&&(n.text(se(t.start,r||t.end?u(C(t),i*r):null,y("timeFormat"))),a=r)},stop:function(n,a){D("eventResizeStop",this,t,n,a),r?K(this,t,0,i*r,n,a):(e.css("z-index",8),$(t,e))}})}var m=this;m.renderEvents=n,m.clearEvents=r,m.slotSegHtml=c,ce.call(m);var y=m.opt,D=m.trigger,b=m.isEventDraggable,w=m.isEventResizable,C=m.eventEnd,S=m.reportEvents,k=m.reportEventClear,H=m.eventElementHandlers,z=m.setHeight,F=m.getDaySegmentContainer,N=m.getSlotSegmentContainer,A=m.getHoverListener,W=m.getMaxMinute,L=m.getMinMinute,O=m.timePosition,_=m.colContentLeft,q=m.colContentRight,I=m.cellToDate,B=m.segmentCompare,j=m.getColCnt,Y=m.getColWidth,V=m.getSnapHeight,X=m.getSnapMinutes,U=m.getSlotContainer,Z=m.reportEventElement,$=m.showEvents,Q=m.hideEvents,G=m.eventDrop,K=m.eventResize,te=m.renderDayOverlay,ee=m.clearOverlays,ne=m.renderDayEvents,re=m.calendar,ae=re.formatDate,se=re.formatDates;m.draggableDayEvent=v}function oe(t){var e,n,r,a,o,i=[],s=t.length;for(e=0;s>e;e++){for(n=t[e],r=0;;){if(a=!1,i[r])for(o=0;i[r].length>o;o++)if(se(i[r][o],n)){a=!0;break}if(!a)break;r++}i[r]?i[r].push(n):i[r]=[n]}return i}function ie(t){var e,n,r,a,o,i;for(e=t.length-1;e>0;e--)for(a=t[e],n=0;a.length>n;n++)for(o=a[n],r=0;t[e-1].length>r;r++)i=t[e-1][r],se(o,i)&&(i.forward=Math.max(i.forward||0,(o.forward||0)+1))}function se(t,e){return t.end>e.start&&t.start<e.end}function le(n,r,a){function o(e,n){var r=Z[e];return t.isPlainObject(r)?B(r,n||a):r}function i(t,e){return r.trigger.apply(r,[t,e||I].concat(Array.prototype.slice.call(arguments,2),[I]))}function s(t){return f(t)&&!o("disableDragging")}function c(t){return f(t)&&!o("disableResizing")}function f(t){return X(t.editable,(t.source||{}).editable,o("editable"))}function v(t){J={};var e,n,r=t.length;for(e=0;r>e;e++)n=t[e],J[n._id]?J[n._id].push(n):J[n._id]=[n]}function g(t){return t.end?d(t.end):P(t)}function p(t,e){V.push(e),U[t._id]?U[t._id].push(e):U[t._id]=[e]}function m(){V=[],U={}}function y(t,n){n.click(function(r){return n.hasClass("ui-draggable-dragging")||n.hasClass("ui-resizable-resizing")?e:i("eventClick",this,t,r)}).hover(function(e){i("eventMouseover",this,t,e)},function(e){i("eventMouseout",this,t,e)})}function D(t,e){w(t,e,"show")}function b(t,e){w(t,e,"hide")}function w(t,e,n){var r,a=U[t._id],o=a.length;for(r=0;o>r;r++)e&&a[r][0]==e[0]||a[r][n]()}function M(t,e,n,r,a,o,s){var l=e.allDay,c=e._id;T(J[c],n,r,a),i("eventDrop",t,e,n,r,a,function(){T(J[c],-n,-r,l),Y(c)},o,s),Y(c)}function C(t,e,n,r,a,o){var s=e._id;S(J[s],n,r),i("eventResize",t,e,n,r,function(){S(J[s],-n,-r),Y(s)},a,o),Y(s)}function T(t,n,r,a){r=r||0;for(var o,i=t.length,s=0;i>s;s++)o=t[s],a!==e&&(o.allDay=a),u(l(o.start,n,!0),r),o.end&&(o.end=u(l(o.end,n,!0),r)),j(o,Z)}function S(t,e,n){n=n||0;for(var r,a=t.length,o=0;a>o;o++)r=t[o],r.end=u(l(g(r),e,!0),n),j(r,Z)}function E(t){return"object"==typeof t&&(t=t.getDay()),G[t]}function x(){return $}function k(t,e,n){for(e=e||1;G[(t.getDay()+(n?e:0)+7)%7];)l(t,e)}function H(){var t=z.apply(null,arguments),e=F(t),n=R(e);return n}function z(t,e){var n=I.getColCnt(),r=ee?-1:1,a=ee?n-1:0;"object"==typeof t&&(e=t.col,t=t.row);var o=t*n+(e*r+a);return o}function F(t){var e=I.visStart.getDay();return t+=K[e],7*Math.floor(t/$)+te[(t%$+$)%$]-e}function R(t){var e=d(I.visStart);return l(e,t),e}function N(t){var e=A(t),n=W(e),r=L(n);return r}function A(t){return h(t,I.visStart)}function W(t){var e=I.visStart.getDay();return t+=e,Math.floor(t/7)*$+K[(t%7+7)%7]-K[e]}function L(t){var e=I.getColCnt(),n=ee?-1:1,r=ee?e-1:0,a=Math.floor(t/e),o=(t%e+e)%e*n+r;return{row:a,col:o}}function O(t,e){for(var n=I.getRowCnt(),r=I.getColCnt(),a=[],o=A(t),i=A(e),s=W(o),l=W(i)-1,c=0;n>c;c++){var u=c*r,f=u+r-1,d=Math.max(s,u),v=Math.min(l,f);if(v>=d){var h=L(d),g=L(v),p=[h.col,g.col].sort(),m=F(d)==o,y=F(v)+1==i;a.push({row:c,leftCol:p[0],rightCol:p[1],isStart:m,isEnd:y})}}return a}function _(t,e){return q(t,e)||t.event.start-e.event.start||(t.event.title||"").localeCompare(e.event.title)}function q(t,e){return"msLength"in t?e.msLength-t.msLength:e.rightCol-e.leftCol-(t.rightCol-t.leftCol)||e.event.allDay-t.event.allDay}var I=this;I.element=n,I.calendar=r,I.name=a,I.opt=o,I.trigger=i,I.isEventDraggable=s,I.isEventResizable=c,I.reportEvents=v,I.eventEnd=g,I.reportEventElement=p,I.reportEventClear=m,I.eventElementHandlers=y,I.showEvents=D,I.hideEvents=b,I.eventDrop=M,I.eventResize=C;var P=I.defaultEventEnd,j=r.normalizeEvent,Y=r.reportEventChange,J={},V=[],U={},Z=r.options;I.isHiddenDay=E,I.skipHiddenDays=k,I.getCellsPerWeek=x,I.dateToCell=N,I.dateToDayOffset=A,I.dayOffsetToCellOffset=W,I.cellOffsetToCell=L,I.cellToDate=H,I.cellToCellOffset=z,I.cellOffsetToDayOffset=F,I.dayOffsetToDate=R,I.rangeToSegments=O,I.segmentCompare=_;var $,Q=o("hiddenDays")||[],G=[],K=[],te=[],ee=o("isRTL");(function(){o("weekends")===!1&&Q.push(0,6);for(var e=0,n=0;7>e;e++)K[e]=n,G[e]=-1!=t.inArray(e,Q),G[e]||(te[n]=e,n++);if($=n,!$)throw"invalid hiddenDays"})()}function ce(){function e(t,e){var n=r(t,!1,!0);fe(n,function(t,e){R(t.event,e)}),D(n,e),fe(n,function(t,e){k("eventAfterRender",t.event,t.event,e)})}function n(t,e,n){var a=r([t],!0,!1),o=[];return fe(a,function(t,r){t.row===e&&r.css("top",n),o.push(r[0])}),o}function r(e,n,r){var o,l,c=Z(),d=n?t("<div/>"):c,v=a(e);return i(v),o=s(v),d[0].innerHTML=o,l=d.children(),n&&c.append(l),u(v,l),fe(v,function(t,e){t.hsides=x(e,!0)}),fe(v,function(t,e){e.width(Math.max(0,t.outerWidth-t.hsides))}),fe(v,function(t,e){t.outerHeight=e.outerHeight(!0)}),f(v,r),v}function a(t){for(var e=[],n=0;t.length>n;n++){var r=o(t[n]);e.push.apply(e,r)}return e}function o(t){for(var e=t.start,n=M(t),r=ee(e,n),a=0;r.length>a;a++)r[a].event=t;return r}function i(t){for(var e=E("isRTL"),n=0;t.length>n;n++){var r=t[n],a=(e?r.isEnd:r.isStart)?X:Y,o=(e?r.isStart:r.isEnd)?U:V,i=a(r.leftCol),s=o(r.rightCol);r.left=i,r.outerWidth=s-i}}function s(t){for(var e="",n=0;t.length>n;n++)e+=c(t[n]);return e}function c(t){var e="",n=E("isRTL"),r=t.event,a=r.url,o=["fc-event","fc-event-hori"];H(r)&&o.push("fc-event-draggable"),t.isStart&&o.push("fc-event-start"),t.isEnd&&o.push("fc-event-end"),o=o.concat(r.className),r.source&&(o=o.concat(r.source.className||[]));var i=J(r,E);return e+=a?"<a href='"+P(a)+"'":"<div",e+=" class='"+o.join(" ")+"'"+" style="+"'"+"position:absolute;"+"z-index:8;"+"left:"+t.left+"px;"+i+"'"+">"+"<div class='fc-event-inner'>",!r.allDay&&t.isStart&&(e+="<span class='fc-event-time'>"+P($(r.start,r.end,E("timeFormat")))+"</span>"),e+="<span class='fc-event-title'>"+P(r.title)+"</span>"+"</div>",t.isEnd&&z(r)&&(e+="<div class='ui-resizable-handle ui-resizable-"+(n?"w":"e")+"'>"+"&nbsp;&nbsp;&nbsp;"+"</div>"),e+="</"+(a?"a":"div")+">"}function u(e,n){for(var r=0;e.length>r;r++){var a=e[r],o=a.event,i=n.eq(r),s=k("eventRender",o,o,i);s===!1?i.remove():(s&&s!==!0&&(s=t(s).css({position:"absolute",zIndex:8,left:a.left}),i.replaceWith(s),i=s),a.element=i)}}function f(t,e){var n=v(t),r=y(),a=[];if(e)for(var o=0;r.length>o;o++)r[o].height(n[o]);for(var o=0;r.length>o;o++)a.push(r[o].position().top);fe(t,function(t,e){e.css("top",a[t.row]+t.top)})}function v(t){for(var e=_(),n=I(),r=[],a=g(t),o=0;e>o;o++){for(var i=a[o],s=[],l=0;n>l;l++)s.push(0);for(var c=0;i.length>c;c++){var u=i[c];u.top=q(s.slice(u.leftCol,u.rightCol+1));for(var l=u.leftCol;u.rightCol>=l;l++)s[l]=u.top+u.outerHeight}r.push(q(s))}return r}function g(t){var e,n,r,a=_(),o=[];for(e=0;t.length>e;e++)n=t[e],r=n.row,n.element&&(o[r]?o[r].push(n):o[r]=[n]);for(r=0;a>r;r++)o[r]=p(o[r]||[]);return o}function p(t){for(var e=[],n=m(t),r=0;n.length>r;r++)e.push.apply(e,n[r]);return e}function m(t){t.sort(ne);for(var e=[],n=0;t.length>n;n++){for(var r=t[n],a=0;e.length>a&&ue(r,e[a]);a++);e[a]?e[a].push(r):e[a]=[r]}return e}function y(){var t,e=_(),n=[];for(t=0;e>t;t++)n[t]=B(t).find("div.fc-day-content > div");return n}function D(t,e){var n=Z();fe(t,function(t,n,r){var a=t.event;a._id===e?b(a,n,t):n[0]._fci=r}),T(n,t,b)}function b(t,e,n){H(t)&&S.draggableDayEvent(t,e,n),n.isEnd&&z(t)&&S.resizableDayEvent(t,e,n),N(t,e)}function w(t,e){var n,r=te();e.draggable({zIndex:9,delay:50,opacity:E("dragOpacity"),revertDuration:E("dragRevertDuration"),start:function(a,o){k("eventDragStart",e,t,a,o),W(t,e),r.start(function(r,a,o,i){if(e.draggable("option","revert",!r||!o&&!i),G(),r){var s=re(a),c=re(r);n=h(c,s),Q(l(d(t.start),n),l(M(t),n))}else n=0},a,"drag")},stop:function(a,o){r.stop(),G(),k("eventDragStop",e,t,a,o),n?L(this,t,n,0,t.allDay,a,o):(e.css("filter",""),A(t,e))}})}function C(e,r,a){var o=E("isRTL"),i=o?"w":"e",s=r.find(".ui-resizable-"+i),c=!1;j(r),r.mousedown(function(t){t.preventDefault()}).click(function(t){c&&(t.preventDefault(),t.stopImmediatePropagation())}),s.mousedown(function(o){function s(n){k("eventResizeStop",this,e,n),t("body").css("cursor",""),u.stop(),G(),f&&O(this,e,f,0,n),setTimeout(function(){c=!1},0)}if(1==o.which){c=!0;var u=te();_(),I();var f,d,v=r.css("top"),h=t.extend({},e),g=se(ie(e.start));K(),t("body").css("cursor",i+"-resize").one("mouseup",s),k("eventResizeStart",this,e,o),u.start(function(r,o){if(r){var s=ae(o),c=ae(r);if(c=Math.max(c,g),f=oe(c)-oe(s)){h.end=l(F(e),f,!0);var u=d;d=n(h,a.row,v),d=t(d),d.find("*").css("cursor",i+"-resize"),u&&u.remove(),W(e)}else d&&(A(e),d.remove(),d=null);G(),Q(e.start,l(M(e),f))}},o)}})}var S=this;S.renderDayEvents=e,S.draggableDayEvent=w,S.resizableDayEvent=C;var E=S.opt,k=S.trigger,H=S.isEventDraggable,z=S.isEventResizable,F=S.eventEnd,R=S.reportEventElement,N=S.eventElementHandlers,A=S.showEvents,W=S.hideEvents,L=S.eventDrop,O=S.eventResize,_=S.getRowCnt,I=S.getColCnt;S.getColWidth;var B=S.allDayRow,Y=S.colLeft,V=S.colRight,X=S.colContentLeft,U=S.colContentRight;S.dateToCell;var Z=S.getDaySegmentContainer,$=S.calendar.formatDates,Q=S.renderDayOverlay,G=S.clearOverlays,K=S.clearSelection,te=S.getHoverListener,ee=S.rangeToSegments,ne=S.segmentCompare,re=S.cellToDate,ae=S.cellToCellOffset,oe=S.cellOffsetToDayOffset,ie=S.dateToDayOffset,se=S.dayOffsetToCellOffset}function ue(t,e){for(var n=0;e.length>n;n++){var r=e[n];if(r.leftCol<=t.rightCol&&r.rightCol>=t.leftCol)return!0}return!1}function fe(t,e){for(var n=0;t.length>n;n++){var r=t[n],a=r.element;a&&e(r,a,n)}}function de(){function e(t,e,a){n(),e||(e=l(t,a)),c(t,e,a),r(t,e,a)}function n(t){f&&(f=!1,u(),s("unselect",null,t))}function r(t,e,n,r){f=!0,s("select",null,t,e,n,r)}function a(e){var a=o.cellToDate,s=o.getIsCellAllDay,l=o.getHoverListener(),f=o.reportDayClick;if(1==e.which&&i("selectable")){n(e);var d;l.start(function(t,e){u(),t&&s(t)?(d=[a(e),a(t)].sort(_),c(d[0],d[1],!0)):d=null},e),t(document).one("mouseup",function(t){l.stop(),d&&(+d[0]==+d[1]&&f(d[0],!0,t),r(d[0],d[1],!0,t))})}}var o=this;o.select=e,o.unselect=n,o.reportSelection=r,o.daySelectionMousedown=a;var i=o.opt,s=o.trigger,l=o.defaultSelectionEnd,c=o.renderSelection,u=o.clearSelection,f=!1;i("selectable")&&i("unselectAuto")&&t(document).mousedown(function(e){var r=i("unselectCancel");r&&t(e.target).parents(r).length||n(e)})}function ve(){function e(e,n){var r=o.shift();return r||(r=t("<div class='fc-cell-overlay' style='position:absolute;z-index:3'/>")),r[0].parentNode!=n[0]&&r.appendTo(n),a.push(r.css(e).show()),r}function n(){for(var t;t=a.shift();)o.push(t.hide().unbind())}var r=this;r.renderOverlay=e,r.clearOverlays=n;var a=[],o=[]}function he(t){var e,n,r=this;r.build=function(){e=[],n=[],t(e,n)},r.cell=function(t,r){var a,o=e.length,i=n.length,s=-1,l=-1;for(a=0;o>a;a++)if(r>=e[a][0]&&e[a][1]>r){s=a;break}for(a=0;i>a;a++)if(t>=n[a][0]&&n[a][1]>t){l=a;break}return s>=0&&l>=0?{row:s,col:l}:null},r.rect=function(t,r,a,o,i){var s=i.offset();return{top:e[t][0]-s.top,left:n[r][0]-s.left,width:n[o][1]-n[r][0],height:e[a][1]-e[t][0]}}}function ge(e){function n(t){pe(t);var n=e.cell(t.pageX,t.pageY);(!n!=!i||n&&(n.row!=i.row||n.col!=i.col))&&(n?(o||(o=n),a(n,o,n.row-o.row,n.col-o.col)):a(n,o),i=n)}var r,a,o,i,s=this;s.start=function(s,l,c){a=s,o=i=null,e.build(),n(l),r=c||"mousemove",t(document).bind(r,n)},s.stop=function(){return t(document).unbind(r,n),i}}function pe(t){t.pageX===e&&(t.pageX=t.originalEvent.pageX,t.pageY=t.originalEvent.pageY)}function me(t){function n(e){return a[e]=a[e]||t(e)}var r=this,a={},o={},i={};r.left=function(t){return o[t]=o[t]===e?n(t).position().left:o[t]},r.right=function(t){return i[t]=i[t]===e?r.left(t)+n(t).width():i[t]},r.clear=function(){a={},o={},i={}}}var ye={defaultView:"month",aspectRatio:1.35,header:{left:"title",center:"",right:"today prev,next"},weekends:!0,weekNumbers:!1,weekNumberCalculation:"iso",weekNumberTitle:"W",allDayDefault:!0,ignoreTimezone:!0,lazyFetching:!0,startParam:"start",endParam:"end",titleFormat:{month:"MMMM yyyy",week:"MMM d[ yyyy]{ '&#8212;'[ MMM] d yyyy}",day:"dddd, MMM d, yyyy"},columnFormat:{month:"ddd",week:"ddd M/d",day:"dddd M/d"},timeFormat:{"":"h(:mm)t"},isRTL:!1,firstDay:0,monthNames:["January","February","March","April","May","June","July","August","September","October","November","December"],monthNamesShort:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],dayNames:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],dayNamesShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],buttonText:{prev:"<span class='fc-text-arrow'>&lsaquo;</span>",next:"<span class='fc-text-arrow'>&rsaquo;</span>",prevYear:"<span class='fc-text-arrow'>&laquo;</span>",nextYear:"<span class='fc-text-arrow'>&raquo;</span>",today:"today",month:"month",week:"week",day:"day"},theme:!1,buttonIcons:{prev:"circle-triangle-w",next:"circle-triangle-e"},unselectAuto:!0,dropAccept:"*"},De={header:{left:"next,prev today",center:"",right:"title"},buttonText:{prev:"<span class='fc-text-arrow'>&rsaquo;</span>",next:"<span class='fc-text-arrow'>&lsaquo;</span>",prevYear:"<span class='fc-text-arrow'>&raquo;</span>",nextYear:"<span class='fc-text-arrow'>&laquo;</span>"},buttonIcons:{prev:"circle-triangle-e",next:"circle-triangle-w"}},be=t.fullCalendar={version:"1.6.2"},we=be.views={};t.fn.fullCalendar=function(n){if("string"==typeof n){var a,o=Array.prototype.slice.call(arguments,1);return this.each(function(){var r=t.data(this,"fullCalendar");if(r&&t.isFunction(r[n])){var i=r[n].apply(r,o);a===e&&(a=i),"destroy"==n&&t.removeData(this,"fullCalendar")}}),a!==e?a:this}var i=n.eventSources||[];return delete n.eventSources,n.events&&(i.push(n.events),delete n.events),n=t.extend(!0,{},ye,n.isRTL||n.isRTL===e&&ye.isRTL?De:{},n),this.each(function(e,a){var o=t(a),s=new r(o,n,i);o.data("fullCalendar",s),s.render()}),this},be.sourceNormalizers=[],be.sourceFetchers=[];var Me={dataType:"json",cache:!1},Ce=1;be.addDays=l,be.cloneDate=d,be.parseDate=p,be.parseISO8601=m,be.parseTime=y,be.formatDate=D,be.formatDates=b;var Te=["sun","mon","tue","wed","thu","fri","sat"],Se=864e5,Ee=36e5,xe=6e4,ke={s:function(t){return t.getSeconds()},ss:function(t){return I(t.getSeconds())},m:function(t){return t.getMinutes()},mm:function(t){return I(t.getMinutes())},h:function(t){return t.getHours()%12||12},hh:function(t){return I(t.getHours()%12||12)},H:function(t){return t.getHours()},HH:function(t){return I(t.getHours())},d:function(t){return t.getDate()},dd:function(t){return I(t.getDate())},ddd:function(t,e){return e.dayNamesShort[t.getDay()]},dddd:function(t,e){return e.dayNames[t.getDay()]},M:function(t){return t.getMonth()+1},MM:function(t){return I(t.getMonth()+1)},MMM:function(t,e){return e.monthNamesShort[t.getMonth()]},MMMM:function(t,e){return e.monthNames[t.getMonth()]},yy:function(t){return(t.getFullYear()+"").substring(2)},yyyy:function(t){return t.getFullYear()},t:function(t){return 12>t.getHours()?"a":"p"},tt:function(t){return 12>t.getHours()?"am":"pm"},T:function(t){return 12>t.getHours()?"A":"P"},TT:function(t){return 12>t.getHours()?"AM":"PM"},u:function(t){return D(t,"yyyy-MM-dd'T'HH:mm:ss'Z'")},S:function(t){var e=t.getDate();return e>10&&20>e?"th":["st","nd","rd"][e%10-1]||"th"},w:function(t,e){return e.weekNumberCalculation(t)},W:function(t){return w(t)}};be.dateFormatters=ke,be.applyAll=V,we.month=U,we.basicWeek=Z,we.basicDay=$,n({weekMode:"fixed"}),we.agendaWeek=K,we.agendaDay=te,we.agendaList=ee,ye.buttonText.agendaList="Agenda",ye.titleFormat.agendaList="MMMM yyyy",ye.agendaDisType=!0,n({allDaySlot:!0,allDayText:"all-day",firstHour:6,slotMinutes:30,defaultEventMinutes:120,axisFormat:"h(:mm)tt",timeFormat:{agenda:"h:mm{ - h:mm}"},dragOpacity:{agenda:.5},minTime:0,maxTime:24})})(jQuery);;/*!
 * FullCalendar v1.6.1 Google Calendar Plugin
 * Docs & License: http://arshaw.com/fullcalendar/
 * (c) 2013 Adam Shaw
 */
 
(function($) {


var fc = $.fullCalendar;
var formatDate = fc.formatDate;
var parseISO8601 = fc.parseISO8601;
var addDays = fc.addDays;
var applyAll = fc.applyAll;


fc.sourceNormalizers.push(function(sourceOptions) {
	if (sourceOptions.dataType == 'gcal' ||
		sourceOptions.dataType === undefined &&
		(sourceOptions.url || '').match(/^(http|https):\/\/www.google.com\/calendar\/feeds\//)) {
			sourceOptions.dataType = 'gcal';
			if (sourceOptions.editable === undefined) {
				sourceOptions.editable = false;
			}
		}
});


fc.sourceFetchers.push(function(sourceOptions, start, end) {
	if (sourceOptions.dataType == 'gcal') {
		return transformOptions(sourceOptions, start, end);
	}
});


function transformOptions(sourceOptions, start, end) {

	var success = sourceOptions.success;
	var data = $.extend({}, sourceOptions.data || {}, {
		'start-min': formatDate(start, 'u'),
		'start-max': formatDate(end, 'u'),
		'singleevents': true,
		'max-results': 9999
	});
	
	var ctz = sourceOptions.currentTimezone;
	if (ctz) {
		data.ctz = ctz = ctz.replace(' ', '_');
	}

	return $.extend({}, sourceOptions, {
		url: sourceOptions.url.replace(/\/basic$/, '/full') + '?alt=json-in-script&callback=?',
		dataType: 'jsonp',
		data: data,
		startParam: false,
		endParam: false,
		success: function(data) {
			var events = [];
			if (data.feed.entry) {
				$.each(data.feed.entry, function(i, entry) {
					var startStr = entry['gd$when'][0]['startTime'];
					var start = parseISO8601(startStr, true);
					var end = parseISO8601(entry['gd$when'][0]['endTime'], true);
					var allDay = startStr.indexOf('T') == -1;
					var url;
					$.each(entry.link, function(i, link) {
						if (link.type == 'text/html') {
							url = link.href;
							if (ctz) {
								url += (url.indexOf('?') == -1 ? '?' : '&') + 'ctz=' + ctz;
							}
						}
					});
					if (allDay) {
						addDays(end, -1); // make inclusive
					}
					events.push({
						id: entry['gCal$uid']['value'],
						title: entry['title']['$t'],
						url: url,
						start: start,
						end: end,
						allDay: allDay,
						location: entry['gd$where'][0]['valueString'],
						description: entry['content']['$t']
					});
				});
			}
			var args = [events].concat(Array.prototype.slice.call(arguments, 1));
			var res = applyAll(success, this, args);
			if ($.isArray(res)) {
				return res;
			}
			return events;
		}
	});
	
}


// legacy
fc.gcalFeed = function(url, sourceOptions) {
	return $.extend({}, sourceOptions, { url: url, dataType: 'gcal' });
};


})(jQuery);
;/* ===================================================
 * bootstrap-transition.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#transitions
 * ===================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* CSS TRANSITION SUPPORT (http://www.modernizr.com/)
     * ======================================================= */

    $(function () {

        $.support.transition = (function () {

            var transitionEnd = (function () {

                var el = document.createElement('bootstrap')
                    , transEndEventNames = {
                        'WebkitTransition' : 'webkitTransitionEnd'
                        ,  'MozTransition'    : 'transitionend'
                        ,  'OTransition'      : 'oTransitionEnd otransitionend'
                        ,  'transition'       : 'transitionend'
                    }
                    , name

                for (name in transEndEventNames){
                    if (el.style[name] !== undefined) {
                        return transEndEventNames[name]
                    }
                }

            }())

            return transitionEnd && {
                end: transitionEnd
            }

        })()

    })

}(window.jQuery);/* ==========================================================
 * bootstrap-alert.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#alerts
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* ALERT CLASS DEFINITION
     * ====================== */

    var dismiss = '[data-dismiss="alert"]'
        , Alert = function (el) {
            $(el).on('click', dismiss, this.close)
        }

    Alert.prototype.close = function (e) {
        var $this = $(this)
            , selector = $this.attr('data-target')
            , $parent

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
        }

        $parent = $(selector)

        e && e.preventDefault()

        $parent.length || ($parent = $this.hasClass('alert') ? $this : $this.parent())

        $parent.trigger(e = $.Event('close'))

        if (e.isDefaultPrevented()) return

        $parent.removeClass('in')

        function removeElement() {
            $parent
                .trigger('closed')
                .remove()
        }

        $.support.transition && $parent.hasClass('fade') ?
            $parent.on($.support.transition.end, removeElement) :
            removeElement()
    }


    /* ALERT PLUGIN DEFINITION
     * ======================= */

    var old = $.fn.alert

    $.fn.alert = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('alert')
            if (!data) $this.data('alert', (data = new Alert(this)))
            if (typeof option == 'string') data[option].call($this)
        })
    }

    $.fn.alert.Constructor = Alert


    /* ALERT NO CONFLICT
     * ================= */

    $.fn.alert.noConflict = function () {
        $.fn.alert = old
        return this
    }


    /* ALERT DATA-API
     * ============== */

    $(document).on('click.alert.data-api', dismiss, Alert.prototype.close)

}(window.jQuery);/* ============================================================
 * bootstrap-button.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#buttons
 * ============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

    "use strict"; // jshint ;_;


    /* BUTTON PUBLIC CLASS DEFINITION
     * ============================== */

    var Button = function (element, options) {
        this.$element = $(element)
        this.options = $.extend({}, $.fn.button.defaults, options)
    }

    Button.prototype.setState = function (state) {
        var d = 'disabled'
            , $el = this.$element
            , data = $el.data()
            , val = $el.is('input') ? 'val' : 'html'

        state = state + 'Text'
        data.resetText || $el.data('resetText', $el[val]())

        $el[val](data[state] || this.options[state])

        // push to event loop to allow forms to submit
        setTimeout(function () {
            state == 'loadingText' ?
                $el.addClass(d).attr(d, d) :
                $el.removeClass(d).removeAttr(d)
        }, 0)
    }

    Button.prototype.toggle = function () {
        var $parent = this.$element.closest('[data-toggle="buttons-radio"]')

        $parent && $parent
            .find('.active')
            .removeClass('active')

        this.$element.toggleClass('active')
    }


    /* BUTTON PLUGIN DEFINITION
     * ======================== */

    var old = $.fn.button

    $.fn.button = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('button')
                , options = typeof option == 'object' && option
            if (!data) $this.data('button', (data = new Button(this, options)))
            if (option == 'toggle') data.toggle()
            else if (option) data.setState(option)
        })
    }

    $.fn.button.defaults = {
        loadingText: 'loading...'
    }

    $.fn.button.Constructor = Button


    /* BUTTON NO CONFLICT
     * ================== */

    $.fn.button.noConflict = function () {
        $.fn.button = old
        return this
    }


    /* BUTTON DATA-API
     * =============== */

    $(document).on('click.button.data-api', '[data-toggle^=button]', function (e) {
        var $btn = $(e.target)
        if (!$btn.hasClass('btn')) $btn = $btn.closest('.btn')
        $btn.button('toggle')
    })

}(window.jQuery);/* ==========================================================
 * bootstrap-carousel.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#carousel
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* CAROUSEL CLASS DEFINITION
     * ========================= */

    var Carousel = function (element, options) {
        this.$element = $(element)
        this.$indicators = this.$element.find('.carousel-indicators')
        this.options = options
        this.options.pause == 'hover' && this.$element
            .on('mouseenter', $.proxy(this.pause, this))
            .on('mouseleave', $.proxy(this.cycle, this))
    }

    Carousel.prototype = {

        cycle: function (e) {
            if (!e) this.paused = false
            if (this.interval) clearInterval(this.interval);
            this.options.interval
                && !this.paused
            && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))
            return this
        }

        , getActiveIndex: function () {
            this.$active = this.$element.find('.item.active')
            this.$items = this.$active.parent().children()
            return this.$items.index(this.$active)
        }

        , to: function (pos) {
            var activeIndex = this.getActiveIndex()
                , that = this

            if (pos > (this.$items.length - 1) || pos < 0) return

            if (this.sliding) {
                return this.$element.one('slid', function () {
                    that.to(pos)
                })
            }

            if (activeIndex == pos) {
                return this.pause().cycle()
            }

            return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]))
        }

        , pause: function (e) {
            if (!e) this.paused = true
            if (this.$element.find('.next, .prev').length && $.support.transition.end) {
                this.$element.trigger($.support.transition.end)
                this.cycle(true)
            }
            clearInterval(this.interval)
            this.interval = null
            return this
        }

        , next: function () {
            if (this.sliding) return
            return this.slide('next')
        }

        , prev: function () {
            if (this.sliding) return
            return this.slide('prev')
        }

        , slide: function (type, next) {
            var $active = this.$element.find('.item.active')
                , $next = next || $active[type]()
                , isCycling = this.interval
                , direction = type == 'next' ? 'left' : 'right'
                , fallback  = type == 'next' ? 'first' : 'last'
                , that = this
                , e

            this.sliding = true

            isCycling && this.pause()

            $next = $next.length ? $next : this.$element.find('.item')[fallback]()

            e = $.Event('slide', {
                relatedTarget: $next[0]
                , direction: direction
            })

            if ($next.hasClass('active')) return

            if (this.$indicators.length) {
                this.$indicators.find('.active').removeClass('active')
                this.$element.one('slid', function () {
                    var $nextIndicator = $(that.$indicators.children()[that.getActiveIndex()])
                    $nextIndicator && $nextIndicator.addClass('active')
                })
            }

            if ($.support.transition && this.$element.hasClass('slide')) {
                this.$element.trigger(e)
                if (e.isDefaultPrevented()) return
                $next.addClass(type)
                $next[0].offsetWidth // force reflow
                $active.addClass(direction)
                $next.addClass(direction)
                this.$element.one($.support.transition.end, function () {
                    $next.removeClass([type, direction].join(' ')).addClass('active')
                    $active.removeClass(['active', direction].join(' '))
                    that.sliding = false
                    setTimeout(function () { that.$element.trigger('slid') }, 0)
                })
            } else {
                this.$element.trigger(e)
                if (e.isDefaultPrevented()) return
                $active.removeClass('active')
                $next.addClass('active')
                this.sliding = false
                this.$element.trigger('slid')
            }

            isCycling && this.cycle()

            return this
        }

    }


    /* CAROUSEL PLUGIN DEFINITION
     * ========================== */

    var old = $.fn.carousel

    $.fn.carousel = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('carousel')
                , options = $.extend({}, $.fn.carousel.defaults, typeof option == 'object' && option)
                , action = typeof option == 'string' ? option : options.slide
            if (!data) $this.data('carousel', (data = new Carousel(this, options)))
            if (typeof option == 'number') data.to(option)
            else if (action) data[action]()
            else if (options.interval) data.pause().cycle()
        })
    }

    $.fn.carousel.defaults = {
        interval: 5000
        , pause: 'hover'
    }

    $.fn.carousel.Constructor = Carousel


    /* CAROUSEL NO CONFLICT
     * ==================== */

    $.fn.carousel.noConflict = function () {
        $.fn.carousel = old
        return this
    }

    /* CAROUSEL DATA-API
     * ================= */

    $(document).on('click.carousel.data-api', '[data-slide], [data-slide-to]', function (e) {
        var $this = $(this), href
            , $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
            , options = $.extend({}, $target.data(), $this.data())
            , slideIndex

        $target.carousel(options)

        if (slideIndex = $this.attr('data-slide-to')) {
            $target.data('carousel').pause().to(slideIndex).cycle()
        }

        e.preventDefault()
    })

}(window.jQuery);/* =============================================================
 * bootstrap-collapse.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#collapse
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

    "use strict"; // jshint ;_;


    /* COLLAPSE PUBLIC CLASS DEFINITION
     * ================================ */

    var Collapse = function (element, options) {
        this.$element = $(element)
        this.options = $.extend({}, $.fn.collapse.defaults, options)

        if (this.options.parent) {
            this.$parent = $(this.options.parent)
        }

        this.options.toggle && this.toggle()
    }

    Collapse.prototype = {

        constructor: Collapse

        , dimension: function () {
            var hasWidth = this.$element.hasClass('width')
            return hasWidth ? 'width' : 'height'
        }

        , show: function () {
            var dimension
                , scroll
                , actives
                , hasData

            if (this.transitioning || this.$element.hasClass('in')) return

            dimension = this.dimension()
            scroll = $.camelCase(['scroll', dimension].join('-'))
            actives = this.$parent && this.$parent.find('> .accordion-group > .in')

            if (actives && actives.length) {
                hasData = actives.data('collapse')
                if (hasData && hasData.transitioning) return
                actives.collapse('hide')
                hasData || actives.data('collapse', null)
            }

            this.$element[dimension](0)
            this.transition('addClass', $.Event('show'), 'shown')
            $.support.transition && this.$element[dimension](this.$element[0][scroll])
        }

        , hide: function () {
            var dimension
            if (this.transitioning || !this.$element.hasClass('in')) return
            dimension = this.dimension()
            this.reset(this.$element[dimension]())
            this.transition('removeClass', $.Event('hide'), 'hidden')
            this.$element[dimension](0)
        }

        , reset: function (size) {
            var dimension = this.dimension()

            this.$element
                .removeClass('collapse')
                [dimension](size || 'auto')
                [0].offsetWidth

            this.$element[size !== null ? 'addClass' : 'removeClass']('collapse')

            return this
        }

        , transition: function (method, startEvent, completeEvent) {
            var that = this
                , complete = function () {
                    if (startEvent.type == 'show') that.reset()
                    that.transitioning = 0
                    that.$element.trigger(completeEvent)
                }

            this.$element.trigger(startEvent)

            if (startEvent.isDefaultPrevented()) return

            this.transitioning = 1

            this.$element[method]('in')

            $.support.transition && this.$element.hasClass('collapse') ?
                this.$element.one($.support.transition.end, complete) :
                complete()
        }

        , toggle: function () {
            this[this.$element.hasClass('in') ? 'hide' : 'show']()
        }

    }


    /* COLLAPSE PLUGIN DEFINITION
     * ========================== */

    var old = $.fn.collapse

    $.fn.collapse = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('collapse')
                , options = $.extend({}, $.fn.collapse.defaults, $this.data(), typeof option == 'object' && option)
            if (!data) $this.data('collapse', (data = new Collapse(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.collapse.defaults = {
        toggle: true
    }

    $.fn.collapse.Constructor = Collapse


    /* COLLAPSE NO CONFLICT
     * ==================== */

    $.fn.collapse.noConflict = function () {
        $.fn.collapse = old
        return this
    }


    /* COLLAPSE DATA-API
     * ================= */

    $(document).on('click.collapse.data-api', '[data-toggle=collapse]', function (e) {
        var $this = $(this), href
            , target = $this.attr('data-target')
                || e.preventDefault()
                || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') //strip for ie7
            , option = $(target).data('collapse') ? 'toggle' : $this.data()
        $this[$(target).hasClass('in') ? 'addClass' : 'removeClass']('collapsed')
        $(target).collapse(option)
    })

}(window.jQuery);/* ============================================================
 * bootstrap-dropdown.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#dropdowns
 * ============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

    "use strict"; // jshint ;_;


    /* DROPDOWN CLASS DEFINITION
     * ========================= */

    var toggle = '[data-toggle=dropdown]'
        , Dropdown = function (element) {
            var $el = $(element).on('click.dropdown.data-api', this.toggle)
            $('html').on('click.dropdown.data-api', function () {
                $el.parent().removeClass('open')
            })
        }

    Dropdown.prototype = {

        constructor: Dropdown

        , toggle: function (e) {
            var $this = $(this)
                , $parent
                , isActive

            if ($this.is('.disabled, :disabled')) return

            $parent = getParent($this)

            isActive = $parent.hasClass('open')

            clearMenus()

            if (!isActive) {
                if ('ontouchstart' in document.documentElement) {
                    // if mobile we we use a backdrop because click events don't delegate
                    $('<div class="dropdown-backdrop"/>').insertBefore($(this)).on('click', clearMenus)
                }
                $parent.toggleClass('open')
            }

            $this.focus()

            return false
        }

        , keydown: function (e) {
            var $this
                , $items
                , $active
                , $parent
                , isActive
                , index

            if (!/(38|40|27)/.test(e.keyCode)) return

            $this = $(this)

            e.preventDefault()
            e.stopPropagation()

            if ($this.is('.disabled, :disabled')) return

            $parent = getParent($this)

            isActive = $parent.hasClass('open')

            if (!isActive || (isActive && e.keyCode == 27)) {
                if (e.which == 27) $parent.find(toggle).focus()
                return $this.click()
            }

            $items = $('[role=menu] li:not(.divider):visible a', $parent)

            if (!$items.length) return

            index = $items.index($items.filter(':focus'))

            if (e.keyCode == 38 && index > 0) index--                                        // up
            if (e.keyCode == 40 && index < $items.length - 1) index++                        // down
            if (!~index) index = 0

            $items
                .eq(index)
                .focus()
        }

    }

    function clearMenus() {
        $('.dropdown-backdrop').remove()
        $(toggle).each(function () {
            getParent($(this)).removeClass('open')
        })
    }

    function getParent($this) {
        var selector = $this.attr('data-target')
            , $parent

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
        }

        $parent = selector && $(selector)

        if (!$parent || !$parent.length) $parent = $this.parent()

        return $parent
    }


    /* DROPDOWN PLUGIN DEFINITION
     * ========================== */

    var old = $.fn.dropdown

    $.fn.dropdown = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('dropdown')
            if (!data) $this.data('dropdown', (data = new Dropdown(this)))
            if (typeof option == 'string') data[option].call($this)
        })
    }

    $.fn.dropdown.Constructor = Dropdown


    /* DROPDOWN NO CONFLICT
     * ==================== */

    $.fn.dropdown.noConflict = function () {
        $.fn.dropdown = old
        return this
    }


    /* APPLY TO STANDARD DROPDOWN ELEMENTS
     * =================================== */

    $(document)
        .on('click.dropdown.data-api', clearMenus)
        .on('click.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
        .on('click.dropdown.data-api'  , toggle, Dropdown.prototype.toggle)
        .on('keydown.dropdown.data-api', toggle + ', [role=menu]' , Dropdown.prototype.keydown)

}(window.jQuery);
/* =========================================================
 * bootstrap-modal.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#modals
 * =========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */


!function ($) {

    "use strict"; // jshint ;_;


    /* MODAL CLASS DEFINITION
     * ====================== */

    var Modal = function (element, options) {
        this.options = options
        this.$element = $(element)
            .delegate('[data-dismiss="modal"]', 'click.dismiss.modal', $.proxy(this.hide, this))
        this.options.remote && this.$element.find('.modal-body').load(this.options.remote)
    }

    Modal.prototype = {

        constructor: Modal

        , toggle: function () {
            return this[!this.isShown ? 'show' : 'hide']()
        }

        , show: function () {
            var that = this
                , e = $.Event('show')

            this.$element.trigger(e)

            if (this.isShown || e.isDefaultPrevented()) return

            this.isShown = true

            this.escape()

            this.backdrop(function () {
                var transition = $.support.transition && that.$element.hasClass('fade')

                if (!that.$element.parent().length) {
                    that.$element.appendTo(document.body) //don't move modals dom position
                }

                that.$element.show()

                if (transition) {
                    that.$element[0].offsetWidth // force reflow
                }

                that.$element
                    .addClass('in')
                    .attr('aria-hidden', false)

                that.enforceFocus()

                transition ?
                    that.$element.one($.support.transition.end, function () { that.$element.focus().trigger('shown') }) :
                    that.$element.focus().trigger('shown')

            })
        }

        , hide: function (e) {
            e && e.preventDefault()

            var that = this

            e = $.Event('hide')

            this.$element.trigger(e)

            if (!this.isShown || e.isDefaultPrevented()) return

            this.isShown = false

            this.escape()

            $(document).off('focusin.modal')

            this.$element
                .removeClass('in')
                .attr('aria-hidden', true)

            $.support.transition && this.$element.hasClass('fade') ?
                this.hideWithTransition() :
                this.hideModal()
        }

        , enforceFocus: function () {
            var that = this
            $(document).on('focusin.modal', function (e) {
                if (that.$element[0] !== e.target && !that.$element.has(e.target).length) {
                    that.$element.focus()
                }
            })
        }

        , escape: function () {
            var that = this
            if (this.isShown && this.options.keyboard) {
                this.$element.on('keyup.dismiss.modal', function ( e ) {
                    e.which == 27 && that.hide()
                })
            } else if (!this.isShown) {
                this.$element.off('keyup.dismiss.modal')
            }
        }

        , hideWithTransition: function () {
            var that = this
                , timeout = setTimeout(function () {
                    that.$element.off($.support.transition.end)
                    that.hideModal()
                }, 500)

            this.$element.one($.support.transition.end, function () {
                clearTimeout(timeout)
                that.hideModal()
            })
        }

        , hideModal: function () {
            var that = this
            this.$element.hide()
            this.backdrop(function () {
                that.removeBackdrop()
                that.$element.trigger('hidden')
            })
        }

        , removeBackdrop: function () {
            this.$backdrop && this.$backdrop.remove()
            this.$backdrop = null
        }

        , backdrop: function (callback) {
            var that = this
                , animate = this.$element.hasClass('fade') ? 'fade' : ''

            if (this.isShown && this.options.backdrop) {
                var doAnimate = $.support.transition && animate

                this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
                    .appendTo(document.body)

                this.$backdrop.click(
                    this.options.backdrop == 'static' ?
                        $.proxy(this.$element[0].focus, this.$element[0])
                        : $.proxy(this.hide, this)
                )

                if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

                this.$backdrop.addClass('in')

                if (!callback) return

                doAnimate ?
                    this.$backdrop.one($.support.transition.end, callback) :
                    callback()

            } else if (!this.isShown && this.$backdrop) {
                this.$backdrop.removeClass('in')

                $.support.transition && this.$element.hasClass('fade')?
                    this.$backdrop.one($.support.transition.end, callback) :
                    callback()

            } else if (callback) {
                callback()
            }
        }
    }


    /* MODAL PLUGIN DEFINITION
     * ======================= */

    var old = $.fn.modal

    $.fn.modal = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('modal')
                , options = $.extend({}, $.fn.modal.defaults, $this.data(), typeof option == 'object' && option)
            if (!data) $this.data('modal', (data = new Modal(this, options)))
            if (typeof option == 'string') data[option]()
            else if (options.show) data.show()
        })
    }

    $.fn.modal.defaults = {
        backdrop: true
        , keyboard: true
        , show: true
    }

    $.fn.modal.Constructor = Modal


    /* MODAL NO CONFLICT
     * ================= */

    $.fn.modal.noConflict = function () {
        $.fn.modal = old
        return this
    }


    /* MODAL DATA-API
     * ============== */

    $(document).on('click.modal.data-api', '[data-toggle="modal"]', function (e) {
        var $this = $(this)
            , href = $this.attr('href')
            , $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) //strip for ie7
            , option = $target.data('modal') ? 'toggle' : $.extend({ remote:!/#/.test(href) && href }, $target.data(), $this.data())

        e.preventDefault()

        $target
            .modal(option)
            .one('hide', function () {
                $this.focus()
            })
    })

}(window.jQuery);
/* ===========================================================
 * bootstrap-tooltip.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#tooltips
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ===========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* TOOLTIP PUBLIC CLASS DEFINITION
     * =============================== */

    var Tooltip = function (element, options) {
        this.init('tooltip', element, options)
    }

    Tooltip.prototype = {

        constructor: Tooltip

        , init: function (type, element, options) {
            var eventIn
                , eventOut
                , triggers
                , trigger
                , i

            this.type = type
            this.$element = $(element)
            this.options = this.getOptions(options)
            this.enabled = true

            triggers = this.options.trigger.split(' ')

            for (i = triggers.length; i--;) {
                trigger = triggers[i]
                if (trigger == 'click') {
                    this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
                } else if (trigger != 'manual') {
                    eventIn = trigger == 'hover' ? 'mouseenter' : 'focus'
                    eventOut = trigger == 'hover' ? 'mouseleave' : 'blur'
                    this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
                    this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
                }
            }

            this.options.selector ?
                (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
                this.fixTitle()
        }

        , getOptions: function (options) {
            options = $.extend({}, $.fn[this.type].defaults, this.$element.data(), options)

            if (options.delay && typeof options.delay == 'number') {
                options.delay = {
                    show: options.delay
                    , hide: options.delay
                }
            }

            return options
        }

        , enter: function (e) {
            var defaults = $.fn[this.type].defaults
                , options = {}
                , self

            this._options && $.each(this._options, function (key, value) {
                if (defaults[key] != value) options[key] = value
            }, this)

            self = $(e.currentTarget)[this.type](options).data(this.type)

            if (!self.options.delay || !self.options.delay.show) return self.show()

            clearTimeout(this.timeout)
            self.hoverState = 'in'
            this.timeout = setTimeout(function() {
                if (self.hoverState == 'in') self.show()
            }, self.options.delay.show)
        }

        , leave: function (e) {
            var self = $(e.currentTarget)[this.type](this._options).data(this.type)

            if (this.timeout) clearTimeout(this.timeout)
            if (!self.options.delay || !self.options.delay.hide) return self.hide()

            self.hoverState = 'out'
            this.timeout = setTimeout(function() {
                if (self.hoverState == 'out') self.hide()
            }, self.options.delay.hide)
        }

        , show: function () {
            var $tip
                , pos
                , actualWidth
                , actualHeight
                , placement
                , tp
                , e = $.Event('show')

            if (this.hasContent() && this.enabled) {
                this.$element.trigger(e)
                if (e.isDefaultPrevented()) return
                $tip = this.tip()
                this.setContent()

                if (this.options.animation) {
                    $tip.addClass('fade')
                }

                placement = typeof this.options.placement == 'function' ?
                    this.options.placement.call(this, $tip[0], this.$element[0]) :
                    this.options.placement

                $tip
                    .detach()
                    .css({ top: 0, left: 0, display: 'block' })

                this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)

                pos = this.getPosition()

                actualWidth = $tip[0].offsetWidth
                actualHeight = $tip[0].offsetHeight

                switch (placement) {
                    case 'bottom':
                        tp = {top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2}
                        break
                    case 'top':
                        tp = {top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2}
                        break
                    case 'left':
                        tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth}
                        break
                    case 'right':
                        tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width}
                        break
                }

                this.applyPlacement(tp, placement)
                this.$element.trigger('shown')
            }
        }

        , applyPlacement: function(offset, placement){
            var $tip = this.tip()
                , width = $tip[0].offsetWidth
                , height = $tip[0].offsetHeight
                , actualWidth
                , actualHeight
                , delta
                , replace

            $tip
                .offset(offset)
                .addClass(placement)
                .addClass('in')

            actualWidth = $tip[0].offsetWidth
            actualHeight = $tip[0].offsetHeight

            if (placement == 'top' && actualHeight != height) {
                offset.top = offset.top + height - actualHeight
                replace = true
            }

            if (placement == 'bottom' || placement == 'top') {
                delta = 0

                if (offset.left < 0){
                    delta = offset.left * -2
                    offset.left = 0
                    $tip.offset(offset)
                    actualWidth = $tip[0].offsetWidth
                    actualHeight = $tip[0].offsetHeight
                }

                this.replaceArrow(delta - width + actualWidth, actualWidth, 'left')
            } else {
                this.replaceArrow(actualHeight - height, actualHeight, 'top')
            }

            if (replace) $tip.offset(offset)
        }

        , replaceArrow: function(delta, dimension, position){
            this
                .arrow()
                .css(position, delta ? (50 * (1 - delta / dimension) + "%") : '')
        }

        , setContent: function () {
            var $tip = this.tip()
                , title = this.getTitle()

            $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
            $tip.removeClass('fade in top bottom left right')
        }

        , hide: function () {
            var that = this
                , $tip = this.tip()
                , e = $.Event('hide')

            this.$element.trigger(e)
            if (e.isDefaultPrevented()) return

            $tip.removeClass('in')

            function removeWithAnimation() {
                var timeout = setTimeout(function () {
                    $tip.off($.support.transition.end).detach()
                }, 500)

                $tip.one($.support.transition.end, function () {
                    clearTimeout(timeout)
                    $tip.detach()
                })
            }

            $.support.transition && this.$tip.hasClass('fade') ?
                removeWithAnimation() :
                $tip.detach()

            this.$element.trigger('hidden')

            return this
        }

        , fixTitle: function () {
            var $e = this.$element
            if ($e.attr('title') || typeof($e.attr('data-original-title')) != 'string') {
                $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
            }
        }

        , hasContent: function () {
            return this.getTitle()
        }

        , getPosition: function () {
            var el = this.$element[0]
            return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : {
                width: el.offsetWidth
                , height: el.offsetHeight
            }, this.$element.offset())
        }

        , getTitle: function () {
            var title
                , $e = this.$element
                , o = this.options

            title = $e.attr('data-original-title')
                || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

            return title
        }

        , tip: function () {
            return this.$tip = this.$tip || $(this.options.template)
        }

        , arrow: function(){
            return this.$arrow = this.$arrow || this.tip().find(".tooltip-arrow")
        }

        , validate: function () {
            if (!this.$element[0].parentNode) {
                this.hide()
                this.$element = null
                this.options = null
            }
        }

        , enable: function () {
            this.enabled = true
        }

        , disable: function () {
            this.enabled = false
        }

        , toggleEnabled: function () {
            this.enabled = !this.enabled
        }

        , toggle: function (e) {
            var self = e ? $(e.currentTarget)[this.type](this._options).data(this.type) : this
            self.tip().hasClass('in') ? self.hide() : self.show()
        }

        , destroy: function () {
            this.hide().$element.off('.' + this.type).removeData(this.type)
        }

    }


    /* TOOLTIP PLUGIN DEFINITION
     * ========================= */

    var old = $.fn.tooltip

    $.fn.tooltip = function ( option ) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('tooltip')
                , options = typeof option == 'object' && option
            if (!data) $this.data('tooltip', (data = new Tooltip(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.tooltip.Constructor = Tooltip

    $.fn.tooltip.defaults = {
        animation: true
        , placement: 'top'
        , selector: false
        , template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
        , trigger: 'hover focus'
        , title: ''
        , delay: 0
        , html: false
        , container: false
    }


    /* TOOLTIP NO CONFLICT
     * =================== */

    $.fn.tooltip.noConflict = function () {
        $.fn.tooltip = old
        return this
    }

}(window.jQuery);
/* ===========================================================
 * bootstrap-popover.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#popovers
 * ===========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =========================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* POPOVER PUBLIC CLASS DEFINITION
     * =============================== */

    var Popover = function (element, options) {
        this.init('popover', element, options)
    }


    /* NOTE: POPOVER EXTENDS BOOTSTRAP-TOOLTIP.js
     ========================================== */

    Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype, {

        constructor: Popover

        , setContent: function () {
            var $tip = this.tip()
                , title = this.getTitle()
                , content = this.getContent()

            $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
            $tip.find('.popover-content')[this.options.html ? 'html' : 'text'](content)

            $tip.removeClass('fade top bottom left right in')
        }

        , hasContent: function () {
            return this.getTitle() || this.getContent()
        }

        , getContent: function () {
            var content
                , $e = this.$element
                , o = this.options

            content = (typeof o.content == 'function' ? o.content.call($e[0]) :  o.content)
                || $e.attr('data-content')

            return content
        }

        , tip: function () {
            if (!this.$tip) {
                this.$tip = $(this.options.template)
            }
            return this.$tip
        }

        , destroy: function () {
            this.hide().$element.off('.' + this.type).removeData(this.type)
        }

    })


    /* POPOVER PLUGIN DEFINITION
     * ======================= */

    var old = $.fn.popover

    $.fn.popover = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('popover')
                , options = typeof option == 'object' && option
            if (!data) $this.data('popover', (data = new Popover(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.popover.Constructor = Popover

    $.fn.popover.defaults = $.extend({} , $.fn.tooltip.defaults, {
        placement: 'right'
        , trigger: 'click'
        , content: ''
        , template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    })


    /* POPOVER NO CONFLICT
     * =================== */

    $.fn.popover.noConflict = function () {
        $.fn.popover = old
        return this
    }

}(window.jQuery);
/* =============================================================
 * bootstrap-scrollspy.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#scrollspy
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* SCROLLSPY CLASS DEFINITION
     * ========================== */

    function ScrollSpy(element, options) {
        var process = $.proxy(this.process, this)
            , $element = $(element).is('body') ? $(window) : $(element)
            , href
        this.options = $.extend({}, $.fn.scrollspy.defaults, options)
        this.$scrollElement = $element.on('scroll.scroll-spy.data-api', process)
        this.selector = (this.options.target
            || ((href = $(element).attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
            || '') + ' .nav li > a'
        this.$body = $('body')
        this.refresh()
        this.process()
    }

    ScrollSpy.prototype = {

        constructor: ScrollSpy

        , refresh: function () {
            var self = this
                , $targets

            this.offsets = $([])
            this.targets = $([])

            $targets = this.$body
                .find(this.selector)
                .map(function () {
                    var $el = $(this)
                        , href = $el.data('target') || $el.attr('href')
                        , $href = /^#\w/.test(href) && $(href)
                    return ( $href
                        && $href.length
                        && [[ $href.position().top + (!$.isWindow(self.$scrollElement.get(0)) && self.$scrollElement.scrollTop()), href ]] ) || null
                })
                .sort(function (a, b) { return a[0] - b[0] })
                .each(function () {
                    self.offsets.push(this[0])
                    self.targets.push(this[1])
                })
        }

        , process: function () {
            var scrollTop = this.$scrollElement.scrollTop() + this.options.offset
                , scrollHeight = this.$scrollElement[0].scrollHeight || this.$body[0].scrollHeight
                , maxScroll = scrollHeight - this.$scrollElement.height()
                , offsets = this.offsets
                , targets = this.targets
                , activeTarget = this.activeTarget
                , i

            if (scrollTop >= maxScroll) {
                return activeTarget != (i = targets.last()[0])
                    && this.activate ( i )
            }

            for (i = offsets.length; i--;) {
                activeTarget != targets[i]
                    && scrollTop >= offsets[i]
                    && (!offsets[i + 1] || scrollTop <= offsets[i + 1])
                && this.activate( targets[i] )
            }
        }

        , activate: function (target) {
            var active
                , selector

            this.activeTarget = target

            $(this.selector)
                .parent('.active')
                .removeClass('active')

            selector = this.selector
                + '[data-target="' + target + '"],'
                + this.selector + '[href="' + target + '"]'

            active = $(selector)
                .parent('li')
                .addClass('active')

            if (active.parent('.dropdown-menu').length)  {
                active = active.closest('li.dropdown').addClass('active')
            }

            active.trigger('activate')
        }

    }


    /* SCROLLSPY PLUGIN DEFINITION
     * =========================== */

    var old = $.fn.scrollspy

    $.fn.scrollspy = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('scrollspy')
                , options = typeof option == 'object' && option
            if (!data) $this.data('scrollspy', (data = new ScrollSpy(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.scrollspy.Constructor = ScrollSpy

    $.fn.scrollspy.defaults = {
        offset: 10
    }


    /* SCROLLSPY NO CONFLICT
     * ===================== */

    $.fn.scrollspy.noConflict = function () {
        $.fn.scrollspy = old
        return this
    }


    /* SCROLLSPY DATA-API
     * ================== */

    $(window).on('load', function () {
        $('[data-spy="scroll"]').each(function () {
            var $spy = $(this)
            $spy.scrollspy($spy.data())
        })
    })

}(window.jQuery);/* ========================================================
 * bootstrap-tab.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#tabs
 * ========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* TAB CLASS DEFINITION
     * ==================== */

    var Tab = function (element) {
        this.element = $(element)
    }

    Tab.prototype = {

        constructor: Tab

        , show: function () {
            var $this = this.element
                , $ul = $this.closest('ul:not(.dropdown-menu)')
                , selector = $this.attr('data-target')
                , previous
                , $target
                , e

            if (!selector) {
                selector = $this.attr('href')
                selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
            }

            if ( $this.parent('li').hasClass('active') ) return

            previous = $ul.find('.active:last a')[0]

            e = $.Event('show', {
                relatedTarget: previous
            })

            $this.trigger(e)

            if (e.isDefaultPrevented()) return

            $target = $(selector)

            this.activate($this.parent('li'), $ul)
            this.activate($target, $target.parent(), function () {
                $this.trigger({
                    type: 'shown'
                    , relatedTarget: previous
                })
            })
        }

        , activate: function ( element, container, callback) {
            var $active = container.find('> .active')
                , transition = callback
                    && $.support.transition
                    && $active.hasClass('fade')

            function next() {
                $active
                    .removeClass('active')
                    .find('> .dropdown-menu > .active')
                    .removeClass('active')

                element.addClass('active')

                if (transition) {
                    element[0].offsetWidth // reflow for transition
                    element.addClass('in')
                } else {
                    element.removeClass('fade')
                }

                if ( element.parent('.dropdown-menu') ) {
                    element.closest('li.dropdown').addClass('active')
                }

                callback && callback()
            }

            transition ?
                $active.one($.support.transition.end, next) :
                next()

            $active.removeClass('in')
        }
    }


    /* TAB PLUGIN DEFINITION
     * ===================== */

    var old = $.fn.tab

    $.fn.tab = function ( option ) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('tab')
            if (!data) $this.data('tab', (data = new Tab(this)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.tab.Constructor = Tab


    /* TAB NO CONFLICT
     * =============== */

    $.fn.tab.noConflict = function () {
        $.fn.tab = old
        return this
    }


    /* TAB DATA-API
     * ============ */

    $(document).on('click.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
        e.preventDefault()
        $(this).tab('show')
    })

}(window.jQuery);/* =============================================================
 * bootstrap-typeahead.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#typeahead
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function($){

    "use strict"; // jshint ;_;


    /* TYPEAHEAD PUBLIC CLASS DEFINITION
     * ================================= */

    var Typeahead = function (element, options) {
        this.$element = $(element)
        this.options = $.extend({}, $.fn.typeahead.defaults, options)
        this.matcher = this.options.matcher || this.matcher
        this.sorter = this.options.sorter || this.sorter
        this.highlighter = this.options.highlighter || this.highlighter
        this.updater = this.options.updater || this.updater
        this.source = this.options.source
        this.$menu = $(this.options.menu)
        this.shown = false
        this.listen()
    }

    Typeahead.prototype = {

        constructor: Typeahead

        , select: function () {
            var val = this.$menu.find('.active').attr('data-value')
            this.$element
                .val(this.updater(val))
                .change()
            return this.hide()
        }

        , updater: function (item) {
            return item
        }

        , show: function () {
            var pos = $.extend({}, this.$element.position(), {
                height: this.$element[0].offsetHeight
            })

            this.$menu
                .insertAfter(this.$element)
                .css({
                    top: pos.top + pos.height
                    , left: pos.left
                })
                .show()

            this.shown = true
            return this
        }

        , hide: function () {
            this.$menu.hide()
            this.shown = false
            return this
        }

        , lookup: function (event) {
            var items

            this.query = this.$element.val()

            if (!this.query || this.query.length < this.options.minLength) {
                return this.shown ? this.hide() : this
            }

            items = $.isFunction(this.source) ? this.source(this.query, $.proxy(this.process, this)) : this.source

            return items ? this.process(items) : this
        }

        , process: function (items) {
            var that = this

            items = $.grep(items, function (item) {
                return that.matcher(item)
            })

            items = this.sorter(items)

            if (!items.length) {
                return this.shown ? this.hide() : this
            }

            return this.render(items.slice(0, this.options.items)).show()
        }

        , matcher: function (item) {
            return ~item.toLowerCase().indexOf(this.query.toLowerCase())
        }

        , sorter: function (items) {
            var beginswith = []
                , caseSensitive = []
                , caseInsensitive = []
                , item

            while (item = items.shift()) {
                if (!item.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item)
                else if (~item.indexOf(this.query)) caseSensitive.push(item)
                else caseInsensitive.push(item)
            }

            return beginswith.concat(caseSensitive, caseInsensitive)
        }

        , highlighter: function (item) {
            var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')
            return item.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
                return '<strong>' + match + '</strong>'
            })
        }

        , render: function (items) {
            var that = this

            items = $(items).map(function (i, item) {
                i = $(that.options.item).attr('data-value', item)
                i.find('a').html(that.highlighter(item))
                return i[0]
            })

            items.first().addClass('active')
            this.$menu.html(items)
            return this
        }

        , next: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
                , next = active.next()

            if (!next.length) {
                next = $(this.$menu.find('li')[0])
            }

            next.addClass('active')
        }

        , prev: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
                , prev = active.prev()

            if (!prev.length) {
                prev = this.$menu.find('li').last()
            }

            prev.addClass('active')
        }

        , listen: function () {
            this.$element
                .on('focus',    $.proxy(this.focus, this))
                .on('blur',     $.proxy(this.blur, this))
                .on('keypress', $.proxy(this.keypress, this))
                .on('keyup',    $.proxy(this.keyup, this))

            if (this.eventSupported('keydown')) {
                this.$element.on('keydown', $.proxy(this.keydown, this))
            }

            this.$menu
                .on('click', $.proxy(this.click, this))
                .on('mouseenter', 'li', $.proxy(this.mouseenter, this))
                .on('mouseleave', 'li', $.proxy(this.mouseleave, this))
        }

        , eventSupported: function(eventName) {
            var isSupported = eventName in this.$element
            if (!isSupported) {
                this.$element.setAttribute(eventName, 'return;')
                isSupported = typeof this.$element[eventName] === 'function'
            }
            return isSupported
        }

        , move: function (e) {
            if (!this.shown) return

            switch(e.keyCode) {
                case 9: // tab
                case 13: // enter
                case 27: // escape
                    e.preventDefault()
                    break

                case 38: // up arrow
                    e.preventDefault()
                    this.prev()
                    break

                case 40: // down arrow
                    e.preventDefault()
                    this.next()
                    break
            }

            e.stopPropagation()
        }

        , keydown: function (e) {
            this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40,38,9,13,27])
            this.move(e)
        }

        , keypress: function (e) {
            if (this.suppressKeyPressRepeat) return
            this.move(e)
        }

        , keyup: function (e) {
            switch(e.keyCode) {
                case 40: // down arrow
                case 38: // up arrow
                case 16: // shift
                case 17: // ctrl
                case 18: // alt
                    break

                case 9: // tab
                case 13: // enter
                    if (!this.shown) return
                    this.select()
                    break

                case 27: // escape
                    if (!this.shown) return
                    this.hide()
                    break

                default:
                    this.lookup()
            }

            e.stopPropagation()
            e.preventDefault()
        }

        , focus: function (e) {
            this.focused = true
        }

        , blur: function (e) {
            this.focused = false
            if (!this.mousedover && this.shown) this.hide()
        }

        , click: function (e) {
            e.stopPropagation()
            e.preventDefault()
            this.select()
            this.$element.focus()
        }

        , mouseenter: function (e) {
            this.mousedover = true
            this.$menu.find('.active').removeClass('active')
            $(e.currentTarget).addClass('active')
        }

        , mouseleave: function (e) {
            this.mousedover = false
            if (!this.focused && this.shown) this.hide()
        }

    }


    /* TYPEAHEAD PLUGIN DEFINITION
     * =========================== */

    var old = $.fn.typeahead

    $.fn.typeahead = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('typeahead')
                , options = typeof option == 'object' && option
            if (!data) $this.data('typeahead', (data = new Typeahead(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.typeahead.defaults = {
        source: []
        , items: 8
        , menu: '<ul class="typeahead dropdown-menu"></ul>'
        , item: '<li><a href="#"></a></li>'
        , minLength: 1
    }

    $.fn.typeahead.Constructor = Typeahead


    /* TYPEAHEAD NO CONFLICT
     * =================== */

    $.fn.typeahead.noConflict = function () {
        $.fn.typeahead = old
        return this
    }


    /* TYPEAHEAD DATA-API
     * ================== */

    $(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
        var $this = $(this)
        if ($this.data('typeahead')) return
        $this.typeahead($this.data())
    })

}(window.jQuery);
/* ==========================================================
 * bootstrap-affix.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#affix
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

    "use strict"; // jshint ;_;


    /* AFFIX CLASS DEFINITION
     * ====================== */

    var Affix = function (element, options) {
        this.options = $.extend({}, $.fn.affix.defaults, options)
        this.$window = $(window)
            .on('scroll.affix.data-api', $.proxy(this.checkPosition, this))
            .on('click.affix.data-api',  $.proxy(function () { setTimeout($.proxy(this.checkPosition, this), 1) }, this))
        this.$element = $(element)
        this.checkPosition()
    }

    Affix.prototype.checkPosition = function () {
        if (!this.$element.is(':visible')) return

        var scrollHeight = $(document).height()
            , scrollTop = this.$window.scrollTop()
            , position = this.$element.offset()
            , offset = this.options.offset
            , offsetBottom = offset.bottom
            , offsetTop = offset.top
            , reset = 'affix affix-top affix-bottom'
            , affix

        if (typeof offset != 'object') offsetBottom = offsetTop = offset
        if (typeof offsetTop == 'function') offsetTop = offset.top()
        if (typeof offsetBottom == 'function') offsetBottom = offset.bottom()

        affix = this.unpin != null && (scrollTop + this.unpin <= position.top) ?
            false    : offsetBottom != null && (position.top + this.$element.height() >= scrollHeight - offsetBottom) ?
            'bottom' : offsetTop != null && scrollTop <= offsetTop ?
            'top'    : false

        if (this.affixed === affix) return

        this.affixed = affix
        this.unpin = affix == 'bottom' ? position.top - scrollTop : null

        this.$element.removeClass(reset).addClass('affix' + (affix ? '-' + affix : ''))
    }


    /* AFFIX PLUGIN DEFINITION
     * ======================= */

    var old = $.fn.affix

    $.fn.affix = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('affix')
                , options = typeof option == 'object' && option
            if (!data) $this.data('affix', (data = new Affix(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.affix.Constructor = Affix

    $.fn.affix.defaults = {
        offset: 0
    }


    /* AFFIX NO CONFLICT
     * ================= */

    $.fn.affix.noConflict = function () {
        $.fn.affix = old
        return this
    }


    /* AFFIX DATA-API
     * ============== */

    $(window).on('load', function () {
        $('[data-spy="affix"]').each(function () {
            var $spy = $(this)
                , data = $spy.data()

            data.offset = data.offset || {}

            data.offsetBottom && (data.offset.bottom = data.offsetBottom)
            data.offsetTop && (data.offset.top = data.offsetTop)

            $spy.affix(data)
        })
    })


}(window.jQuery);;angular.module("ui.bootstrap", ["ui.bootstrap.tpls", "ui.bootstrap.transition","ui.bootstrap.collapse","ui.bootstrap.accordion","ui.bootstrap.alert","ui.bootstrap.buttons","ui.bootstrap.carousel","ui.bootstrap.dialog","ui.bootstrap.dropdownToggle","ui.bootstrap.modal","ui.bootstrap.pagination","ui.bootstrap.position","ui.bootstrap.tooltip","ui.bootstrap.popover","ui.bootstrap.progressbar","ui.bootstrap.rating","ui.bootstrap.tabs","ui.bootstrap.typeahead"]);
angular.module("ui.bootstrap.tpls", ["template/accordion/accordion-group.html","template/accordion/accordion.html","template/alert/alert.html","template/carousel/carousel.html","template/carousel/slide.html","template/dialog/message.html","template/pagination/pagination.html","template/tooltip/tooltip-html-unsafe-popup.html","template/tooltip/tooltip-popup.html","template/popover/popover.html","template/progressbar/bar.html","template/progressbar/progress.html","template/rating/rating.html","template/tabs/pane.html","template/tabs/tabs.html","template/typeahead/typeahead.html"]);
angular.module('ui.bootstrap.transition', [])

/**
 * $transition service provides a consistent interface to trigger CSS 3 transitions and to be informed when they complete.
 * @param  {DOMElement} element  The DOMElement that will be animated.
 * @param  {string|object|function} trigger  The thing that will cause the transition to start:
 *   - As a string, it represents the css class to be added to the element.
 *   - As an object, it represents a hash of style attributes to be applied to the element.
 *   - As a function, it represents a function to be called that will cause the transition to occur.
 * @return {Promise}  A promise that is resolved when the transition finishes.
 */
    .factory('$transition', ['$q', '$timeout', '$rootScope', function($q, $timeout, $rootScope) {

        var $transition = function(element, trigger, options) {
            options = options || {};
            var deferred = $q.defer();
            var endEventName = $transition[options.animation ? "animationEndEventName" : "transitionEndEventName"];

            var transitionEndHandler = function(event) {
                $rootScope.$apply(function() {
                    element.unbind(endEventName, transitionEndHandler);
                    deferred.resolve(element);
                });
            };

            if (endEventName) {
                element.bind(endEventName, transitionEndHandler);
            }

            // Wrap in a timeout to allow the browser time to update the DOM before the transition is to occur
            $timeout(function() {
                if ( angular.isString(trigger) ) {
                    element.addClass(trigger);
                } else if ( angular.isFunction(trigger) ) {
                    trigger(element);
                } else if ( angular.isObject(trigger) ) {
                    element.css(trigger);
                }
                //If browser does not support transitions, instantly resolve
                if ( !endEventName ) {
                    deferred.resolve(element);
                }
            });

            // Add our custom cancel function to the promise that is returned
            // We can call this if we are about to run a new transition, which we know will prevent this transition from ending,
            // i.e. it will therefore never raise a transitionEnd event for that transition
            deferred.promise.cancel = function() {
                if ( endEventName ) {
                    element.unbind(endEventName, transitionEndHandler);
                }
                deferred.reject('Transition cancelled');
            };

            return deferred.promise;
        };

        // Work out the name of the transitionEnd event
        var transElement = document.createElement('trans');
        var transitionEndEventNames = {
            'WebkitTransition': 'webkitTransitionEnd',
            'MozTransition': 'transitionend',
            'OTransition': 'oTransitionEnd',
            'transition': 'transitionend'
        };
        var animationEndEventNames = {
            'WebkitTransition': 'webkitAnimationEnd',
            'MozTransition': 'animationend',
            'OTransition': 'oAnimationEnd',
            'transition': 'animationend'
        };
        function findEndEventName(endEventNames) {
            for (var name in endEventNames){
                if (transElement.style[name] !== undefined) {
                    return endEventNames[name];
                }
            }
        }
        $transition.transitionEndEventName = findEndEventName(transitionEndEventNames);
        $transition.animationEndEventName = findEndEventName(animationEndEventNames);
        return $transition;
    }]);

angular.module('ui.bootstrap.collapse',['ui.bootstrap.transition'])

// The collapsible directive indicates a block of html that will expand and collapse
    .directive('collapse', ['$transition', function($transition) {
        // CSS transitions don't work with height: auto, so we have to manually change the height to a
        // specific value and then once the animation completes, we can reset the height to auto.
        // Unfortunately if you do this while the CSS transitions are specified (i.e. in the CSS class
        // "collapse") then you trigger a change to height 0 in between.
        // The fix is to remove the "collapse" CSS class while changing the height back to auto - phew!
        var fixUpHeight = function(scope, element, height) {
            // We remove the collapse CSS class to prevent a transition when we change to height: auto
            element.removeClass('collapse');
            element.css({ height: height });
            // It appears that  reading offsetWidth makes the browser realise that we have changed the
            // height already :-/
            var x = element[0].offsetWidth;
            element.addClass('collapse');
        };

        return {
            link: function(scope, element, attrs) {

                var isCollapsed;
                var initialAnimSkip = true;
                scope.$watch(function (){ return element[0].scrollHeight; }, function (value) {
                    //The listener is called when scollHeight changes
                    //It actually does on 2 scenarios:
                    // 1. Parent is set to display none
                    // 2. angular bindings inside are resolved
                    //When we have a change of scrollHeight we are setting again the correct height if the group is opened
                    if (element[0].scrollHeight !== 0) {
                        if (!isCollapsed) {
                            if (initialAnimSkip) {
                                fixUpHeight(scope, element, element[0].scrollHeight + 'px');
                            } else {
                                fixUpHeight(scope, element, 'auto');
                            }
                        }
                    }
                });

                scope.$watch(attrs.collapse, function(value) {
                    if (value) {
                        collapse();
                    } else {
                        expand();
                    }
                });


                var currentTransition;
                var doTransition = function(change) {
                    if ( currentTransition ) {
                        currentTransition.cancel();
                    }
                    currentTransition = $transition(element,change);
                    currentTransition.then(
                        function() { currentTransition = undefined; },
                        function() { currentTransition = undefined; }
                    );
                    return currentTransition;
                };

                var expand = function() {
                    if (initialAnimSkip) {
                        initialAnimSkip = false;
                        if ( !isCollapsed ) {
                            fixUpHeight(scope, element, 'auto');
                        }
                    } else {
                        doTransition({ height : element[0].scrollHeight + 'px' })
                            .then(function() {
                                // This check ensures that we don't accidentally update the height if the user has closed
                                // the group while the animation was still running
                                if ( !isCollapsed ) {
                                    fixUpHeight(scope, element, 'auto');
                                }
                            });
                    }
                    isCollapsed = false;
                };

                var collapse = function() {
                    isCollapsed = true;
                    if (initialAnimSkip) {
                        initialAnimSkip = false;
                        fixUpHeight(scope, element, 0);
                    } else {
                        fixUpHeight(scope, element, element[0].scrollHeight + 'px');
                        doTransition({'height':'0'});
                    }
                };
            }
        };
    }]);

angular.module('ui.bootstrap.accordion', ['ui.bootstrap.collapse'])

    .constant('accordionConfig', {
        closeOthers: true
    })

    .controller('AccordionController', ['$scope', '$attrs', 'accordionConfig', function ($scope, $attrs, accordionConfig) {

        // This array keeps track of the accordion groups
        this.groups = [];

        // Ensure that all the groups in this accordion are closed, unless close-others explicitly says not to
        this.closeOthers = function(openGroup) {
            var closeOthers = angular.isDefined($attrs.closeOthers) ? $scope.$eval($attrs.closeOthers) : accordionConfig.closeOthers;
            if ( closeOthers ) {
                angular.forEach(this.groups, function (group) {
                    if ( group !== openGroup ) {
                        group.isOpen = false;
                    }
                });
            }
        };

        // This is called from the accordion-group directive to add itself to the accordion
        this.addGroup = function(groupScope) {
            var that = this;
            this.groups.push(groupScope);

            groupScope.$on('$destroy', function (event) {
                that.removeGroup(groupScope);
            });
        };

        // This is called from the accordion-group directive when to remove itself
        this.removeGroup = function(group) {
            var index = this.groups.indexOf(group);
            if ( index !== -1 ) {
                this.groups.splice(this.groups.indexOf(group), 1);
            }
        };

    }])

// The accordion directive simply sets up the directive controller
// and adds an accordion CSS class to itself element.
    .directive('accordion', function () {
        return {
            restrict:'EA',
            controller:'AccordionController',
            transclude: true,
            replace: false,
            templateUrl: 'template/accordion/accordion.html'
        };
    })

// The accordion-group directive indicates a block of html that will expand and collapse in an accordion
    .directive('accordionGroup', ['$parse', '$transition', '$timeout', function($parse, $transition, $timeout) {
        return {
            require:'^accordion',         // We need this directive to be inside an accordion
            restrict:'EA',
            transclude:true,              // It transcludes the contents of the directive into the template
            replace: true,                // The element containing the directive will be replaced with the template
            templateUrl:'template/accordion/accordion-group.html',
            scope:{ heading:'@' },        // Create an isolated scope and interpolate the heading attribute onto this scope
            controller: ['$scope', function($scope) {
                this.setHeading = function(element) {
                    this.heading = element;
                };
            }],
            link: function(scope, element, attrs, accordionCtrl) {
                var getIsOpen, setIsOpen;

                accordionCtrl.addGroup(scope);

                scope.isOpen = false;

                if ( attrs.isOpen ) {
                    getIsOpen = $parse(attrs.isOpen);
                    setIsOpen = getIsOpen.assign;

                    scope.$watch(
                        function watchIsOpen() { return getIsOpen(scope.$parent); },
                        function updateOpen(value) { scope.isOpen = value; }
                    );

                    scope.isOpen = getIsOpen ? getIsOpen(scope.$parent) : false;
                }

                scope.$watch('isOpen', function(value) {
                    if ( value ) {
                        accordionCtrl.closeOthers(scope);
                    }
                    if ( setIsOpen ) {
                        setIsOpen(scope.$parent, value);
                    }
                });
            }
        };
    }])

// Use accordion-heading below an accordion-group to provide a heading containing HTML
// <accordion-group>
//   <accordion-heading>Heading containing HTML - <img src="..."></accordion-heading>
// </accordion-group>
    .directive('accordionHeading', function() {
        return {
            restrict: 'E',
            transclude: true,   // Grab the contents to be used as the heading
            template: '',       // In effect remove this element!
            replace: true,
            require: '^accordionGroup',
            compile: function(element, attr, transclude) {
                return function link(scope, element, attr, accordionGroupCtrl) {
                    // Pass the heading to the accordion-group controller
                    // so that it can be transcluded into the right place in the template
                    // [The second parameter to transclude causes the elements to be cloned so that they work in ng-repeat]
                    accordionGroupCtrl.setHeading(transclude(scope, function() {}));
                };
            }
        };
    })

// Use in the accordion-group template to indicate where you want the heading to be transcluded
// You must provide the property on the accordion-group controller that will hold the transcluded element
// <div class="accordion-group">
//   <div class="accordion-heading" ><a ... accordion-transclude="heading">...</a></div>
//   ...
// </div>
    .directive('accordionTransclude', function() {
        return {
            require: '^accordionGroup',
            link: function(scope, element, attr, controller) {
                scope.$watch(function() { return controller[attr.accordionTransclude]; }, function(heading) {
                    if ( heading ) {
                        element.html('');
                        element.append(heading);
                    }
                });
            }
        };
    });

angular.module("ui.bootstrap.alert", []).directive('alert', function () {
    return {
        restrict:'EA',
        templateUrl:'template/alert/alert.html',
        transclude:true,
        replace:true,
        scope: {
            type: '=',
            close: '&'
        },
        link: function(scope, iElement, iAttrs, controller) {
            scope.closeable = "close" in iAttrs;
        }
    };
});

angular.module('ui.bootstrap.buttons', [])

    .constant('buttonConfig', {
        activeClass:'active',
        toggleEvent:'click'
    })

    .directive('btnRadio', ['buttonConfig', function (buttonConfig) {
        var activeClass = buttonConfig.activeClass || 'active';
        var toggleEvent = buttonConfig.toggleEvent || 'click';

        return {

            require:'ngModel',
            link:function (scope, element, attrs, ngModelCtrl) {

                var value = scope.$eval(attrs.btnRadio);

                //model -> UI
                scope.$watch(function () {
                    return ngModelCtrl.$modelValue;
                }, function (modelValue) {
                    if (angular.equals(modelValue, value)){
                        element.addClass(activeClass);
                    } else {
                        element.removeClass(activeClass);
                    }
                });

                //ui->model
                element.bind(toggleEvent, function () {
                    if (!element.hasClass(activeClass)) {
                        scope.$apply(function () {
                            ngModelCtrl.$setViewValue(value);
                        });
                    }
                });
            }
        };
    }])

    .directive('btnCheckbox', ['buttonConfig', function (buttonConfig) {

        var activeClass = buttonConfig.activeClass || 'active';
        var toggleEvent = buttonConfig.toggleEvent || 'click';

        return {
            require:'ngModel',
            link:function (scope, element, attrs, ngModelCtrl) {

                var trueValue = scope.$eval(attrs.btnCheckboxTrue);
                var falseValue = scope.$eval(attrs.btnCheckboxFalse);

                trueValue = angular.isDefined(trueValue) ? trueValue : true;
                falseValue = angular.isDefined(falseValue) ? falseValue : false;

                //model -> UI
                scope.$watch(function () {
                    return ngModelCtrl.$modelValue;
                }, function (modelValue) {
                    if (angular.equals(modelValue, trueValue)) {
                        element.addClass(activeClass);
                    } else {
                        element.removeClass(activeClass);
                    }
                });

                //ui->model
                element.bind(toggleEvent, function () {
                    scope.$apply(function () {
                        ngModelCtrl.$setViewValue(element.hasClass(activeClass) ? falseValue : trueValue);
                    });
                });
            }
        };
    }]);
/*
 *
 *    AngularJS Bootstrap Carousel
 *
 *      A pure AngularJS carousel.
 *
 *      For no interval set the interval to non-number, or milliseconds of desired interval
 *      Template: <carousel interval="none"><slide>{{anything}}</slide></carousel>
 *      To change the carousel's active slide set the active attribute to true
 *      Template: <carousel interval="none"><slide active="someModel">{{anything}}</slide></carousel>
 */
angular.module('ui.bootstrap.carousel', ['ui.bootstrap.transition'])
    .controller('CarouselController', ['$scope', '$timeout', '$transition', '$q', function ($scope, $timeout, $transition, $q) {
        var self = this,
            slides = self.slides = [],
            currentIndex = -1,
            currentTimeout, isPlaying;
        self.currentSlide = null;

        /* direction: "prev" or "next" */
        self.select = function(nextSlide, direction) {
            var nextIndex = slides.indexOf(nextSlide);
            //Decide direction if it's not given
            if (direction === undefined) {
                direction = nextIndex > currentIndex ? "next" : "prev";
            }
            if (nextSlide && nextSlide !== self.currentSlide) {
                if ($scope.$currentTransition) {
                    $scope.$currentTransition.cancel();
                    //Timeout so ng-class in template has time to fix classes for finished slide
                    $timeout(goNext);
                } else {
                    goNext();
                }
            }
            function goNext() {
                //If we have a slide to transition from and we have a transition type and we're allowed, go
                if (self.currentSlide && angular.isString(direction) && !$scope.noTransition && nextSlide.$element) {
                    //We shouldn't do class manip in here, but it's the same weird thing bootstrap does. need to fix sometime
                    nextSlide.$element.addClass(direction);
                    nextSlide.$element[0].offsetWidth = nextSlide.$element[0].offsetWidth; //force reflow

                    //Set all other slides to stop doing their stuff for the new transition
                    angular.forEach(slides, function(slide) {
                        angular.extend(slide, {direction: '', entering: false, leaving: false, active: false});
                    });
                    angular.extend(nextSlide, {direction: direction, active: true, entering: true});
                    angular.extend(self.currentSlide||{}, {direction: direction, leaving: true});

                    $scope.$currentTransition = $transition(nextSlide.$element, {});
                    //We have to create new pointers inside a closure since next & current will change
                    (function(next,current) {
                        $scope.$currentTransition.then(
                            function(){ transitionDone(next, current); },
                            function(){ transitionDone(next, current); }
                        );
                    }(nextSlide, self.currentSlide));
                } else {
                    transitionDone(nextSlide, self.currentSlide);
                }
                self.currentSlide = nextSlide;
                currentIndex = nextIndex;
                //every time you change slides, reset the timer
                restartTimer();
            }
            function transitionDone(next, current) {
                angular.extend(next, {direction: '', active: true, leaving: false, entering: false});
                angular.extend(current||{}, {direction: '', active: false, leaving: false, entering: false});
                $scope.$currentTransition = null;
            }
        };

        /* Allow outside people to call indexOf on slides array */
        self.indexOfSlide = function(slide) {
            return slides.indexOf(slide);
        };

        $scope.next = function() {
            var newIndex = (currentIndex + 1) % slides.length;
            return self.select(slides[newIndex], 'next');
        };

        $scope.prev = function() {
            var newIndex = currentIndex - 1 < 0 ? slides.length - 1 : currentIndex - 1;
            return self.select(slides[newIndex], 'prev');
        };

        $scope.select = function(slide) {
            self.select(slide);
        };

        $scope.isActive = function(slide) {
            return self.currentSlide === slide;
        };

        $scope.slides = function() {
            return slides;
        };

        $scope.$watch('interval', restartTimer);
        function restartTimer() {
            if (currentTimeout) {
                $timeout.cancel(currentTimeout);
            }
            function go() {
                if (isPlaying) {
                    $scope.next();
                    restartTimer();
                } else {
                    $scope.pause();
                }
            }
            var interval = +$scope.interval;
            if (!isNaN(interval) && interval>=0) {
                currentTimeout = $timeout(go, interval);
            }
        }
        $scope.play = function() {
            if (!isPlaying) {
                isPlaying = true;
                restartTimer();
            }
        };
        $scope.pause = function() {
            isPlaying = false;
            if (currentTimeout) {
                $timeout.cancel(currentTimeout);
            }
        };

        self.addSlide = function(slide, element) {
            slide.$element = element;
            slides.push(slide);
            //if this is the first slide or the slide is set to active, select it
            if(slides.length === 1 || slide.active) {
                self.select(slides[slides.length-1]);
                if (slides.length == 1) {
                    $scope.play();
                }
            } else {
                slide.active = false;
            }
        };

        self.removeSlide = function(slide) {
            //get the index of the slide inside the carousel
            var index = slides.indexOf(slide);
            slides.splice(index, 1);
            if (slides.length > 0 && slide.active) {
                if (index >= slides.length) {
                    self.select(slides[index-1]);
                } else {
                    self.select(slides[index]);
                }
            }
        };
    }])
    .directive('carousel', [function() {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            controller: 'CarouselController',
            require: 'carousel',
            templateUrl: 'template/carousel/carousel.html',
            scope: {
                interval: '=',
                noTransition: '='
            }
        };
    }])
    .directive('slide', [function() {
        return {
            require: '^carousel',
            restrict: 'EA',
            transclude: true,
            replace: true,
            templateUrl: 'template/carousel/slide.html',
            scope: {
                active: '='
            },
            link: function (scope, element, attrs, carouselCtrl) {
                carouselCtrl.addSlide(scope, element);
                //when the scope is destroyed then remove the slide from the current slides array
                scope.$on('$destroy', function() {
                    carouselCtrl.removeSlide(scope);
                });

                scope.$watch('active', function(active) {
                    if (active) {
                        carouselCtrl.select(scope);
                    }
                });
            }
        };
    }]);

// The `$dialogProvider` can be used to configure global defaults for your
// `$dialog` service.
var dialogModule = angular.module('ui.bootstrap.dialog', ['ui.bootstrap.transition']);

dialogModule.controller('MessageBoxController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.message = model.message;
    $scope.buttons = model.buttons;
    $scope.close = function(res){
        dialog.close(res);
    };
}]);

dialogModule.provider("$dialog", function(){

    // The default options for all dialogs.
    var defaults = {
        backdrop: true,
        dialogClass: 'modal',
        backdropClass: 'modal-backdrop',
        transitionClass: 'fade',
        triggerClass: 'in',
        dialogOpenClass: 'modal-open',
        resolve:{},
        backdropFade: false,
        dialogFade:false,
        keyboard: true, // close with esc key
        backdropClick: true // only in conjunction with backdrop=true
        /* other options: template, templateUrl, controller */
    };

    var globalOptions = {};

    var activeBackdrops = {value : 0};

    // The `options({})` allows global configuration of all dialogs in the application.
    //
    //      var app = angular.module('App', ['ui.bootstrap.dialog'], function($dialogProvider){
    //        // don't close dialog when backdrop is clicked by default
    //        $dialogProvider.options({backdropClick: false});
    //      });
    this.options = function(value){
        globalOptions = value;
    };

    // Returns the actual `$dialog` service that is injected in controllers
    this.$get = ["$http", "$document", "$compile", "$rootScope", "$controller", "$templateCache", "$q", "$transition", "$injector",
        function ($http, $document, $compile, $rootScope, $controller, $templateCache, $q, $transition, $injector) {

            var body = $document.find('body');

            function createElement(clazz) {
                var el = angular.element("<div>");
                el.addClass(clazz);
                return el;
            }

            // The `Dialog` class represents a modal dialog. The dialog class can be invoked by providing an options object
            // containing at lest template or templateUrl and controller:
            //
            //     var d = new Dialog({templateUrl: 'foo.html', controller: 'BarController'});
            //
            // Dialogs can also be created using templateUrl and controller as distinct arguments:
            //
            //     var d = new Dialog('path/to/dialog.html', MyDialogController);
            function Dialog(opts) {

                var self = this, options = this.options = angular.extend({}, defaults, globalOptions, opts);
                this._open = false;

                this.backdropEl = createElement(options.backdropClass);
                if(options.backdropFade){
                    this.backdropEl.addClass(options.transitionClass);
                    this.backdropEl.removeClass(options.triggerClass);
                }

                this.modalEl = createElement(options.dialogClass);
                if(options.dialogFade){
                    this.modalEl.addClass(options.transitionClass);
                    this.modalEl.removeClass(options.triggerClass);
                }

                this.handledEscapeKey = function(e) {
                    if (e.which === 27) {
                        self.close();
                        e.preventDefault();
                        self.$scope.$apply();
                    }
                };

                this.handleBackDropClick = function(e) {
                    self.close();
                    e.preventDefault();
                    self.$scope.$apply();
                };

                this.handleLocationChange = function() {
                    self.close();
                };
            }

            // The `isOpen()` method returns wether the dialog is currently visible.
            Dialog.prototype.isOpen = function(){
                return this._open;
            };

            // The `open(templateUrl, controller)` method opens the dialog.
            // Use the `templateUrl` and `controller` arguments if specifying them at dialog creation time is not desired.
            Dialog.prototype.open = function(templateUrl, controller){
                var self = this, options = this.options;

                if(templateUrl){
                    options.templateUrl = templateUrl;
                }
                if(controller){
                    options.controller = controller;
                }

                if(!(options.template || options.templateUrl)) {
                    throw new Error('Dialog.open expected template or templateUrl, neither found. Use options or open method to specify them.');
                }

                this._loadResolves().then(function(locals) {
                    var $scope = locals.$scope = self.$scope = locals.$scope ? locals.$scope : $rootScope.$new();

                    self.modalEl.html(locals.$template);

                    if (self.options.controller) {
                        var ctrl = $controller(self.options.controller, locals);
                        self.modalEl.children().data('ngControllerController', ctrl);
                    }

                    $compile(self.modalEl)($scope);
                    self._addElementsToDom();
                    body.addClass(self.options.dialogOpenClass);

                    // trigger tranisitions
                    setTimeout(function(){
                        if(self.options.dialogFade){ self.modalEl.addClass(self.options.triggerClass); }
                        if(self.options.backdropFade){ self.backdropEl.addClass(self.options.triggerClass); }
                    });

                    self._bindEvents();
                });

                this.deferred = $q.defer();
                return this.deferred.promise;
            };

            // closes the dialog and resolves the promise returned by the `open` method with the specified result.
            Dialog.prototype.close = function(result){
                var self = this;
                var fadingElements = this._getFadingElements();

                body.removeClass(self.options.dialogOpenClass);
                if(fadingElements.length > 0){
                    for (var i = fadingElements.length - 1; i >= 0; i--) {
                        $transition(fadingElements[i], removeTriggerClass).then(onCloseComplete);
                    }
                    return;
                }

                this._onCloseComplete(result);

                function removeTriggerClass(el){
                    el.removeClass(self.options.triggerClass);
                }

                function onCloseComplete(){
                    if(self._open){
                        self._onCloseComplete(result);
                    }
                }
            };

            Dialog.prototype._getFadingElements = function(){
                var elements = [];
                if(this.options.dialogFade){
                    elements.push(this.modalEl);
                }
                if(this.options.backdropFade){
                    elements.push(this.backdropEl);
                }

                return elements;
            };

            Dialog.prototype._bindEvents = function() {
                if(this.options.keyboard){ body.bind('keydown', this.handledEscapeKey); }
                if(this.options.backdrop && this.options.backdropClick){ this.backdropEl.bind('click', this.handleBackDropClick); }

                this.$scope.$on('$locationChangeSuccess', this.handleLocationChange);
            };

            Dialog.prototype._unbindEvents = function() {
                if(this.options.keyboard){ body.unbind('keydown', this.handledEscapeKey); }
                if(this.options.backdrop && this.options.backdropClick){ this.backdropEl.unbind('click', this.handleBackDropClick); }
            };

            Dialog.prototype._onCloseComplete = function(result) {
                this._removeElementsFromDom();
                this._unbindEvents();

                this.deferred.resolve(result);
            };

            Dialog.prototype._addElementsToDom = function(){
                body.append(this.modalEl);

                if(this.options.backdrop) {
                    if (activeBackdrops.value === 0) {
                        body.append(this.backdropEl);
                    }
                    activeBackdrops.value++;
                }

                this._open = true;
            };

            Dialog.prototype._removeElementsFromDom = function(){
                this.modalEl.remove();

                if(this.options.backdrop) {
                    activeBackdrops.value--;
                    if (activeBackdrops.value === 0) {
                        this.backdropEl.remove();
                    }
                }
                this._open = false;
            };

            // Loads all `options.resolve` members to be used as locals for the controller associated with the dialog.
            Dialog.prototype._loadResolves = function(){
                var values = [], keys = [], templatePromise, self = this;

                if (this.options.template) {
                    templatePromise = $q.when(this.options.template);
                } else if (this.options.templateUrl) {
                    templatePromise = $http.get(this.options.templateUrl, {cache:$templateCache})
                        .then(function(response) { return response.data; });
                }

                angular.forEach(this.options.resolve || [], function(value, key) {
                    keys.push(key);
                    values.push(angular.isString(value) ? $injector.get(value) : $injector.invoke(value));
                });

                keys.push('$template');
                values.push(templatePromise);

                return $q.all(values).then(function(values) {
                    var locals = {};
                    angular.forEach(values, function(value, index) {
                        locals[keys[index]] = value;
                    });
                    locals.dialog = self;
                    return locals;
                });
            };

            // The actual `$dialog` service that is injected in controllers.
            return {
                // Creates a new `Dialog` with the specified options.
                dialog: function(opts){
                    return new Dialog(opts);
                },
                // creates a new `Dialog` tied to the default message box template and controller.
                //
                // Arguments `title` and `message` are rendered in the modal header and body sections respectively.
                // The `buttons` array holds an object with the following members for each button to include in the
                // modal footer section:
                //
                // * `result`: the result to pass to the `close` method of the dialog when the button is clicked
                // * `label`: the label of the button
                // * `cssClass`: additional css class(es) to apply to the button for styling
                messageBox: function(title, message, buttons){
                    return new Dialog({templateUrl: 'template/dialog/message.html', controller: 'MessageBoxController', resolve:
                    {model: function() {
                        return {
                            title: title,
                            message: message,
                            buttons: buttons
                        };
                    }
                    }});
                }
            };
        }];
});

/*
 * dropdownToggle - Provides dropdown menu functionality in place of bootstrap js
 * @restrict class or attribute
 * @example:
 <li class="dropdown">
 <a class="dropdown-toggle">My Dropdown Menu</a>
 <ul class="dropdown-menu">
 <li ng-repeat="choice in dropChoices">
 <a ng-href="{{choice.href}}">{{choice.text}}</a>
 </li>
 </ul>
 </li>
 */

angular.module('ui.bootstrap.dropdownToggle', []).directive('dropdownToggle',
    ['$document', '$location', '$window', function ($document, $location, $window) {
        var openElement = null,
            closeMenu   = angular.noop;
        return {
            restrict: 'CA',
            link: function(scope, element, attrs) {
                scope.$watch('$location.path', function() { closeMenu(); });
                element.parent().bind('click', function() { closeMenu(); });
                element.bind('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    var elementWasOpen = (element === openElement);
                    if (!!openElement) {
                        closeMenu(); }
                    if (!elementWasOpen){
                        element.parent().addClass('open');
                        openElement = element;
                        closeMenu = function (event) {
                            if (event) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                            $document.unbind('click', closeMenu);
                            element.parent().removeClass('open');
                            closeMenu   = angular.noop;
                            openElement = null;
                        };
                        $document.bind('click', closeMenu);
                    }
                });
            }
        };
    }]);
angular.module('ui.bootstrap.modal', ['ui.bootstrap.dialog'])
    .directive('modal', ['$parse', '$dialog', function($parse, $dialog) {
        return {
            restrict: 'EA',
            terminal: true,
            link: function(scope, elm, attrs) {
                var opts = angular.extend({}, scope.$eval(attrs.uiOptions || attrs.bsOptions || attrs.options));
                var shownExpr = attrs.modal || attrs.show;
                var setClosed;

                // Create a dialog with the template as the contents of the directive
                // Add the current scope as the resolve in order to make the directive scope as a dialog controller scope
                opts = angular.extend(opts, {
                    template: elm.html(),
                    resolve: { $scope: function() { return scope; } }
                });
                var dialog = $dialog.dialog(opts);

                elm.remove();

                if (attrs.close) {
                    setClosed = function() {
                        $parse(attrs.close)(scope);
                    };
                } else {
                    setClosed = function() {
                        if (angular.isFunction($parse(shownExpr).assign)) {
                            $parse(shownExpr).assign(scope, false);
                        }
                    };
                }

                scope.$watch(shownExpr, function(isShown, oldShown) {
                    if (isShown) {
                        dialog.open().then(function(){
                            setClosed();
                        });
                    } else {
                        //Make sure it is not opened
                        if (dialog.isOpen()){
                            dialog.close();
                        }
                    }
                });
            }
        };
    }]);
angular.module('ui.bootstrap.pagination', [])

    .constant('paginationConfig', {
        boundaryLinks: false,
        directionLinks: true,
        firstText: 'First',
        previousText: 'Previous',
        nextText: 'Next',
        lastText: 'Last'
    })

    .directive('pagination', ['paginationConfig', function(paginationConfig) {
        return {
            restrict: 'EA',
            scope: {
                numPages: '=',
                currentPage: '=',
                maxSize: '=',
                onSelectPage: '&'
            },
            templateUrl: 'template/pagination/pagination.html',
            replace: true,
            link: function(scope, element, attrs) {

                // Setup configuration parameters
                var boundaryLinks = angular.isDefined(attrs.boundaryLinks) ? scope.$eval(attrs.boundaryLinks) : paginationConfig.boundaryLinks;
                var directionLinks = angular.isDefined(attrs.directionLinks) ? scope.$eval(attrs.directionLinks) : paginationConfig.directionLinks;
                var firstText = angular.isDefined(attrs.firstText) ? attrs.firstText : paginationConfig.firstText;
                var previousText = angular.isDefined(attrs.previousText) ? attrs.previousText : paginationConfig.previousText;
                var nextText = angular.isDefined(attrs.nextText) ? attrs.nextText : paginationConfig.nextText;
                var lastText = angular.isDefined(attrs.lastText) ? attrs.lastText : paginationConfig.lastText;

                // Create page object used in template
                function makePage(number, text, isActive, isDisabled) {
                    return {
                        number: number,
                        text: text,
                        active: isActive,
                        disabled: isDisabled
                    };
                }

                scope.$watch('numPages + currentPage + maxSize', function() {
                    scope.pages = [];

                    // Default page limits
                    var startPage = 1, endPage = scope.numPages;

                    // recompute if maxSize
                    if ( scope.maxSize && scope.maxSize < scope.numPages ) {
                        startPage = Math.max(scope.currentPage - Math.floor(scope.maxSize/2), 1);
                        endPage   = startPage + scope.maxSize - 1;

                        // Adjust if limit is exceeded
                        if (endPage > scope.numPages) {
                            endPage   = scope.numPages;
                            startPage = endPage - scope.maxSize + 1;
                        }
                    }

                    // Add page number links
                    for (var number = startPage; number <= endPage; number++) {
                        var page = makePage(number, number, scope.isActive(number), false);
                        scope.pages.push(page);
                    }

                    // Add previous & next links
                    if (directionLinks) {
                        var previousPage = makePage(scope.currentPage - 1, previousText, false, scope.noPrevious());
                        scope.pages.unshift(previousPage);

                        var nextPage = makePage(scope.currentPage + 1, nextText, false, scope.noNext());
                        scope.pages.push(nextPage);
                    }

                    // Add first & last links
                    if (boundaryLinks) {
                        var firstPage = makePage(1, firstText, false, scope.noPrevious());
                        scope.pages.unshift(firstPage);

                        var lastPage = makePage(scope.numPages, lastText, false, scope.noNext());
                        scope.pages.push(lastPage);
                    }


                    if ( scope.currentPage > scope.numPages ) {
                        scope.selectPage(scope.numPages);
                    }
                });
                scope.noPrevious = function() {
                    return scope.currentPage === 1;
                };
                scope.noNext = function() {
                    return scope.currentPage === scope.numPages;
                };
                scope.isActive = function(page) {
                    return scope.currentPage === page;
                };

                scope.selectPage = function(page) {
                    if ( ! scope.isActive(page) && page > 0 && page <= scope.numPages) {
                        scope.currentPage = page;
                        scope.onSelectPage({ page: page });
                    }
                };
            }
        };
    }]);
angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
    .factory('$position', ['$document', '$window', function ($document, $window) {

        function getStyle(el, cssprop) {
            if (el.currentStyle) { //IE
                return el.currentStyle[cssprop];
            } else if ($window.getComputedStyle) {
                return $window.getComputedStyle(el)[cssprop];
            }
            // finally try and get inline style
            return el.style[cssprop];
        }

        /**
         * Checks if a given element is statically positioned
         * @param element - raw DOM element
         */
        function isStaticPositioned(element) {
            return (getStyle(element, "position") || 'static' ) === 'static';
        }

        /**
         * returns the closest, non-statically positioned parentOffset of a given element
         * @param element
         */
        var parentOffsetEl = function (element) {
            var docDomEl = $document[0];
            var offsetParent = element.offsetParent || docDomEl;
            while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
                offsetParent = offsetParent.offsetParent;
            }
            return offsetParent || docDomEl;
        };

        return {
            /**
             * Provides read-only equivalent of jQuery's position function:
             * http://api.jquery.com/position/
             */
            position: function (element) {
                var elBCR = this.offset(element);
                var offsetParentBCR = { top: 0, left: 0 };
                var offsetParentEl = parentOffsetEl(element[0]);
                if (offsetParentEl != $document[0]) {
                    offsetParentBCR = this.offset(angular.element(offsetParentEl));
                    offsetParentBCR.top += offsetParentEl.clientTop;
                    offsetParentBCR.left += offsetParentEl.clientLeft;
                }

                return {
                    width: element.prop('offsetWidth'),
                    height: element.prop('offsetHeight'),
                    top: elBCR.top - offsetParentBCR.top,
                    left: elBCR.left - offsetParentBCR.left
                };
            },

            /**
             * Provides read-only equivalent of jQuery's offset function:
             * http://api.jquery.com/offset/
             */
            offset: function (element) {
                var boundingClientRect = element[0].getBoundingClientRect();
                return {
                    width: element.prop('offsetWidth'),
                    height: element.prop('offsetHeight'),
                    top: boundingClientRect.top + ($window.pageYOffset || $document[0].body.scrollTop),
                    left: boundingClientRect.left + ($window.pageXOffset || $document[0].body.scrollLeft)
                };
            }
        };
    }]);

/**
 * The following features are still outstanding: animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html tooltips, and selector delegation.
 */
angular.module( 'ui.bootstrap.tooltip', [ 'ui.bootstrap.position' ] )

/**
 * The $tooltip service creates tooltip- and popover-like directives as well as
 * houses global options for them.
 */
    .provider( '$tooltip', function () {
        // The default options tooltip and popover.
        var defaultOptions = {
            placement: 'top',
            animation: true,
            popupDelay: 0
        };

        // Default hide triggers for each show trigger
        var triggerMap = {
            'mouseenter': 'mouseleave',
            'click': 'click',
            'focus': 'blur'
        };

        // The options specified to the provider globally.
        var globalOptions = {};

        /**
         * `options({})` allows global configuration of all tooltips in the
         * application.
         *
         *   var app = angular.module( 'App', ['ui.bootstrap.tooltip'], function( $tooltipProvider ) {
   *     // place tooltips left instead of top by default
   *     $tooltipProvider.options( { placement: 'left' } );
   *   });
         */
        this.options = function( value ) {
            angular.extend( globalOptions, value );
        };

        /**
         * This is a helper function for translating camel-case to snake-case.
         */
        function snake_case(name){
            var regexp = /[A-Z]/g;
            var separator = '-';
            return name.replace(regexp, function(letter, pos) {
                return (pos ? separator : '') + letter.toLowerCase();
            });
        }

        /**
         * Returns the actual instance of the $tooltip service.
         * TODO support multiple triggers
         */
        this.$get = [ '$window', '$compile', '$timeout', '$parse', '$document', '$position', function ( $window, $compile, $timeout, $parse, $document, $position ) {
            return function $tooltip ( type, prefix, defaultTriggerShow ) {
                var options = angular.extend( {}, defaultOptions, globalOptions );

                /**
                 * Returns an object of show and hide triggers.
                 *
                 * If a trigger is supplied,
                 * it is used to show the tooltip; otherwise, it will use the `trigger`
                 * option passed to the `$tooltipProvider.options` method; else it will
                 * default to the trigger supplied to this directive factory.
                 *
                 * The hide trigger is based on the show trigger. If the `trigger` option
                 * was passed to the `$tooltipProvider.options` method, it will use the
                 * mapped trigger from `triggerMap` or the passed trigger if the map is
                 * undefined; otherwise, it uses the `triggerMap` value of the show
                 * trigger; else it will just use the show trigger.
                 */
                function setTriggers ( trigger ) {
                    var show, hide;

                    show = trigger || options.trigger || defaultTriggerShow;
                    if ( angular.isDefined ( options.trigger ) ) {
                        hide = triggerMap[options.trigger] || show;
                    } else {
                        hide = triggerMap[show] || show;
                    }

                    return {
                        show: show,
                        hide: hide
                    };
                }

                var directiveName = snake_case( type );
                var triggers = setTriggers( undefined );

                var template =
                    '<'+ directiveName +'-popup '+
                        'title="{{tt_title}}" '+
                        'content="{{tt_content}}" '+
                        'placement="{{tt_placement}}" '+
                        'animation="tt_animation()" '+
                        'is-open="tt_isOpen"'+
                        '>'+
                        '</'+ directiveName +'-popup>';

                return {
                    restrict: 'EA',
                    scope: true,
                    link: function link ( scope, element, attrs ) {
                        var tooltip = $compile( template )( scope );
                        var transitionTimeout;
                        var popupTimeout;
                        var $body;

                        // By default, the tooltip is not open.
                        // TODO add ability to start tooltip opened
                        scope.tt_isOpen = false;

                        function toggleTooltipBind () {
                            if ( ! scope.tt_isOpen ) {
                                showTooltipBind();
                            } else {
                                hideTooltipBind();
                            }
                        }

                        // Show the tooltip with delay if specified, otherwise show it immediately
                        function showTooltipBind() {
                            if ( scope.tt_popupDelay ) {
                                popupTimeout = $timeout( show, scope.tt_popupDelay );
                            } else {
                                scope.$apply( show );
                            }
                        }

                        function hideTooltipBind () {
                            scope.$apply(function () {
                                hide();
                            });
                        }

                        // Show the tooltip popup element.
                        function show() {
                            var position,
                                ttWidth,
                                ttHeight,
                                ttPosition;

                            // Don't show empty tooltips.
                            if ( ! scope.tt_content ) {
                                return;
                            }

                            // If there is a pending remove transition, we must cancel it, lest the
                            // tooltip be mysteriously removed.
                            if ( transitionTimeout ) {
                                $timeout.cancel( transitionTimeout );
                            }

                            // Set the initial positioning.
                            tooltip.css({ top: 0, left: 0, display: 'block' });

                            // Now we add it to the DOM because need some info about it. But it's not
                            // visible yet anyway.
                            if ( options.appendToBody ) {
                                $body = $body || $document.find( 'body' );
                                $body.append( tooltip );
                            } else {
                                element.after( tooltip );
                            }

                            // Get the position of the directive element.
                            position = $position.position( element );

                            // Get the height and width of the tooltip so we can center it.
                            ttWidth = tooltip.prop( 'offsetWidth' );
                            ttHeight = tooltip.prop( 'offsetHeight' );

                            // Calculate the tooltip's top and left coordinates to center it with
                            // this directive.
                            switch ( scope.tt_placement ) {
                                case 'right':
                                    ttPosition = {
                                        top: (position.top + position.height / 2 - ttHeight / 2) + 'px',
                                        left: (position.left + position.width) + 'px'
                                    };
                                    break;
                                case 'bottom':
                                    ttPosition = {
                                        top: (position.top + position.height) + 'px',
                                        left: (position.left + position.width / 2 - ttWidth / 2) + 'px'
                                    };
                                    break;
                                case 'left':
                                    ttPosition = {
                                        top: (position.top + position.height / 2 - ttHeight / 2) + 'px',
                                        left: (position.left - ttWidth) + 'px'
                                    };
                                    break;
                                default:
                                    ttPosition = {
                                        top: (position.top - ttHeight) + 'px',
                                        left: (position.left + position.width / 2 - ttWidth / 2) + 'px'
                                    };
                                    break;
                            }

                            // Now set the calculated positioning.
                            tooltip.css( ttPosition );

                            // And show the tooltip.
                            scope.tt_isOpen = true;
                        }

                        // Hide the tooltip popup element.
                        function hide() {
                            // First things first: we don't show it anymore.
                            scope.tt_isOpen = false;

                            //if tooltip is going to be shown after delay, we must cancel this
                            $timeout.cancel( popupTimeout );

                            // And now we remove it from the DOM. However, if we have animation, we
                            // need to wait for it to expire beforehand.
                            // FIXME: this is a placeholder for a port of the transitions library.
                            if ( angular.isDefined( scope.tt_animation ) && scope.tt_animation() ) {
                                transitionTimeout = $timeout( function () { tooltip.remove(); }, 500 );
                            } else {
                                tooltip.remove();
                            }
                        }

                        /**
                         * Observe the relevant attributes.
                         */
                        attrs.$observe( type, function ( val ) {
                            scope.tt_content = val;
                        });

                        attrs.$observe( prefix+'Title', function ( val ) {
                            scope.tt_title = val;
                        });

                        attrs.$observe( prefix+'Placement', function ( val ) {
                            scope.tt_placement = angular.isDefined( val ) ? val : options.placement;
                        });

                        attrs.$observe( prefix+'Animation', function ( val ) {
                            scope.tt_animation = angular.isDefined( val ) ? $parse( val ) : function(){ return options.animation; };
                        });

                        attrs.$observe( prefix+'PopupDelay', function ( val ) {
                            var delay = parseInt( val, 10 );
                            scope.tt_popupDelay = ! isNaN(delay) ? delay : options.popupDelay;
                        });

                        attrs.$observe( prefix+'Trigger', function ( val ) {
                            element.unbind( triggers.show );
                            element.unbind( triggers.hide );

                            triggers = setTriggers( val );

                            if ( triggers.show === triggers.hide ) {
                                element.bind( triggers.show, toggleTooltipBind );
                            } else {
                                element.bind( triggers.show, showTooltipBind );
                                element.bind( triggers.hide, hideTooltipBind );
                            }
                        });
                    }
                };
            };
        }];
    })

    .directive( 'tooltipPopup', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: { content: '@', placement: '@', animation: '&', isOpen: '&' },
            templateUrl: 'template/tooltip/tooltip-popup.html'
        };
    })

    .directive( 'tooltip', [ '$tooltip', function ( $tooltip ) {
        return $tooltip( 'tooltip', 'tooltip', 'mouseenter' );
    }])

    .directive( 'tooltipHtmlUnsafePopup', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: { content: '@', placement: '@', animation: '&', isOpen: '&' },
            templateUrl: 'template/tooltip/tooltip-html-unsafe-popup.html'
        };
    })

    .directive( 'tooltipHtmlUnsafe', [ '$tooltip', function ( $tooltip ) {
        return $tooltip( 'tooltipHtmlUnsafe', 'tooltip', 'mouseenter' );
    }])

;


/**
 * The following features are still outstanding: popup delay, animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html popovers, and selector delegatation.
 */
angular.module( 'ui.bootstrap.popover', [ 'ui.bootstrap.tooltip' ] )
    .directive( 'popoverPopup', function () {
        return {
            restrict: 'EA',
            replace: true,
            scope: { title: '@', content: '@', placement: '@', animation: '&', isOpen: '&' },
            templateUrl: 'template/popover/popover.html'
        };
    })
    .directive( 'popover', [ '$compile', '$timeout', '$parse', '$window', '$tooltip', function ( $compile, $timeout, $parse, $window, $tooltip ) {
        return $tooltip( 'popover', 'popover', 'click' );
    }]);


angular.module('ui.bootstrap.progressbar', ['ui.bootstrap.transition'])

    .constant('progressConfig', {
        animate: true,
        autoType: false,
        stackedTypes: ['success', 'info', 'warning', 'danger']
    })

    .controller('ProgressBarController', ['$scope', '$attrs', 'progressConfig', function($scope, $attrs, progressConfig) {

        // Whether bar transitions should be animated
        var animate = angular.isDefined($attrs.animate) ? $scope.$eval($attrs.animate) : progressConfig.animate;
        var autoType = angular.isDefined($attrs.autoType) ? $scope.$eval($attrs.autoType) : progressConfig.autoType;
        var stackedTypes = angular.isDefined($attrs.stackedTypes) ? $scope.$eval('[' + $attrs.stackedTypes + ']') : progressConfig.stackedTypes;

        // Create bar object
        this.makeBar = function(newBar, oldBar, index) {
            var newValue = (angular.isObject(newBar)) ? newBar.value : (newBar || 0);
            var oldValue =  (angular.isObject(oldBar)) ? oldBar.value : (oldBar || 0);
            var type = (angular.isObject(newBar) && angular.isDefined(newBar.type)) ? newBar.type : (autoType) ? getStackedType(index || 0) : null;

            return {
                from: oldValue,
                to: newValue,
                type: type,
                animate: animate
            };
        };

        function getStackedType(index) {
            return stackedTypes[index];
        }

        this.addBar = function(bar) {
            $scope.bars.push(bar);
            $scope.totalPercent += bar.to;
        };

        this.clearBars = function() {
            $scope.bars = [];
            $scope.totalPercent = 0;
        };
        this.clearBars();
    }])

    .directive('progress', function() {
        return {
            restrict: 'EA',
            replace: true,
            controller: 'ProgressBarController',
            scope: {
                value: '=',
                onFull: '&',
                onEmpty: '&'
            },
            templateUrl: 'template/progressbar/progress.html',
            link: function(scope, element, attrs, controller) {
                scope.$watch('value', function(newValue, oldValue) {
                    controller.clearBars();

                    if (angular.isArray(newValue)) {
                        // Stacked progress bar
                        for (var i=0, n=newValue.length; i < n; i++) {
                            controller.addBar(controller.makeBar(newValue[i], oldValue[i], i));
                        }
                    } else {
                        // Simple bar
                        controller.addBar(controller.makeBar(newValue, oldValue));
                    }
                }, true);

                // Total percent listeners
                scope.$watch('totalPercent', function(value) {
                    if (value >= 100) {
                        scope.onFull();
                    } else if (value <= 0) {
                        scope.onEmpty();
                    }
                }, true);
            }
        };
    })

    .directive('progressbar', ['$transition', function($transition) {
        return {
            restrict: 'EA',
            replace: true,
            scope: {
                width: '=',
                old: '=',
                type: '=',
                animate: '='
            },
            templateUrl: 'template/progressbar/bar.html',
            link: function(scope, element) {
                scope.$watch('width', function(value) {
                    if (scope.animate) {
                        element.css('width', scope.old + '%');
                        $transition(element, {width: value + '%'});
                    } else {
                        element.css('width', value + '%');
                    }
                });
            }
        };
    }]);
angular.module('ui.bootstrap.rating', [])

    .constant('ratingConfig', {
        max: 5
    })

    .directive('rating', ['ratingConfig', '$parse', function(ratingConfig, $parse) {
        return {
            restrict: 'EA',
            scope: {
                value: '='
            },
            templateUrl: 'template/rating/rating.html',
            replace: true,
            link: function(scope, element, attrs) {

                var maxRange = angular.isDefined(attrs.max) ? scope.$eval(attrs.max) : ratingConfig.max;

                scope.range = [];
                for (var i = 1; i <= maxRange; i++) {
                    scope.range.push(i);
                }

                scope.rate = function(value) {
                    if ( ! scope.readonly ) {
                        scope.value = value;
                    }
                };

                scope.enter = function(value) {
                    if ( ! scope.readonly ) {
                        scope.val = value;
                    }
                };

                scope.reset = function() {
                    scope.val = angular.copy(scope.value);
                };
                scope.reset();

                scope.$watch('value', function(value) {
                    scope.val = value;
                });

                scope.readonly = false;
                if (attrs.readonly) {
                    scope.$parent.$watch($parse(attrs.readonly), function(value) {
                        scope.readonly = !!value;
                    });
                }
            }
        };
    }]);
angular.module('ui.bootstrap.tabs', [])
    .controller('TabsController', ['$scope', '$element', function($scope, $element) {
        var panes = $scope.panes = [];

        this.select = $scope.select = function selectPane(pane) {
            angular.forEach(panes, function(pane) {
                pane.selected = false;
            });
            pane.selected = true;
        };

        this.addPane = function addPane(pane) {
            if (!panes.length) {
                $scope.select(pane);
            }
            panes.push(pane);
        };

        this.removePane = function removePane(pane) {
            var index = panes.indexOf(pane);
            panes.splice(index, 1);
            //Select a new pane if removed pane was selected
            if (pane.selected && panes.length > 0) {
                $scope.select(panes[index < panes.length ? index : index-1]);
            }
        };
    }])
    .directive('tabs', function() {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {},
            controller: 'TabsController',
            templateUrl: 'template/tabs/tabs.html',
            replace: true
        };
    })
    .directive('pane', ['$parse', function($parse) {
        return {
            require: '^tabs',
            restrict: 'EA',
            transclude: true,
            scope:{
                heading:'@'
            },
            link: function(scope, element, attrs, tabsCtrl) {
                var getSelected, setSelected;
                scope.selected = false;
                if (attrs.active) {
                    getSelected = $parse(attrs.active);
                    setSelected = getSelected.assign;
                    scope.$watch(
                        function watchSelected() {return getSelected(scope.$parent);},
                        function updateSelected(value) {scope.selected = value;}
                    );
                    scope.selected = getSelected ? getSelected(scope.$parent) : false;
                }
                scope.$watch('selected', function(selected) {
                    if(selected) {
                        tabsCtrl.select(scope);
                    }
                    if(setSelected) {
                        setSelected(scope.$parent, selected);
                    }
                });

                tabsCtrl.addPane(scope);
                scope.$on('$destroy', function() {
                    tabsCtrl.removePane(scope);
                });
            },
            templateUrl: 'template/tabs/pane.html',
            replace: true
        };
    }]);

angular.module('ui.bootstrap.typeahead', ['ui.bootstrap.position'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
    .factory('typeaheadParser', ['$parse', function ($parse) {

        //                      00000111000000000000022200000000000000003333333333333330000000000044000
        var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

        return {
            parse:function (input) {

                var match = input.match(TYPEAHEAD_REGEXP), modelMapper, viewMapper, source;
                if (!match) {
                    throw new Error(
                        "Expected typeahead specification in form of '_modelValue_ (as _label_)? for _item_ in _collection_'" +
                            " but got '" + input + "'.");
                }

                return {
                    itemName:match[3],
                    source:$parse(match[4]),
                    viewMapper:$parse(match[2] || match[1]),
                    modelMapper:$parse(match[1])
                };
            }
        };
    }])

    .directive('typeahead', ['$compile', '$parse', '$q', '$document', '$position', 'typeaheadParser', function ($compile, $parse, $q, $document, $position, typeaheadParser) {

        var HOT_KEYS = [9, 13, 27, 38, 40];

        return {
            require:'ngModel',
            link:function (originalScope, element, attrs, modelCtrl) {

                var selected;

                //minimal no of characters that needs to be entered before typeahead kicks-in
                var minSearch = originalScope.$eval(attrs.typeaheadMinLength) || 1;

                //expressions used by typeahead
                var parserResult = typeaheadParser.parse(attrs.typeahead);

                //should it restrict model values to the ones selected from the popup only?
                var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;

                var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;

                //pop-up element used to display matches
                var popUpEl = angular.element(
                    "<typeahead-popup " +
                        "matches='matches' " +
                        "active='activeIdx' " +
                        "select='select(activeIdx)' "+
                        "query='query' "+
                        "position='position'>"+
                        "</typeahead-popup>");

                //create a child scope for the typeahead directive so we are not polluting original scope
                //with typeahead-specific data (matches, query etc.)
                var scope = originalScope.$new();
                originalScope.$on('$destroy', function(){
                    scope.$destroy();
                });

                var resetMatches = function() {
                    scope.matches = [];
                    scope.activeIdx = -1;
                };

                var getMatchesAsync = function(inputValue) {

                    var locals = {$viewValue: inputValue};
                    isLoadingSetter(originalScope, true);
                    $q.when(parserResult.source(scope, locals)).then(function(matches) {

                        //it might happen that several async queries were in progress if a user were typing fast
                        //but we are interested only in responses that correspond to the current view value
                        if (inputValue === modelCtrl.$viewValue) {
                            if (matches.length > 0) {

                                scope.activeIdx = 0;
                                scope.matches.length = 0;

                                //transform labels
                                for(var i=0; i<matches.length; i++) {
                                    locals[parserResult.itemName] = matches[i];
                                    scope.matches.push({
                                        label: parserResult.viewMapper(scope, locals),
                                        model: matches[i]
                                    });
                                }

                                scope.query = inputValue;
                                //position pop-up with matches - we need to re-calculate its position each time we are opening a window
                                //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
                                //due to other elements being rendered
                                scope.position = $position.position(element);
                                scope.position.top = scope.position.top + element.prop('offsetHeight');

                            } else {
                                resetMatches();
                            }
                            isLoadingSetter(originalScope, false);
                        }
                    }, function(){
                        resetMatches();
                        isLoadingSetter(originalScope, false);
                    });
                };

                resetMatches();

                //we need to propagate user's query so we can higlight matches
                scope.query = undefined;

                //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
                //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
                modelCtrl.$parsers.push(function (inputValue) {

                    resetMatches();
                    if (selected) {
                        return inputValue;
                    } else {
                        if (inputValue && inputValue.length >= minSearch) {
                            getMatchesAsync(inputValue);
                        }
                    }

                    return isEditable ? inputValue : undefined;
                });

                modelCtrl.$render = function () {
                    var locals = {};
                    locals[parserResult.itemName] = selected || modelCtrl.$viewValue;
                    element.val(parserResult.viewMapper(scope, locals) || modelCtrl.$viewValue);
                    selected = undefined;
                };

                scope.select = function (activeIdx) {
                    //called from within the $digest() cycle
                    var locals = {};
                    locals[parserResult.itemName] = selected = scope.matches[activeIdx].model;

                    modelCtrl.$setViewValue(parserResult.modelMapper(scope, locals));
                    modelCtrl.$render();
                };

                //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
                element.bind('keydown', function (evt) {

                    //typeahead is open and an "interesting" key was pressed
                    if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
                        return;
                    }

                    evt.preventDefault();

                    if (evt.which === 40) {
                        scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
                        scope.$digest();

                    } else if (evt.which === 38) {
                        scope.activeIdx = (scope.activeIdx ? scope.activeIdx : scope.matches.length) - 1;
                        scope.$digest();

                    } else if (evt.which === 13 || evt.which === 9) {
                        scope.$apply(function () {
                            scope.select(scope.activeIdx);
                        });

                    } else if (evt.which === 27) {
                        evt.stopPropagation();

                        resetMatches();
                        scope.$digest();
                    }
                });

                $document.bind('click', function(){
                    resetMatches();
                    scope.$digest();
                });

                element.after($compile(popUpEl)(scope));
            }
        };

    }])

    .directive('typeaheadPopup', function () {
        return {
            restrict:'E',
            scope:{
                matches:'=',
                query:'=',
                active:'=',
                position:'=',
                select:'&'
            },
            replace:true,
            templateUrl:'template/typeahead/typeahead.html',
            link:function (scope, element, attrs) {

                scope.isOpen = function () {
                    return scope.matches.length > 0;
                };

                scope.isActive = function (matchIdx) {
                    return scope.active == matchIdx;
                };

                scope.selectActive = function (matchIdx) {
                    scope.active = matchIdx;
                };

                scope.selectMatch = function (activeIdx) {
                    scope.select({activeIdx:activeIdx});
                };
            }
        };
    })

    .filter('typeaheadHighlight', function() {

        function escapeRegexp(queryToEscape) {
            return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        }

        return function(matchItem, query) {
            return query ? matchItem.replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : query;
        };
    });
angular.module("template/accordion/accordion-group.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/accordion/accordion-group.html",
        "<div class=\"accordion-group\">\n" +
            "  <div class=\"accordion-heading\" ><a class=\"accordion-toggle\" ng-click=\"isOpen = !isOpen\" accordion-transclude=\"heading\">{{heading}}</a></div>\n" +
            "  <div class=\"accordion-body\" collapse=\"!isOpen\">\n" +
            "    <div class=\"accordion-inner\" ng-transclude></div>  </div>\n" +
            "</div>");
}]);

angular.module("template/accordion/accordion.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/accordion/accordion.html",
        "<div class=\"accordion\" ng-transclude></div>");
}]);

angular.module("template/alert/alert.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/alert/alert.html",
        "<div class='alert' ng-class='type && \"alert-\" + type'>\n" +
            "    <button ng-show='closeable' type='button' class='close' ng-click='close()'>&times;</button>\n" +
            "    <div ng-transclude></div>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/carousel/carousel.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/carousel/carousel.html",
        "<div ng-mouseenter=\"pause()\" ng-mouseleave=\"play()\" class=\"carousel\">\n" +
            "    <ol class=\"carousel-indicators\" ng-show=\"slides().length > 1\">\n" +
            "        <li ng-repeat=\"slide in slides()\" ng-class=\"{active: isActive(slide)}\" ng-click=\"select(slide)\"></li>\n" +
            "    </ol>\n" +
            "    <div class=\"carousel-inner\" ng-transclude></div>\n" +
            "    <a ng-click=\"prev()\" class=\"carousel-control left\" ng-show=\"slides().length > 1\">&lsaquo;</a>\n" +
            "    <a ng-click=\"next()\" class=\"carousel-control right\" ng-show=\"slides().length > 1\">&rsaquo;</a>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/carousel/slide.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/carousel/slide.html",
        "<div ng-class=\"{\n" +
            "    'active': leaving || (active && !entering),\n" +
            "    'prev': (next || active) && direction=='prev',\n" +
            "    'next': (next || active) && direction=='next',\n" +
            "    'right': direction=='prev',\n" +
            "    'left': direction=='next'\n" +
            "  }\" class=\"item\" ng-transclude></div>\n" +
            "");
}]);

angular.module("template/dialog/message.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/dialog/message.html",
        "<div class=\"modal-header\">\n" +
            "	<h1>{{ title }}</h1>\n" +
            "</div>\n" +
            "<div class=\"modal-body\">\n" +
            "	<p>{{ message }}</p>\n" +
            "</div>\n" +
            "<div class=\"modal-footer\">\n" +
            "	<button ng-repeat=\"btn in buttons\" ng-click=\"close(btn.result)\" class=btn ng-class=\"btn.cssClass\">{{ btn.label }}</button>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/pagination/pagination.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/pagination/pagination.html",
        "<div class=\"pagination\"><ul>\n" +
            "  <li ng-repeat=\"page in pages\" ng-class=\"{active: page.active, disabled: page.disabled}\"><a ng-click=\"selectPage(page.number)\">{{page.text}}</a></li>\n" +
            "  </ul>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/tooltip/tooltip-html-unsafe-popup.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/tooltip/tooltip-html-unsafe-popup.html",
        "<div class=\"tooltip {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
            "  <div class=\"tooltip-arrow\"></div>\n" +
            "  <div class=\"tooltip-inner\" ng-bind-html-unsafe=\"content\"></div>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/tooltip/tooltip-popup.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/tooltip/tooltip-popup.html",
        "<div class=\"tooltip {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
            "  <div class=\"tooltip-arrow\"></div>\n" +
            "  <div class=\"tooltip-inner\" ng-bind=\"content\"></div>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/popover/popover.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/popover/popover.html",
        "<div class=\"popover {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
            "  <div class=\"arrow\"></div>\n" +
            "\n" +
            "  <div class=\"popover-inner\">\n" +
            "      <h3 class=\"popover-title\" ng-bind=\"title\" ng-show=\"title\"></h3>\n" +
            "      <div class=\"popover-content\" ng-bind=\"content\"></div>\n" +
            "  </div>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/progressbar/bar.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/progressbar/bar.html",
        "<div class=\"bar\" ng-class='type && \"bar-\" + type'></div>");
}]);

angular.module("template/progressbar/progress.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/progressbar/progress.html",
        "<div class=\"progress\"><progressbar ng-repeat=\"bar in bars\" width=\"bar.to\" old=\"bar.from\" animate=\"bar.animate\" type=\"bar.type\"></progressbar></div>");
}]);

angular.module("template/rating/rating.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/rating/rating.html",
        "<span ng-mouseleave=\"reset()\">\n" +
            "	<i ng-repeat=\"number in range\" ng-mouseenter=\"enter(number)\" ng-click=\"rate(number)\" ng-class=\"{'icon-star': number <= val, 'icon-star-empty': number > val}\"></i>\n" +
            "</span>\n" +
            "");
}]);

angular.module("template/tabs/pane.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/tabs/pane.html",
        "<div class=\"tab-pane\" ng-class=\"{active: selected}\" ng-show=\"selected\" ng-transclude></div>\n" +
            "");
}]);

angular.module("template/tabs/tabs.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/tabs/tabs.html",
        "<div class=\"tabbable\">\n" +
            "  <ul class=\"nav nav-tabs\">\n" +
            "    <li ng-repeat=\"pane in panes\" ng-class=\"{active:pane.selected}\">\n" +
            "      <a ng-click=\"select(pane)\">{{pane.heading}}</a>\n" +
            "    </li>\n" +
            "  </ul>\n" +
            "  <div class=\"tab-content\" ng-transclude></div>\n" +
            "</div>\n" +
            "");
}]);

angular.module("template/typeahead/match.html", []).run(["$templateCache", function($templateCache){
    $templateCache.put("template/typeahead/match.html",
        "<a tabindex=\"-1\" ng-bind-html-unsafe=\"match.label | typeaheadHighlight:query\"></a>");
}]);

angular.module("template/typeahead/typeahead.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("template/typeahead/typeahead.html",
        "<ul class=\"typeahead dropdown-menu\" ng-style=\"{display: isOpen()&&'block' || 'none', top: position.top+'px', left: position.left+'px'}\">\n" +
            "    <li ng-repeat=\"match in matches\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index)\">\n" +
            "        <a tabindex=\"-1\" ng-click=\"selectMatch($index)\" ng-bind-html-unsafe=\"match.label | typeaheadHighlight:query\"></a>\n" +
            "    </li>\n" +
            "</ul>");
}]);
;/*!
 * Timepicker Component for Twitter Bootstrap
 *
 * Copyright 2013 Joris de Wit
 *
 * Contributors https://github.com/jdewit/bootstrap-timepicker/graphs/contributors
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
(function($, window, document, undefined) {
    'use strict';

    // TIMEPICKER PUBLIC CLASS DEFINITION
    var Timepicker = function(element, options) {
        this.widget = '';
        this.$element = $(element);
        this.defaultTime = options.defaultTime;
        this.disableFocus = options.disableFocus;
        this.isOpen = options.isOpen;
        this.minuteStep = options.minuteStep;
        this.modalBackdrop = options.modalBackdrop;
        this.secondStep = options.secondStep;
        this.showInputs = options.showInputs;
        this.showMeridian = options.showMeridian;
        this.showSeconds = options.showSeconds;
        this.template = options.template;
        this.appendWidgetTo = options.appendWidgetTo;

        this._init();
    };

    Timepicker.prototype = {

        constructor: Timepicker,

        _init: function() {
            var self = this;

            if (this.$element.parent().hasClass('input-append') || this.$element.parent().hasClass('input-prepend')) {
                this.$element.parent('.input-append, .input-prepend').find('.add-on').on({
                    'click.timepicker': $.proxy(this.showWidget, this)
                });
                this.$element.on({
                    'focus.timepicker': $.proxy(this.highlightUnit, this),
                    'click.timepicker': $.proxy(this.highlightUnit, this),
                    'keydown.timepicker': $.proxy(this.elementKeydown, this),
                    'blur.timepicker': $.proxy(this.blurElement, this)
                });
            } else {
                if (this.template) {
                    this.$element.on({
                        'focus.timepicker': $.proxy(this.showWidget, this),
                        'click.timepicker': $.proxy(this.showWidget, this),
                        'blur.timepicker': $.proxy(this.blurElement, this)
                    });
                } else {
                    this.$element.on({
                        'focus.timepicker': $.proxy(this.highlightUnit, this),
                        'click.timepicker': $.proxy(this.highlightUnit, this),
                        'keydown.timepicker': $.proxy(this.elementKeydown, this),
                        'blur.timepicker': $.proxy(this.blurElement, this)
                    });
                }
            }

            if (this.template !== false) {
                this.$widget = $(this.getTemplate()).prependTo(this.$element.parents(this.appendWidgetTo)).on('click', $.proxy(this.widgetClick, this));
            } else {
                this.$widget = false;
            }

            if (this.showInputs && this.$widget !== false) {
                this.$widget.find('input').each(function() {
                    $(this).on({
                        'click.timepicker': function() { $(this).select(); },
                        'keydown.timepicker': $.proxy(self.widgetKeydown, self)
                    });
                });
            }

            this.setDefaultTime(this.defaultTime);
        },

        blurElement: function() {
            this.highlightedUnit = undefined;
            this.updateFromElementVal();
        },

        decrementHour: function() {
            if (this.showMeridian) {
                if (this.hour === 1) {
                    this.hour = 12;
                } else if (this.hour === 12) {
                    this.hour--;

                    return this.toggleMeridian();
                } else if (this.hour === 0) {
                    this.hour = 11;

                    return this.toggleMeridian();
                } else {
                    this.hour--;
                }
            } else {
                if (this.hour === 0) {
                    this.hour = 23;
                } else {
                    this.hour--;
                }
            }
            this.update();
        },

        decrementMinute: function(step) {
            var newVal;

            if (step) {
                newVal = this.minute - step;
            } else {
                newVal = this.minute - this.minuteStep;
            }

            if (newVal < 0) {
                this.decrementHour();
                this.minute = newVal + 60;
            } else {
                this.minute = newVal;
            }
            this.update();
        },

        decrementSecond: function() {
            var newVal = this.second - this.secondStep;

            if (newVal < 0) {
                this.decrementMinute(true);
                this.second = newVal + 60;
            } else {
                this.second = newVal;
            }
            this.update();
        },

        elementKeydown: function(e) {
            switch (e.keyCode) {
                case 9: //tab
                    this.updateFromElementVal();

                    switch (this.highlightedUnit) {
                        case 'hour':
                            e.preventDefault();
                            this.highlightNextUnit();
                            break;
                        case 'minute':
                            if (this.showMeridian || this.showSeconds) {
                                e.preventDefault();
                                this.highlightNextUnit();
                            }
                            break;
                        case 'second':
                            if (this.showMeridian) {
                                e.preventDefault();
                                this.highlightNextUnit();
                            }
                            break;
                    }
                    break;
                case 27: // escape
                    this.updateFromElementVal();
                    break;
                case 37: // left arrow
                    e.preventDefault();
                    this.highlightPrevUnit();
                    this.updateFromElementVal();
                    break;
                case 38: // up arrow
                    e.preventDefault();
                    switch (this.highlightedUnit) {
                        case 'hour':
                            this.incrementHour();
                            this.highlightHour();
                            break;
                        case 'minute':
                            this.incrementMinute();
                            this.highlightMinute();
                            break;
                        case 'second':
                            this.incrementSecond();
                            this.highlightSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            this.highlightMeridian();
                            break;
                    }
                    break;
                case 39: // right arrow
                    e.preventDefault();
                    this.updateFromElementVal();
                    this.highlightNextUnit();
                    break;
                case 40: // down arrow
                    e.preventDefault();
                    switch (this.highlightedUnit) {
                        case 'hour':
                            this.decrementHour();
                            this.highlightHour();
                            break;
                        case 'minute':
                            this.decrementMinute();
                            this.highlightMinute();
                            break;
                        case 'second':
                            this.decrementSecond();
                            this.highlightSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            this.highlightMeridian();
                            break;
                    }
                    break;
            }
        },

        formatTime: function(hour, minute, second, meridian) {
            hour = hour < 10 ? '0' + hour : hour;
            minute = minute < 10 ? '0' + minute : minute;
            second = second < 10 ? '0' + second : second;

            return hour + ':' + minute + (this.showSeconds ? ':' + second : '') + (this.showMeridian ? ' ' + meridian : '');
        },

        getCursorPosition: function() {
            var input = this.$element.get(0);

            if ('selectionStart' in input) {// Standard-compliant browsers

                return input.selectionStart;
            } else if (document.selection) {// IE fix
                input.focus();
                var sel = document.selection.createRange(),
                    selLen = document.selection.createRange().text.length;

                sel.moveStart('character', - input.value.length);

                return sel.text.length - selLen;
            }
        },

        getTemplate: function() {
            var template,
                hourTemplate,
                minuteTemplate,
                secondTemplate,
                meridianTemplate,
                templateContent;

            if (this.showInputs) {
                hourTemplate = '<input type="text" name="hour" class="bootstrap-timepicker-hour" maxlength="2"/>';
                minuteTemplate = '<input type="text" name="minute" class="bootstrap-timepicker-minute" maxlength="2"/>';
                secondTemplate = '<input type="text" name="second" class="bootstrap-timepicker-second" maxlength="2"/>';
                meridianTemplate = '<input type="text" name="meridian" class="bootstrap-timepicker-meridian" maxlength="2"/>';
            } else {
                hourTemplate = '<span class="bootstrap-timepicker-hour"></span>';
                minuteTemplate = '<span class="bootstrap-timepicker-minute"></span>';
                secondTemplate = '<span class="bootstrap-timepicker-second"></span>';
                meridianTemplate = '<span class="bootstrap-timepicker-meridian"></span>';
            }

            templateContent = '<table>'+
                '<tr>'+
                '<td><a href="#" data-action="incrementHour"><i class="icon-chevron-up"></i></a></td>'+
                '<td class="separator">&nbsp;</td>'+
                '<td><a href="#" data-action="incrementMinute"><i class="icon-chevron-up"></i></a></td>'+
                (this.showSeconds ?
                    '<td class="separator">&nbsp;</td>'+
                        '<td><a href="#" data-action="incrementSecond"><i class="icon-chevron-up"></i></a></td>'
                    : '') +
                (this.showMeridian ?
                    '<td class="separator">&nbsp;</td>'+
                        '<td class="meridian-column"><a href="#" data-action="toggleMeridian"><i class="icon-chevron-up"></i></a></td>'
                    : '') +
                '</tr>'+
                '<tr>'+
                '<td>'+ hourTemplate +'</td> '+
                '<td class="separator">:</td>'+
                '<td>'+ minuteTemplate +'</td> '+
                (this.showSeconds ?
                    '<td class="separator">:</td>'+
                        '<td>'+ secondTemplate +'</td>'
                    : '') +
                (this.showMeridian ?
                    '<td class="separator">&nbsp;</td>'+
                        '<td>'+ meridianTemplate +'</td>'
                    : '') +
                '</tr>'+
                '<tr>'+
                '<td><a href="#" data-action="decrementHour"><i class="icon-chevron-down"></i></a></td>'+
                '<td class="separator"></td>'+
                '<td><a href="#" data-action="decrementMinute"><i class="icon-chevron-down"></i></a></td>'+
                (this.showSeconds ?
                    '<td class="separator">&nbsp;</td>'+
                        '<td><a href="#" data-action="decrementSecond"><i class="icon-chevron-down"></i></a></td>'
                    : '') +
                (this.showMeridian ?
                    '<td class="separator">&nbsp;</td>'+
                        '<td><a href="#" data-action="toggleMeridian"><i class="icon-chevron-down"></i></a></td>'
                    : '') +
                '</tr>'+
                '</table>';

            switch(this.template) {
                case 'modal':
                    template = '<div class="bootstrap-timepicker-widget modal hide fade in" data-backdrop="'+ (this.modalBackdrop ? 'true' : 'false') +'">'+
                        '<div class="modal-header">'+
                        '<a href="#" class="close" data-dismiss="modal">×</a>'+
                        '<h3>Pick a Time</h3>'+
                        '</div>'+
                        '<div class="modal-content">'+
                        templateContent +
                        '</div>'+
                        '<div class="modal-footer">'+
                        '<a href="#" class="btn btn-primary" data-dismiss="modal">OK</a>'+
                        '</div>'+
                        '</div>';
                    break;
                case 'dropdown':
                    template = '<div class="bootstrap-timepicker-widget dropdown-menu">'+ templateContent +'</div>';
                    break;
            }

            return template;
        },

        getTime: function() {
            return this.formatTime(this.hour, this.minute, this.second, this.meridian);
        },

        hideWidget: function() {
            if (this.isOpen === false) {
                return;
            }

            if (this.showInputs) {
                this.updateFromWidgetInputs();
            }

            this.$element.trigger({
                'type': 'hide.timepicker',
                'time': {
                    'value': this.getTime(),
                    'hours': this.hour,
                    'minutes': this.minute,
                    'seconds': this.second,
                    'meridian': this.meridian
                }
            });

            if (this.template === 'modal' && this.$widget.modal) {
                this.$widget.modal('hide');
            } else {
                this.$widget.removeClass('open');
            }

            $(document).off('mousedown.timepicker');

            this.isOpen = false;
        },

        highlightUnit: function() {
            this.position = this.getCursorPosition();
            if (this.position >= 0 && this.position <= 2) {
                this.highlightHour();
            } else if (this.position >= 3 && this.position <= 5) {
                this.highlightMinute();
            } else if (this.position >= 6 && this.position <= 8) {
                if (this.showSeconds) {
                    this.highlightSecond();
                } else {
                    this.highlightMeridian();
                }
            } else if (this.position >= 9 && this.position <= 11) {
                this.highlightMeridian();
            }
        },

        highlightNextUnit: function() {
            switch (this.highlightedUnit) {
                case 'hour':
                    this.highlightMinute();
                    break;
                case 'minute':
                    if (this.showSeconds) {
                        this.highlightSecond();
                    } else if (this.showMeridian){
                        this.highlightMeridian();
                    } else {
                        this.highlightHour();
                    }
                    break;
                case 'second':
                    if (this.showMeridian) {
                        this.highlightMeridian();
                    } else {
                        this.highlightHour();
                    }
                    break;
                case 'meridian':
                    this.highlightHour();
                    break;
            }
        },

        highlightPrevUnit: function() {
            switch (this.highlightedUnit) {
                case 'hour':
                    this.highlightMeridian();
                    break;
                case 'minute':
                    this.highlightHour();
                    break;
                case 'second':
                    this.highlightMinute();
                    break;
                case 'meridian':
                    if (this.showSeconds) {
                        this.highlightSecond();
                    } else {
                        this.highlightMinute();
                    }
                    break;
            }
        },

        highlightHour: function() {
            var $element = this.$element.get(0);

            this.highlightedUnit = 'hour';

            if ($element.setSelectionRange) {
                setTimeout(function() {
                    $element.setSelectionRange(0,2);
                }, 0);
            }
        },

        highlightMinute: function() {
            var $element = this.$element.get(0);

            this.highlightedUnit = 'minute';

            if ($element.setSelectionRange) {
                setTimeout(function() {
                    $element.setSelectionRange(3,5);
                }, 0);
            }
        },

        highlightSecond: function() {
            var $element = this.$element.get(0);

            this.highlightedUnit = 'second';

            if ($element.setSelectionRange) {
                setTimeout(function() {
                    $element.setSelectionRange(6,8);
                }, 0);
            }
        },

        highlightMeridian: function() {
            var $element = this.$element.get(0);

            this.highlightedUnit = 'meridian';

            if ($element.setSelectionRange) {
                if (this.showSeconds) {
                    setTimeout(function() {
                        $element.setSelectionRange(9,11);
                    }, 0);
                } else {
                    setTimeout(function() {
                        $element.setSelectionRange(6,8);
                    }, 0);
                }
            }
        },

        incrementHour: function() {
            if (this.showMeridian) {
                if (this.hour === 11) {
                    this.hour++;
                    return this.toggleMeridian();
                } else if (this.hour === 12) {
                    this.hour = 0;
                }
            }
            if (this.hour === 23) {
                this.hour = 0;

                return;
            }
            this.hour++;
            this.update();
        },

        incrementMinute: function(step) {
            var newVal;

            if (step) {
                newVal = this.minute + step;
            } else {
                newVal = this.minute + this.minuteStep - (this.minute % this.minuteStep);
            }

            if (newVal > 59) {
                this.incrementHour();
                this.minute = newVal - 60;
            } else {
                this.minute = newVal;
            }
            this.update();
        },

        incrementSecond: function() {
            var newVal = this.second + this.secondStep - (this.second % this.secondStep);

            if (newVal > 59) {
                this.incrementMinute(true);
                this.second = newVal - 60;
            } else {
                this.second = newVal;
            }
            this.update();
        },

        remove: function() {
            $('document').off('.timepicker');
            if (this.$widget) {
                this.$widget.remove();
            }
            delete this.$element.data().timepicker;
        },

        setDefaultTime: function(defaultTime){
            if (!this.$element.val()) {
                if (defaultTime === 'current') {
                    var dTime = new Date(),
                        hours = dTime.getHours(),
                        minutes = Math.floor(dTime.getMinutes() / this.minuteStep) * this.minuteStep,
                        seconds = Math.floor(dTime.getSeconds() / this.secondStep) * this.secondStep,
                        meridian = 'AM';

                    if (this.showMeridian) {
                        if (hours === 0) {
                            hours = 12;
                        } else if (hours >= 12) {
                            if (hours > 12) {
                                hours = hours - 12;
                            }
                            meridian = 'PM';
                        } else {
                            meridian = 'AM';
                        }
                    }

                    this.hour = hours;
                    this.minute = minutes;
                    this.second = seconds;
                    this.meridian = meridian;

                    this.update();

                } else if (defaultTime === false) {
                    this.hour = 0;
                    this.minute = 0;
                    this.second = 0;
                    this.meridian = 'AM';
                } else {
                    this.setTime(defaultTime);
                }
            } else {
                this.updateFromElementVal();
            }
        },

        setTime: function(time) {
            var arr,
                timeArray;

            if (this.showMeridian) {
                arr = time.split(' ');
                timeArray = arr[0].split(':');
                this.meridian = arr[1];
            } else {
                timeArray = time.split(':');
            }

            this.hour = parseInt(timeArray[0], 10);
            this.minute = parseInt(timeArray[1], 10);
            this.second = parseInt(timeArray[2], 10);

            if (isNaN(this.hour)) {
                this.hour = 0;
            }
            if (isNaN(this.minute)) {
                this.minute = 0;
            }

            if (this.showMeridian) {
                if (this.hour > 12) {
                    this.hour = 12;
                } else if (this.hour < 1) {
                    this.hour = 12;
                }

                if (this.meridian === 'am' || this.meridian === 'a') {
                    this.meridian = 'AM';
                } else if (this.meridian === 'pm' || this.meridian === 'p') {
                    this.meridian = 'PM';
                }

                if (this.meridian !== 'AM' && this.meridian !== 'PM') {
                    this.meridian = 'AM';
                }
            } else {
                if (this.hour >= 24) {
                    this.hour = 23;
                } else if (this.hour < 0) {
                    this.hour = 0;
                }
            }

            if (this.minute < 0) {
                this.minute = 0;
            } else if (this.minute >= 60) {
                this.minute = 59;
            }

            if (this.showSeconds) {
                if (isNaN(this.second)) {
                    this.second = 0;
                } else if (this.second < 0) {
                    this.second = 0;
                } else if (this.second >= 60) {
                    this.second = 59;
                }
            }

            this.update();
        },

        showWidget: function() {
            if (this.isOpen) {
                return;
            }

            if (this.$element.is(':disabled')) {
                return;
            }

            var self = this;
            $(document).on('mousedown.timepicker', function (e) {
                // Clicked outside the timepicker, hide it
                if ($(e.target).closest('.bootstrap-timepicker-widget').length === 0) {
                    self.hideWidget();
                }
            });

            this.$element.trigger({
                'type': 'show.timepicker',
                'time': {
                    'value': this.getTime(),
                    'hours': this.hour,
                    'minutes': this.minute,
                    'seconds': this.second,
                    'meridian': this.meridian
                }
            });

            if (this.disableFocus) {
                this.$element.blur();
            }

            this.updateFromElementVal();

            if (this.template === 'modal' && this.$widget.modal) {
                this.$widget.modal('show').on('hidden', $.proxy(this.hideWidget, this));
            } else {
                if (this.isOpen === false) {
                    this.$widget.addClass('open');
                }
            }

            this.isOpen = true;
        },

        toggleMeridian: function() {
            this.meridian = this.meridian === 'AM' ? 'PM' : 'AM';
            this.update();
        },

        update: function() {
            this.$element.trigger({
                'type': 'changeTime.timepicker',
                'time': {
                    'value': this.getTime(),
                    'hours': this.hour,
                    'minutes': this.minute,
                    'seconds': this.second,
                    'meridian': this.meridian
                }
            });

            this.updateElement();
            this.updateWidget();
        },

        updateElement: function() {
            this.$element.val(this.getTime()).change();
        },

        updateFromElementVal: function() {
            var val = this.$element.val();

            if (val) {
                this.setTime(val);
            }
        },

        updateWidget: function() {
            if (this.$widget === false) {
                return;
            }

            var hour = this.hour < 10 ? '0' + this.hour : this.hour,
                minute = this.minute < 10 ? '0' + this.minute : this.minute,
                second = this.second < 10 ? '0' + this.second : this.second;

            if (this.showInputs) {
                this.$widget.find('input.bootstrap-timepicker-hour').val(hour);
                this.$widget.find('input.bootstrap-timepicker-minute').val(minute);

                if (this.showSeconds) {
                    this.$widget.find('input.bootstrap-timepicker-second').val(second);
                }
                if (this.showMeridian) {
                    this.$widget.find('input.bootstrap-timepicker-meridian').val(this.meridian);
                }
            } else {
                this.$widget.find('span.bootstrap-timepicker-hour').text(hour);
                this.$widget.find('span.bootstrap-timepicker-minute').text(minute);

                if (this.showSeconds) {
                    this.$widget.find('span.bootstrap-timepicker-second').text(second);
                }
                if (this.showMeridian) {
                    this.$widget.find('span.bootstrap-timepicker-meridian').text(this.meridian);
                }
            }
        },

        updateFromWidgetInputs: function() {
            if (this.$widget === false) {
                return;
            }
            var time = $('input.bootstrap-timepicker-hour', this.$widget).val() + ':' +
                $('input.bootstrap-timepicker-minute', this.$widget).val() +
                (this.showSeconds ? ':' + $('input.bootstrap-timepicker-second', this.$widget).val() : '') +
                (this.showMeridian ? ' ' + $('input.bootstrap-timepicker-meridian', this.$widget).val() : '');

            this.setTime(time);
        },

        widgetClick: function(e) {
            e.stopPropagation();
            e.preventDefault();

            var action = $(e.target).closest('a').data('action');
            if (action) {
                this[action]();
            }
        },

        widgetKeydown: function(e) {
            var $input = $(e.target).closest('input'),
                name = $input.attr('name');

            switch (e.keyCode) {
                case 9: //tab
                    if (this.showMeridian) {
                        if (name === 'meridian') {
                            return this.hideWidget();
                        }
                    } else {
                        if (this.showSeconds) {
                            if (name === 'second') {
                                return this.hideWidget();
                            }
                        } else {
                            if (name === 'minute') {
                                return this.hideWidget();
                            }
                        }
                    }

                    this.updateFromWidgetInputs();
                    break;
                case 27: // escape
                    this.hideWidget();
                    break;
                case 38: // up arrow
                    e.preventDefault();
                    switch (name) {
                        case 'hour':
                            this.incrementHour();
                            break;
                        case 'minute':
                            this.incrementMinute();
                            break;
                        case 'second':
                            this.incrementSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            break;
                    }
                    break;
                case 40: // down arrow
                    e.preventDefault();
                    switch (name) {
                        case 'hour':
                            this.decrementHour();
                            break;
                        case 'minute':
                            this.decrementMinute();
                            break;
                        case 'second':
                            this.decrementSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            break;
                    }
                    break;
            }
        }
    };


    //TIMEPICKER PLUGIN DEFINITION
    $.fn.timepicker = function(option) {
        var args = Array.apply(null, arguments);
        args.shift();
        return this.each(function() {
            var $this = $(this),
                data = $this.data('timepicker'),
                options = typeof option === 'object' && option;

            if (!data) {
                $this.data('timepicker', (data = new Timepicker(this, $.extend({}, $.fn.timepicker.defaults, options, $(this).data()))));
            }

            if (typeof option === 'string') {
                data[option].apply(data, args);
            }
        });
    };

    $.fn.timepicker.defaults = {
        defaultTime: 'current',
        disableFocus: false,
        isOpen: false,
        minuteStep: 15,
        modalBackdrop: false,
        secondStep: 15,
        showSeconds: false,
        showInputs: true,
        showMeridian: true,
        template: 'dropdown',
        appendWidgetTo: '.bootstrap-timepicker'
    };

    $.fn.timepicker.Constructor = Timepicker;

})(jQuery, window, document);;// Spectrum Colorpicker v1.1.0
// https://github.com/bgrins/spectrum
// Author: Brian Grinstead
// License: MIT

(function (window, $, undefined) {
    var defaultOpts = {

        // Callbacks
        beforeShow: noop,
        move: noop,
        change: noop,
        show: noop,
        hide: noop,

        // Options
        color: false,
        flat: false,
        showInput: false,
        showButtons: true,
        clickoutFiresChange: false,
        showInitial: false,
        showPalette: false,
        showPaletteOnly: false,
        showSelectionPalette: true,
        localStorageKey: false,
        appendTo: "body",
        maxSelectionSize: 7,
        cancelText: "cancel",
        chooseText: "choose",
        preferredFormat: false,
        className: "",
        showAlpha: false,
        theme: "sp-light",
        palette: ['fff', '000'],
        selectionPalette: [],
        disabled: false
    },
    spectrums = [],
    IE = !!/msie/i.exec( window.navigator.userAgent ),
    rgbaSupport = (function() {
        function contains( str, substr ) {
            return !!~('' + str).indexOf(substr);
        }

        var elem = document.createElement('div');
        var style = elem.style;
        style.cssText = 'background-color:rgba(0,0,0,.5)';
        return contains(style.backgroundColor, 'rgba') || contains(style.backgroundColor, 'hsla');
    })(),
    replaceInput = [
        "<div class='sp-replacer'>",
            "<div class='sp-preview'><div class='sp-preview-inner'></div></div>",
            "<div class='sp-dd'>&#9660;</div>",
        "</div>"
    ].join(''),
    markup = (function () {

        // IE does not support gradients with multiple stops, so we need to simulate
        //  that for the rainbow slider with 8 divs that each have a single gradient
        var gradientFix = "";
        if (IE) {
            for (var i = 1; i <= 6; i++) {
                gradientFix += "<div class='sp-" + i + "'></div>";
            }
        }

        return [
            "<div class='sp-container sp-hidden'>",
                "<div class='sp-palette-container'>",
                    "<div class='sp-palette sp-thumb sp-cf'></div>",
                "</div>",
                "<div class='sp-picker-container'>",
                    "<div class='sp-top sp-cf'>",
                        "<div class='sp-fill'></div>",
                        "<div class='sp-top-inner'>",
                            "<div class='sp-color'>",
                                "<div class='sp-sat'>",
                                    "<div class='sp-val'>",
                                        "<div class='sp-dragger'></div>",
                                    "</div>",
                                "</div>",
                            "</div>",
                            "<div class='sp-hue'>",
                                "<div class='sp-slider'></div>",
                                gradientFix,
                            "</div>",
                        "</div>",
                        "<div class='sp-alpha'><div class='sp-alpha-inner'><div class='sp-alpha-handle'></div></div></div>",
                    "</div>",
                    "<div class='sp-input-container sp-cf'>",
                        "<input class='sp-input' type='text' spellcheck='false'  />",
                    "</div>",
                    "<div class='sp-initial sp-thumb sp-cf'></div>",
                    "<div class='sp-button-container sp-cf'>",
                        "<a class='sp-cancel' href='#'></a>",
                        "<button class='sp-choose'></button>",
                    "</div>",
                "</div>",
            "</div>"
        ].join("");
    })();

    function paletteTemplate (p, color, className) {
        var html = [];
        for (var i = 0; i < p.length; i++) {
            var tiny = tinycolor(p[i]);
            var c = tiny.toHsl().l < 0.5 ? "sp-thumb-el sp-thumb-dark" : "sp-thumb-el sp-thumb-light";
            c += (tinycolor.equals(color, p[i])) ? " sp-thumb-active" : "";

            var swatchStyle = rgbaSupport ? ("background-color:" + tiny.toRgbString()) : "filter:" + tiny.toFilter();
            html.push('<span title="' + tiny.toRgbString() + '" data-color="' + tiny.toRgbString() + '" class="' + c + '"><span class="sp-thumb-inner" style="' + swatchStyle + ';" /></span>');
        }
        return "<div class='sp-cf " + className + "'>" + html.join('') + "</div>";
    }

    function hideAll() {
        for (var i = 0; i < spectrums.length; i++) {
            if (spectrums[i]) {
                spectrums[i].hide();
            }
        }
    }

    function instanceOptions(o, callbackContext) {
        var opts = $.extend({}, defaultOpts, o);
        opts.callbacks = {
            'move': bind(opts.move, callbackContext),
            'change': bind(opts.change, callbackContext),
            'show': bind(opts.show, callbackContext),
            'hide': bind(opts.hide, callbackContext),
            'beforeShow': bind(opts.beforeShow, callbackContext)
        };

        return opts;
    }

    function spectrum(element, o) {

        var opts = instanceOptions(o, element),
            flat = opts.flat,
            showSelectionPalette = opts.showSelectionPalette,
            localStorageKey = opts.localStorageKey,
            theme = opts.theme,
            callbacks = opts.callbacks,
            resize = throttle(reflow, 10),
            visible = false,
            dragWidth = 0,
            dragHeight = 0,
            dragHelperHeight = 0,
            slideHeight = 0,
            slideWidth = 0,
            alphaWidth = 0,
            alphaSlideHelperWidth = 0,
            slideHelperHeight = 0,
            currentHue = 0,
            currentSaturation = 0,
            currentValue = 0,
            currentAlpha = 1,
            palette = opts.palette.slice(0),
            paletteArray = $.isArray(palette[0]) ? palette : [palette],
            selectionPalette = opts.selectionPalette.slice(0),
            maxSelectionSize = opts.maxSelectionSize,
            draggingClass = "sp-dragging";

        var doc = element.ownerDocument,
            body = doc.body,
            boundElement = $(element),
            disabled = false,
            container = $(markup, doc).addClass(theme),
            dragger = container.find(".sp-color"),
            dragHelper = container.find(".sp-dragger"),
            slider = container.find(".sp-hue"),
            slideHelper = container.find(".sp-slider"),
            alphaSliderInner = container.find(".sp-alpha-inner"),
            alphaSlider = container.find(".sp-alpha"),
            alphaSlideHelper = container.find(".sp-alpha-handle"),
            textInput = container.find(".sp-input"),
            paletteContainer = container.find(".sp-palette"),
            initialColorContainer = container.find(".sp-initial"),
            cancelButton = container.find(".sp-cancel"),
            chooseButton = container.find(".sp-choose"),
            isInput = boundElement.is("input"),
            shouldReplace = isInput && !flat,
            replacer = (shouldReplace) ? $(replaceInput).addClass(theme).addClass(opts.className) : $([]),
            offsetElement = (shouldReplace) ? replacer : boundElement,
            previewElement = replacer.find(".sp-preview-inner"),
            initialColor = opts.color || (isInput && boundElement.val()),
            colorOnShow = false,
            preferredFormat = opts.preferredFormat,
            currentPreferredFormat = preferredFormat,
            clickoutFiresChange = !opts.showButtons || opts.clickoutFiresChange;


        function applyOptions() {

            container.toggleClass("sp-flat", flat);
            container.toggleClass("sp-input-disabled", !opts.showInput);
            container.toggleClass("sp-alpha-enabled", opts.showAlpha);
            container.toggleClass("sp-buttons-disabled", !opts.showButtons || flat);
            container.toggleClass("sp-palette-disabled", !opts.showPalette);
            container.toggleClass("sp-palette-only", opts.showPaletteOnly);
            container.toggleClass("sp-initial-disabled", !opts.showInitial);
            container.addClass(opts.className);

            reflow();
        }

        function initialize() {

            if (IE) {
                container.find("*:not(input)").attr("unselectable", "on");
            }

            applyOptions();

            if (shouldReplace) {
                boundElement.after(replacer).hide();
            }

            if (flat) {
                boundElement.after(container).hide();
            }
            else {

                var appendTo = opts.appendTo === "parent" ? boundElement.parent() : $(opts.appendTo);
                if (appendTo.length !== 1) {
                    appendTo = $("body");
                }

                appendTo.append(container);
            }

            if (localStorageKey && window.localStorage) {

                // Migrate old palettes over to new format.  May want to remove this eventually.
                try {
                    var oldPalette = window.localStorage[localStorageKey].split(",#");
                    if (oldPalette.length > 1) {
                        delete window.localStorage[localStorageKey];
                        $.each(oldPalette, function(i, c) {
                             addColorToSelectionPalette(c);
                        });
                    }
                }
                catch(e) { }

                try {
                    selectionPalette = window.localStorage[localStorageKey].split(";");
                }
                catch (e) { }
            }

            offsetElement.bind("click.spectrum touchstart.spectrum", function (e) {
                if (!disabled) {
                    toggle();
                }

                e.stopPropagation();

                if (!$(e.target).is("input")) {
                    e.preventDefault();
                }
            });

            if(boundElement.is(":disabled") || (opts.disabled === true)) {
                disable();
            }

            // Prevent clicks from bubbling up to document.  This would cause it to be hidden.
            container.click(stopPropagation);

            // Handle user typed input
            textInput.change(setFromTextInput);
            textInput.bind("paste", function () {
                setTimeout(setFromTextInput, 1);
            });
            textInput.keydown(function (e) { if (e.keyCode == 13) { setFromTextInput(); } });

            cancelButton.text(opts.cancelText);
            cancelButton.bind("click.spectrum", function (e) {
                e.stopPropagation();
                e.preventDefault();
                hide("cancel");
            });

            chooseButton.text(opts.chooseText);
            chooseButton.bind("click.spectrum", function (e) {
                e.stopPropagation();
                e.preventDefault();

                if (isValid()) {
                    updateOriginalInput(true);
                    hide();
                }
            });

            draggable(alphaSlider, function (dragX, dragY, e) {
                currentAlpha = (dragX / alphaWidth);
                if (e.shiftKey) {
                    currentAlpha = Math.round(currentAlpha * 10) / 10;
                }

                move();
            });

            draggable(slider, function (dragX, dragY) {
                currentHue = parseFloat(dragY / slideHeight);
                move();
            }, dragStart, dragStop);

            draggable(dragger, function (dragX, dragY) {
                currentSaturation = parseFloat(dragX / dragWidth);
                currentValue = parseFloat((dragHeight - dragY) / dragHeight);
                move();
            }, dragStart, dragStop);

            if (!!initialColor) {
                set(initialColor);

                // In case color was black - update the preview UI and set the format
                // since the set function will not run (default color is black).
                updateUI();
                currentPreferredFormat = preferredFormat || tinycolor(initialColor).format;

                addColorToSelectionPalette(initialColor);
            }
            else {
                updateUI();
            }

            if (flat) {
                show();
            }

            function palletElementClick(e) {
                if (e.data && e.data.ignore) {
                    set($(this).data("color"));
                    move();
                }
                else {
                    set($(this).data("color"));
                    updateOriginalInput(true);
                    move();
                    hide();
                }

                return false;
            }

            var paletteEvent = IE ? "mousedown.spectrum" : "click.spectrum touchstart.spectrum";
            paletteContainer.delegate(".sp-thumb-el", paletteEvent, palletElementClick);
            initialColorContainer.delegate(".sp-thumb-el:nth-child(1)", paletteEvent, { ignore: true }, palletElementClick);
        }

        function addColorToSelectionPalette(color) {
            if (showSelectionPalette) {
                var colorRgb = tinycolor(color).toRgbString();
                if ($.inArray(colorRgb, selectionPalette) === -1) {
                    selectionPalette.push(colorRgb);
                    while(selectionPalette.length > maxSelectionSize) {
                        selectionPalette.shift();
                    }
                }

                if (localStorageKey && window.localStorage) {
                    try {
                        window.localStorage[localStorageKey] = selectionPalette.join(";");
                    }
                    catch(e) { }
                }
            }
        }

        function getUniqueSelectionPalette() {
            var unique = [];
            var p = selectionPalette;
            var paletteLookup = {};
            var rgb;

            if (opts.showPalette) {

                for (var i = 0; i < paletteArray.length; i++) {
                    for (var j = 0; j < paletteArray[i].length; j++) {
                        rgb = tinycolor(paletteArray[i][j]).toRgbString();
                        paletteLookup[rgb] = true;
                    }
                }

                for (i = 0; i < p.length; i++) {
                    rgb = tinycolor(p[i]).toRgbString();

                    if (!paletteLookup.hasOwnProperty(rgb)) {
                        unique.push(p[i]);
                        paletteLookup[rgb] = true;
                    }
                }
            }

            return unique.reverse().slice(0, opts.maxSelectionSize);
        }

        function drawPalette() {

            var currentColor = get();

            var html = $.map(paletteArray, function (palette, i) {
                return paletteTemplate(palette, currentColor, "sp-palette-row sp-palette-row-" + i);
            });

            if (selectionPalette) {
                html.push(paletteTemplate(getUniqueSelectionPalette(), currentColor, "sp-palette-row sp-palette-row-selection"));
            }

            paletteContainer.html(html.join(""));
        }

        function drawInitial() {
            if (opts.showInitial) {
                var initial = colorOnShow;
                var current = get();
                initialColorContainer.html(paletteTemplate([initial, current], current, "sp-palette-row-initial"));
            }
        }

        function dragStart() {
            if (dragHeight <= 0 || dragWidth <= 0 || slideHeight <= 0) {
                reflow();
            }
            container.addClass(draggingClass);
        }

        function dragStop() {
            container.removeClass(draggingClass);
        }

        function setFromTextInput() {
            var tiny = tinycolor(textInput.val());
            if (tiny.ok) {
                set(tiny);
            }
            else {
                textInput.addClass("sp-validation-error");
            }
        }

        function toggle() {
            if (visible) {
                hide();
            }
            else {
                show();
            }
        }

        function show() {
            var event = $.Event('beforeShow.spectrum');

            if (visible) {
                reflow();
                return;
            }

            boundElement.trigger(event, [ get() ]);

            if (callbacks.beforeShow(get()) === false || event.isDefaultPrevented()) {
                return;
            }

            hideAll();
            visible = true;

            $(doc).bind("click.spectrum", hide);
            $(window).bind("resize.spectrum", resize);
            replacer.addClass("sp-active");
            container.removeClass("sp-hidden");

            if (opts.showPalette) {
                drawPalette();
            }
            reflow();
            updateUI();

            colorOnShow = get();

            drawInitial();
            callbacks.show(colorOnShow);
            boundElement.trigger('show.spectrum', [ colorOnShow ]);
        }

        function hide(e) {

            // Return on right click
            if (e && e.type == "click" && e.button == 2) { return; }

            // Return if hiding is unnecessary
            if (!visible || flat) { return; }
            visible = false;

            $(doc).unbind("click.spectrum", hide);
            $(window).unbind("resize.spectrum", resize);

            replacer.removeClass("sp-active");
            container.addClass("sp-hidden");

            var colorHasChanged = !tinycolor.equals(get(), colorOnShow);

            if (colorHasChanged) {
                if (clickoutFiresChange && e !== "cancel") {
                    updateOriginalInput(true);
                }
                else {
                    revert();
                }
            }

            callbacks.hide(get());
            boundElement.trigger('hide.spectrum', [ get() ]);
        }

        function revert() {
            set(colorOnShow, true);
        }

        function set(color, ignoreFormatChange) {
            if (tinycolor.equals(color, get())) {
                return;
            }

            var newColor = tinycolor(color);
            var newHsv = newColor.toHsv();

            currentHue = newHsv.h;
            currentSaturation = newHsv.s;
            currentValue = newHsv.v;
            currentAlpha = newHsv.a;

            updateUI();

            if (newColor.ok && !ignoreFormatChange) {
                currentPreferredFormat = preferredFormat || newColor.format;
            }
        }

        function get(opts) {
            opts = opts || { };
            return tinycolor.fromRatio({
                h: currentHue,
                s: currentSaturation,
                v: currentValue,
                a: Math.round(currentAlpha * 100) / 100
            }, { format: opts.format || currentPreferredFormat });
        }

        function isValid() {
            return !textInput.hasClass("sp-validation-error");
        }

        function move() {
            updateUI();

            callbacks.move(get());
            boundElement.trigger('move.spectrum', [ get() ]);
        }

        function updateUI() {

            textInput.removeClass("sp-validation-error");

            updateHelperLocations();

            // Update dragger background color (gradients take care of saturation and value).
            var flatColor = tinycolor.fromRatio({ h: currentHue, s: 1, v: 1 });
            dragger.css("background-color", flatColor.toHexString());

            // Get a format that alpha will be included in (hex and names ignore alpha)
            var format = currentPreferredFormat;
            if (currentAlpha < 1) {
                if (format === "hex" || format === "hex3" || format === "hex6" || format === "name") {
                    format = "rgb";
                }
            }

            var realColor = get({ format: format }),
                realHex = realColor.toHexString(),
                realRgb = realColor.toRgbString();

            // Update the replaced elements background color (with actual selected color)
            if (rgbaSupport || realColor.alpha === 1) {
                previewElement.css("background-color", realRgb);
            }
            else {
                previewElement.css("background-color", "transparent");
                previewElement.css("filter", realColor.toFilter());
            }

            if (opts.showAlpha) {
                var rgb = realColor.toRgb();
                rgb.a = 0;
                var realAlpha = tinycolor(rgb).toRgbString();
                var gradient = "linear-gradient(left, " + realAlpha + ", " + realHex + ")";

                if (IE) {
                    alphaSliderInner.css("filter", tinycolor(realAlpha).toFilter({ gradientType: 1 }, realHex));
                }
                else {
                    alphaSliderInner.css("background", "-webkit-" + gradient);
                    alphaSliderInner.css("background", "-moz-" + gradient);
                    alphaSliderInner.css("background", "-ms-" + gradient);
                    alphaSliderInner.css("background", gradient);
                }
            }


            // Update the text entry input as it changes happen
            if (opts.showInput) {
                textInput.val(realColor.toString(format));
            }

            if (opts.showPalette) {
                drawPalette();
            }

            drawInitial();
        }

        function updateHelperLocations() {
            var s = currentSaturation;
            var v = currentValue;

            // Where to show the little circle in that displays your current selected color
            var dragX = s * dragWidth;
            var dragY = dragHeight - (v * dragHeight);
            dragX = Math.max(
                -dragHelperHeight,
                Math.min(dragWidth - dragHelperHeight, dragX - dragHelperHeight)
            );
            dragY = Math.max(
                -dragHelperHeight,
                Math.min(dragHeight - dragHelperHeight, dragY - dragHelperHeight)
            );
            dragHelper.css({
                "top": dragY,
                "left": dragX
            });

            var alphaX = currentAlpha * alphaWidth;
            alphaSlideHelper.css({
                "left": alphaX - (alphaSlideHelperWidth / 2)
            });

            // Where to show the bar that displays your current selected hue
            var slideY = (currentHue) * slideHeight;
            slideHelper.css({
                "top": slideY - slideHelperHeight
            });
        }

        function updateOriginalInput(fireCallback) {
            var color = get();

            if (isInput) {
                boundElement.val(color.toString(currentPreferredFormat)).change();
            }

            var hasChanged = !tinycolor.equals(color, colorOnShow);
            colorOnShow = color;

            // Update the selection palette with the current color
            addColorToSelectionPalette(color);
            if (fireCallback && hasChanged) {
                callbacks.change(color);
                boundElement.trigger('change.spectrum', [ color ]);
            }
        }

        function reflow() {
            dragWidth = dragger.width();
            dragHeight = dragger.height();
            dragHelperHeight = dragHelper.height();
            slideWidth = slider.width();
            slideHeight = slider.height();
            slideHelperHeight = slideHelper.height();
            alphaWidth = alphaSlider.width();
            alphaSlideHelperWidth = alphaSlideHelper.width();

            if (!flat) {
                container.css("position", "absolute");
                container.offset(getOffset(container, offsetElement));
            }

            updateHelperLocations();
        }

        function destroy() {
            boundElement.show();
            offsetElement.unbind("click.spectrum touchstart.spectrum");
            container.remove();
            replacer.remove();
            spectrums[spect.id] = null;
        }

        function option(optionName, optionValue) {
            if (optionName === undefined) {
                return $.extend({}, opts);
            }
            if (optionValue === undefined) {
                return opts[optionName];
            }

            opts[optionName] = optionValue;
            applyOptions();
        }

        function enable() {
            disabled = false;
            boundElement.attr("disabled", false);
            offsetElement.removeClass("sp-disabled");
        }

        function disable() {
            hide();
            disabled = true;
            boundElement.attr("disabled", true);
            offsetElement.addClass("sp-disabled");
        }

        initialize();

        var spect = {
            show: show,
            hide: hide,
            toggle: toggle,
            reflow: reflow,
            option: option,
            enable: enable,
            disable: disable,
            set: function (c) {
                set(c);
                updateOriginalInput();
            },
            get: get,
            destroy: destroy,
            container: container
        };

        spect.id = spectrums.push(spect) - 1;

        return spect;
    }

    /**
    * checkOffset - get the offset below/above and left/right element depending on screen position
    * Thanks https://github.com/jquery/jquery-ui/blob/master/ui/jquery.ui.datepicker.js
    */
    function getOffset(picker, input) {
        var extraY = 0;
        var dpWidth = picker.outerWidth();
        var dpHeight = picker.outerHeight();
        var inputHeight = input.outerHeight();
        var doc = picker[0].ownerDocument;
        var docElem = doc.documentElement;
        var viewWidth = docElem.clientWidth + $(doc).scrollLeft();
        var viewHeight = docElem.clientHeight + $(doc).scrollTop();
        var offset = input.offset();
        offset.top += inputHeight;

        offset.left -=
            Math.min(offset.left, (offset.left + dpWidth > viewWidth && viewWidth > dpWidth) ?
            Math.abs(offset.left + dpWidth - viewWidth) : 0);

        offset.top -=
            Math.min(offset.top, ((offset.top + dpHeight > viewHeight && viewHeight > dpHeight) ?
            Math.abs(dpHeight + inputHeight - extraY) : extraY));

        return offset;
    }

    /**
    * noop - do nothing
    */
    function noop() {

    }

    /**
    * stopPropagation - makes the code only doing this a little easier to read in line
    */
    function stopPropagation(e) {
        e.stopPropagation();
    }

    /**
    * Create a function bound to a given object
    * Thanks to underscore.js
    */
    function bind(func, obj) {
        var slice = Array.prototype.slice;
        var args = slice.call(arguments, 2);
        return function () {
            return func.apply(obj, args.concat(slice.call(arguments)));
        };
    }

    /**
    * Lightweight drag helper.  Handles containment within the element, so that
    * when dragging, the x is within [0,element.width] and y is within [0,element.height]
    */
    function draggable(element, onmove, onstart, onstop) {
        onmove = onmove || function () { };
        onstart = onstart || function () { };
        onstop = onstop || function () { };
        var doc = element.ownerDocument || document;
        var dragging = false;
        var offset = {};
        var maxHeight = 0;
        var maxWidth = 0;
        var hasTouch = ('ontouchstart' in window);

        var duringDragEvents = {};
        duringDragEvents["selectstart"] = prevent;
        duringDragEvents["dragstart"] = prevent;
        duringDragEvents[(hasTouch ? "touchmove" : "mousemove")] = move;
        duringDragEvents[(hasTouch ? "touchend" : "mouseup")] = stop;

        function prevent(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.returnValue = false;
        }

        function move(e) {
            if (dragging) {
                // Mouseup happened outside of window
                if (IE && document.documentMode < 9 && !e.button) {
                    return stop();
                }

                var touches = e.originalEvent.touches;
                var pageX = touches ? touches[0].pageX : e.pageX;
                var pageY = touches ? touches[0].pageY : e.pageY;

                var dragX = Math.max(0, Math.min(pageX - offset.left, maxWidth));
                var dragY = Math.max(0, Math.min(pageY - offset.top, maxHeight));

                if (hasTouch) {
                    // Stop scrolling in iOS
                    prevent(e);
                }

                onmove.apply(element, [dragX, dragY, e]);
            }
        }
        function start(e) {
            var rightclick = (e.which) ? (e.which == 3) : (e.button == 2);
            var touches = e.originalEvent.touches;

            if (!rightclick && !dragging) {
                if (onstart.apply(element, arguments) !== false) {
                    dragging = true;
                    maxHeight = $(element).height();
                    maxWidth = $(element).width();
                    offset = $(element).offset();

                    $(doc).bind(duringDragEvents);
                    $(doc.body).addClass("sp-dragging");

                    if (!hasTouch) {
                        move(e);
                    }

                    prevent(e);
                }
            }
        }
        function stop() {
            if (dragging) {
                $(doc).unbind(duringDragEvents);
                $(doc.body).removeClass("sp-dragging");
                onstop.apply(element, arguments);
            }
            dragging = false;
        }

        $(element).bind(hasTouch ? "touchstart" : "mousedown", start);
    }

    function throttle(func, wait, debounce) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var throttler = function () {
                timeout = null;
                func.apply(context, args);
            };
            if (debounce) clearTimeout(timeout);
            if (debounce || !timeout) timeout = setTimeout(throttler, wait);
        };
    }


    /**
    * Define a jQuery plugin
    */
    var dataID = "spectrum.id";
    $.fn.spectrum = function (opts, extra) {

        if (typeof opts == "string") {

            var returnValue = this;
            var args = Array.prototype.slice.call( arguments, 1 );

            this.each(function () {
                var spect = spectrums[$(this).data(dataID)];
                if (spect) {

                    var method = spect[opts];
                    if (!method) {
                        throw new Error( "Spectrum: no such method: '" + opts + "'" );
                    }

                    if (opts == "get") {
                        returnValue = spect.get();
                    }
                    else if (opts == "container") {
                        returnValue = spect.container;
                    }
                    else if (opts == "option") {
                        returnValue = spect.option.apply(spect, args);
                    }
                    else if (opts == "destroy") {
                        spect.destroy();
                        $(this).removeData(dataID);
                    }
                    else {
                        method.apply(spect, args);
                    }
                }
            });

            return returnValue;
        }

        // Initializing a new instance of spectrum
        return this.spectrum("destroy").each(function () {
            var spect = spectrum(this, opts);
            $(this).data(dataID, spect.id);
        });
    };

    $.fn.spectrum.load = true;
    $.fn.spectrum.loadOpts = {};
    $.fn.spectrum.draggable = draggable;
    $.fn.spectrum.defaults = defaultOpts;

    $.spectrum = { };
    $.spectrum.localization = { };
    $.spectrum.palettes = { };

    $.fn.spectrum.processNativeColorInputs = function () {
        var colorInput = $("<input type='color' value='!' />")[0];
        var supportsColor = colorInput.type === "color" && colorInput.value != "!";

        if (!supportsColor) {
            $("input[type=color]").spectrum({
                preferredFormat: "hex6"
            });
        }
    };
    // TinyColor v0.9.14
    // https://github.com/bgrins/TinyColor
    // 2013-02-24, Brian Grinstead, MIT License

    (function(root) {

        var trimLeft = /^[\s,#]+/,
            trimRight = /\s+$/,
            tinyCounter = 0,
            math = Math,
            mathRound = math.round,
            mathMin = math.min,
            mathMax = math.max,
            mathRandom = math.random;

        function tinycolor (color, opts) {

            color = (color) ? color : '';
            opts = opts || { };

            // If input is already a tinycolor, return itself
            if (typeof color == "object" && color.hasOwnProperty("_tc_id")) {
               return color;
            }
            var rgb = inputToRGB(color);
            var r = rgb.r,
                g = rgb.g,
                b = rgb.b,
                a = rgb.a,
                roundA = mathRound(100*a) / 100,
                format = opts.format || rgb.format;

            // Don't let the range of [0,255] come back in [0,1].
            // Potentially lose a little bit of precision here, but will fix issues where
            // .5 gets interpreted as half of the total, instead of half of 1
            // If it was supposed to be 128, this was already taken care of by `inputToRgb`
            if (r < 1) { r = mathRound(r); }
            if (g < 1) { g = mathRound(g); }
            if (b < 1) { b = mathRound(b); }

            return {
                ok: rgb.ok,
                format: format,
                _tc_id: tinyCounter++,
                alpha: a,
                toHsv: function() {
                    var hsv = rgbToHsv(r, g, b);
                    return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: a };
                },
                toHsvString: function() {
                    var hsv = rgbToHsv(r, g, b);
                    var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
                    return (a == 1) ?
                      "hsv("  + h + ", " + s + "%, " + v + "%)" :
                      "hsva(" + h + ", " + s + "%, " + v + "%, "+ roundA + ")";
                },
                toHsl: function() {
                    var hsl = rgbToHsl(r, g, b);
                    return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: a };
                },
                toHslString: function() {
                    var hsl = rgbToHsl(r, g, b);
                    var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
                    return (a == 1) ?
                      "hsl("  + h + ", " + s + "%, " + l + "%)" :
                      "hsla(" + h + ", " + s + "%, " + l + "%, "+ roundA + ")";
                },
                toHex: function(allow3Char) {
                    return rgbToHex(r, g, b, allow3Char);
                },
                toHexString: function(allow3Char) {
                    return '#' + rgbToHex(r, g, b, allow3Char);
                },
                toRgb: function() {
                    return { r: mathRound(r), g: mathRound(g), b: mathRound(b), a: a };
                },
                toRgbString: function() {
                    return (a == 1) ?
                      "rgb("  + mathRound(r) + ", " + mathRound(g) + ", " + mathRound(b) + ")" :
                      "rgba(" + mathRound(r) + ", " + mathRound(g) + ", " + mathRound(b) + ", " + roundA + ")";
                },
                toPercentageRgb: function() {
                    return { r: mathRound(bound01(r, 255) * 100) + "%", g: mathRound(bound01(g, 255) * 100) + "%", b: mathRound(bound01(b, 255) * 100) + "%", a: a };
                },
                toPercentageRgbString: function() {
                    return (a == 1) ?
                      "rgb("  + mathRound(bound01(r, 255) * 100) + "%, " + mathRound(bound01(g, 255) * 100) + "%, " + mathRound(bound01(b, 255) * 100) + "%)" :
                      "rgba(" + mathRound(bound01(r, 255) * 100) + "%, " + mathRound(bound01(g, 255) * 100) + "%, " + mathRound(bound01(b, 255) * 100) + "%, " + roundA + ")";
                },
                toName: function() {
                    return hexNames[rgbToHex(r, g, b, true)] || false;
                },
                toFilter: function(secondColor) {
                    var hex = rgbToHex(r, g, b);
                    var secondHex = hex;
                    var alphaHex = Math.round(parseFloat(a) * 255).toString(16);
                    var secondAlphaHex = alphaHex;
                    var gradientType = opts && opts.gradientType ? "GradientType = 1, " : "";

                    if (secondColor) {
                        var s = tinycolor(secondColor);
                        secondHex = s.toHex();
                        secondAlphaHex = Math.round(parseFloat(s.alpha) * 255).toString(16);
                    }

                    return "progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr=#" + pad2(alphaHex) + hex + ",endColorstr=#" + pad2(secondAlphaHex) + secondHex + ")";
                },
                toString: function(format) {
                    format = format || this.format;
                    var formattedString = false;
                    if (format === "rgb") {
                        formattedString = this.toRgbString();
                    }
                    if (format === "prgb") {
                        formattedString = this.toPercentageRgbString();
                    }
                    if (format === "hex" || format === "hex6") {
                        formattedString = this.toHexString();
                    }
                    if (format === "hex3") {
                        formattedString = this.toHexString(true);
                    }
                    if (format === "name") {
                        formattedString = this.toName();
                    }
                    if (format === "hsl") {
                        formattedString = this.toHslString();
                    }
                    if (format === "hsv") {
                        formattedString = this.toHsvString();
                    }

                    return formattedString || this.toHexString();
                }
            };
        }

        // If input is an object, force 1 into "1.0" to handle ratios properly
        // String input requires "1.0" as input, so 1 will be treated as 1
        tinycolor.fromRatio = function(color, opts) {
            if (typeof color == "object") {
                var newColor = {};
                for (var i in color) {
                    if (color.hasOwnProperty(i)) {
                        if (i === "a") {
                            newColor[i] = color[i];
                        }
                        else {
                            newColor[i] = convertToPercentage(color[i]);
                        }
                    }
                }
                color = newColor;
            }

            return tinycolor(color, opts);
        };

        // Given a string or object, convert that input to RGB
        // Possible string inputs:
        //
        //     "red"
        //     "#f00" or "f00"
        //     "#ff0000" or "ff0000"
        //     "rgb 255 0 0" or "rgb (255, 0, 0)"
        //     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
        //     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
        //     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
        //     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
        //     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
        //     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
        //
        function inputToRGB(color) {

            var rgb = { r: 0, g: 0, b: 0 };
            var a = 1;
            var ok = false;
            var format = false;

            if (typeof color == "string") {
                color = stringInputToObject(color);
            }

            if (typeof color == "object") {
                if (color.hasOwnProperty("r") && color.hasOwnProperty("g") && color.hasOwnProperty("b")) {
                    rgb = rgbToRgb(color.r, color.g, color.b);
                    ok = true;
                    format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
                }
                else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("v")) {
                    color.s = convertToPercentage(color.s);
                    color.v = convertToPercentage(color.v);
                    rgb = hsvToRgb(color.h, color.s, color.v);
                    ok = true;
                    format = "hsv";
                }
                else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("l")) {
                    color.s = convertToPercentage(color.s);
                    color.l = convertToPercentage(color.l);
                    rgb = hslToRgb(color.h, color.s, color.l);
                    ok = true;
                    format = "hsl";
                }

                if (color.hasOwnProperty("a")) {
                    a = color.a;
                }
            }

            a = parseFloat(a);

            // Handle invalid alpha characters by setting to 1
            if (isNaN(a) || a < 0 || a > 1) {
                a = 1;
            }

            return {
                ok: ok,
                format: color.format || format,
                r: mathMin(255, mathMax(rgb.r, 0)),
                g: mathMin(255, mathMax(rgb.g, 0)),
                b: mathMin(255, mathMax(rgb.b, 0)),
                a: a
            };
        }



        // Conversion Functions
        // --------------------

        // `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
        // <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

        // `rgbToRgb`
        // Handle bounds / percentage checking to conform to CSS color spec
        // <http://www.w3.org/TR/css3-color/>
        // *Assumes:* r, g, b in [0, 255] or [0, 1]
        // *Returns:* { r, g, b } in [0, 255]
        function rgbToRgb(r, g, b){
            return {
                r: bound01(r, 255) * 255,
                g: bound01(g, 255) * 255,
                b: bound01(b, 255) * 255
            };
        }

        // `rgbToHsl`
        // Converts an RGB color value to HSL.
        // *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
        // *Returns:* { h, s, l } in [0,1]
        function rgbToHsl(r, g, b) {

            r = bound01(r, 255);
            g = bound01(g, 255);
            b = bound01(b, 255);

            var max = mathMax(r, g, b), min = mathMin(r, g, b);
            var h, s, l = (max + min) / 2;

            if(max == min) {
                h = s = 0; // achromatic
            }
            else {
                var d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch(max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }

                h /= 6;
            }

            return { h: h, s: s, l: l };
        }

        // `hslToRgb`
        // Converts an HSL color value to RGB.
        // *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
        // *Returns:* { r, g, b } in the set [0, 255]
        function hslToRgb(h, s, l) {
            var r, g, b;

            h = bound01(h, 360);
            s = bound01(s, 100);
            l = bound01(l, 100);

            function hue2rgb(p, q, t) {
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }

            if(s === 0) {
                r = g = b = l; // achromatic
            }
            else {
                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            return { r: r * 255, g: g * 255, b: b * 255 };
        }

        // `rgbToHsv`
        // Converts an RGB color value to HSV
        // *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
        // *Returns:* { h, s, v } in [0,1]
        function rgbToHsv(r, g, b) {

            r = bound01(r, 255);
            g = bound01(g, 255);
            b = bound01(b, 255);

            var max = mathMax(r, g, b), min = mathMin(r, g, b);
            var h, s, v = max;

            var d = max - min;
            s = max === 0 ? 0 : d / max;

            if(max == min) {
                h = 0; // achromatic
            }
            else {
                switch(max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return { h: h, s: s, v: v };
        }

        // `hsvToRgb`
        // Converts an HSV color value to RGB.
        // *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
        // *Returns:* { r, g, b } in the set [0, 255]
         function hsvToRgb(h, s, v) {

            h = bound01(h, 360) * 6;
            s = bound01(s, 100);
            v = bound01(v, 100);

            var i = math.floor(h),
                f = h - i,
                p = v * (1 - s),
                q = v * (1 - f * s),
                t = v * (1 - (1 - f) * s),
                mod = i % 6,
                r = [v, q, p, p, t, v][mod],
                g = [t, v, v, q, p, p][mod],
                b = [p, p, t, v, v, q][mod];

            return { r: r * 255, g: g * 255, b: b * 255 };
        }

        // `rgbToHex`
        // Converts an RGB color to hex
        // Assumes r, g, and b are contained in the set [0, 255]
        // Returns a 3 or 6 character hex
        function rgbToHex(r, g, b, allow3Char) {

            var hex = [
                pad2(mathRound(r).toString(16)),
                pad2(mathRound(g).toString(16)),
                pad2(mathRound(b).toString(16))
            ];

            // Return a 3 character hex if possible
            if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
                return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
            }

            return hex.join("");
        }

        // `equals`
        // Can be called with any tinycolor input
        tinycolor.equals = function (color1, color2) {
            if (!color1 || !color2) { return false; }
            return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
        };
        tinycolor.random = function() {
            return tinycolor.fromRatio({
                r: mathRandom(),
                g: mathRandom(),
                b: mathRandom()
            });
        };


        // Modification Functions
        // ----------------------
        // Thanks to less.js for some of the basics here
        // <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>


        tinycolor.desaturate = function (color, amount) {
            var hsl = tinycolor(color).toHsl();
            hsl.s -= ((amount || 10) / 100);
            hsl.s = clamp01(hsl.s);
            return tinycolor(hsl);
        };
        tinycolor.saturate = function (color, amount) {
            var hsl = tinycolor(color).toHsl();
            hsl.s += ((amount || 10) / 100);
            hsl.s = clamp01(hsl.s);
            return tinycolor(hsl);
        };
        tinycolor.greyscale = function(color) {
            return tinycolor.desaturate(color, 100);
        };
        tinycolor.lighten = function(color, amount) {
            var hsl = tinycolor(color).toHsl();
            hsl.l += ((amount || 10) / 100);
            hsl.l = clamp01(hsl.l);
            return tinycolor(hsl);
        };
        tinycolor.darken = function (color, amount) {
            var hsl = tinycolor(color).toHsl();
            hsl.l -= ((amount || 10) / 100);
            hsl.l = clamp01(hsl.l);
            return tinycolor(hsl);
        };
        tinycolor.complement = function(color) {
            var hsl = tinycolor(color).toHsl();
            hsl.h = (hsl.h + 180) % 360;
            return tinycolor(hsl);
        };


        // Combination Functions
        // ---------------------
        // Thanks to jQuery xColor for some of the ideas behind these
        // <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

        tinycolor.triad = function(color) {
            var hsl = tinycolor(color).toHsl();
            var h = hsl.h;
            return [
                tinycolor(color),
                tinycolor({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
                tinycolor({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
            ];
        };
        tinycolor.tetrad = function(color) {
            var hsl = tinycolor(color).toHsl();
            var h = hsl.h;
            return [
                tinycolor(color),
                tinycolor({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
                tinycolor({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
                tinycolor({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
            ];
        };
        tinycolor.splitcomplement = function(color) {
            var hsl = tinycolor(color).toHsl();
            var h = hsl.h;
            return [
                tinycolor(color),
                tinycolor({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
                tinycolor({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
            ];
        };
        tinycolor.analogous = function(color, results, slices) {
            results = results || 6;
            slices = slices || 30;

            var hsl = tinycolor(color).toHsl();
            var part = 360 / slices;
            var ret = [tinycolor(color)];

            for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
                hsl.h = (hsl.h + part) % 360;
                ret.push(tinycolor(hsl));
            }
            return ret;
        };
        tinycolor.monochromatic = function(color, results) {
            results = results || 6;
            var hsv = tinycolor(color).toHsv();
            var h = hsv.h, s = hsv.s, v = hsv.v;
            var ret = [];
            var modification = 1 / results;

            while (results--) {
                ret.push(tinycolor({ h: h, s: s, v: v}));
                v = (v + modification) % 1;
            }

            return ret;
        };

        // Readability Functions
        // ---------------------
        // <http://www.w3.org/TR/AERT#color-contrast>

        // `readability`
        // Analyze the 2 colors and returns an object with the following properties:
        //    `brightness`: difference in brightness between the two colors
        //    `color`: difference in color/hue between the two colors
        tinycolor.readability = function(color1, color2) {
            var a = tinycolor(color1).toRgb();
            var b = tinycolor(color2).toRgb();
            var brightnessA = (a.r * 299 + a.g * 587 + a.b * 114) / 1000;
            var brightnessB = (b.r * 299 + b.g * 587 + b.b * 114) / 1000;
            var colorDiff = (
                Math.max(a.r, b.r) - Math.min(a.r, b.r) +
                Math.max(a.g, b.g) - Math.min(a.g, b.g) +
                Math.max(a.b, b.b) - Math.min(a.b, b.b)
            );

            return {
                brightness: Math.abs(brightnessA - brightnessB),
                color: colorDiff
            };
        };

        // `readable`
        // http://www.w3.org/TR/AERT#color-contrast
        // Ensure that foreground and background color combinations provide sufficient contrast.
        // *Example*
        //    tinycolor.readable("#000", "#111") => false
        tinycolor.readable = function(color1, color2) {
            var readability = tinycolor.readability(color1, color2);
            return readability.brightness > 125 && readability.color > 500;
        };

        // `mostReadable`
        // Given a base color and a list of possible foreground or background
        // colors for that base, returns the most readable color.
        // *Example*
        //    tinycolor.mostReadable("#123", ["#fff", "#000"]) => "#000"
        tinycolor.mostReadable = function(baseColor, colorList) {
            var bestColor = null;
            var bestScore = 0;
            var bestIsReadable = false;
            for (var i=0; i < colorList.length; i++) {

                // We normalize both around the "acceptable" breaking point,
                // but rank brightness constrast higher than hue.

                var readability = tinycolor.readability(baseColor, colorList[i]);
                var readable = readability.brightness > 125 && readability.color > 500;
                var score = 3 * (readability.brightness / 125) + (readability.color / 500);

                if ((readable && ! bestIsReadable) ||
                    (readable && bestIsReadable && score > bestScore) ||
                    ((! readable) && (! bestIsReadable) && score > bestScore)) {
                    bestIsReadable = readable;
                    bestScore = score;
                    bestColor = tinycolor(colorList[i]);
                }
            }
            return bestColor;
        };


        // Big List of Colors
        // ------------------
        // <http://www.w3.org/TR/css3-color/#svg-color>
        var names = tinycolor.names = {
            aliceblue: "f0f8ff",
            antiquewhite: "faebd7",
            aqua: "0ff",
            aquamarine: "7fffd4",
            azure: "f0ffff",
            beige: "f5f5dc",
            bisque: "ffe4c4",
            black: "000",
            blanchedalmond: "ffebcd",
            blue: "00f",
            blueviolet: "8a2be2",
            brown: "a52a2a",
            burlywood: "deb887",
            burntsienna: "ea7e5d",
            cadetblue: "5f9ea0",
            chartreuse: "7fff00",
            chocolate: "d2691e",
            coral: "ff7f50",
            cornflowerblue: "6495ed",
            cornsilk: "fff8dc",
            crimson: "dc143c",
            cyan: "0ff",
            darkblue: "00008b",
            darkcyan: "008b8b",
            darkgoldenrod: "b8860b",
            darkgray: "a9a9a9",
            darkgreen: "006400",
            darkgrey: "a9a9a9",
            darkkhaki: "bdb76b",
            darkmagenta: "8b008b",
            darkolivegreen: "556b2f",
            darkorange: "ff8c00",
            darkorchid: "9932cc",
            darkred: "8b0000",
            darksalmon: "e9967a",
            darkseagreen: "8fbc8f",
            darkslateblue: "483d8b",
            darkslategray: "2f4f4f",
            darkslategrey: "2f4f4f",
            darkturquoise: "00ced1",
            darkviolet: "9400d3",
            deeppink: "ff1493",
            deepskyblue: "00bfff",
            dimgray: "696969",
            dimgrey: "696969",
            dodgerblue: "1e90ff",
            firebrick: "b22222",
            floralwhite: "fffaf0",
            forestgreen: "228b22",
            fuchsia: "f0f",
            gainsboro: "dcdcdc",
            ghostwhite: "f8f8ff",
            gold: "ffd700",
            goldenrod: "daa520",
            gray: "808080",
            green: "008000",
            greenyellow: "adff2f",
            grey: "808080",
            honeydew: "f0fff0",
            hotpink: "ff69b4",
            indianred: "cd5c5c",
            indigo: "4b0082",
            ivory: "fffff0",
            khaki: "f0e68c",
            lavender: "e6e6fa",
            lavenderblush: "fff0f5",
            lawngreen: "7cfc00",
            lemonchiffon: "fffacd",
            lightblue: "add8e6",
            lightcoral: "f08080",
            lightcyan: "e0ffff",
            lightgoldenrodyellow: "fafad2",
            lightgray: "d3d3d3",
            lightgreen: "90ee90",
            lightgrey: "d3d3d3",
            lightpink: "ffb6c1",
            lightsalmon: "ffa07a",
            lightseagreen: "20b2aa",
            lightskyblue: "87cefa",
            lightslategray: "789",
            lightslategrey: "789",
            lightsteelblue: "b0c4de",
            lightyellow: "ffffe0",
            lime: "0f0",
            limegreen: "32cd32",
            linen: "faf0e6",
            magenta: "f0f",
            maroon: "800000",
            mediumaquamarine: "66cdaa",
            mediumblue: "0000cd",
            mediumorchid: "ba55d3",
            mediumpurple: "9370db",
            mediumseagreen: "3cb371",
            mediumslateblue: "7b68ee",
            mediumspringgreen: "00fa9a",
            mediumturquoise: "48d1cc",
            mediumvioletred: "c71585",
            midnightblue: "191970",
            mintcream: "f5fffa",
            mistyrose: "ffe4e1",
            moccasin: "ffe4b5",
            navajowhite: "ffdead",
            navy: "000080",
            oldlace: "fdf5e6",
            olive: "808000",
            olivedrab: "6b8e23",
            orange: "ffa500",
            orangered: "ff4500",
            orchid: "da70d6",
            palegoldenrod: "eee8aa",
            palegreen: "98fb98",
            paleturquoise: "afeeee",
            palevioletred: "db7093",
            papayawhip: "ffefd5",
            peachpuff: "ffdab9",
            peru: "cd853f",
            pink: "ffc0cb",
            plum: "dda0dd",
            powderblue: "b0e0e6",
            purple: "800080",
            red: "f00",
            rosybrown: "bc8f8f",
            royalblue: "4169e1",
            saddlebrown: "8b4513",
            salmon: "fa8072",
            sandybrown: "f4a460",
            seagreen: "2e8b57",
            seashell: "fff5ee",
            sienna: "a0522d",
            silver: "c0c0c0",
            skyblue: "87ceeb",
            slateblue: "6a5acd",
            slategray: "708090",
            slategrey: "708090",
            snow: "fffafa",
            springgreen: "00ff7f",
            steelblue: "4682b4",
            tan: "d2b48c",
            teal: "008080",
            thistle: "d8bfd8",
            tomato: "ff6347",
            turquoise: "40e0d0",
            violet: "ee82ee",
            wheat: "f5deb3",
            white: "fff",
            whitesmoke: "f5f5f5",
            yellow: "ff0",
            yellowgreen: "9acd32"
        };

        // Make it easy to access colors via `hexNames[hex]`
        var hexNames = tinycolor.hexNames = flip(names);


        // Utilities
        // ---------

        // `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
        function flip(o) {
            var flipped = { };
            for (var i in o) {
                if (o.hasOwnProperty(i)) {
                    flipped[o[i]] = i;
                }
            }
            return flipped;
        }

        // Take input from [0, n] and return it as [0, 1]
        function bound01(n, max) {
            if (isOnePointZero(n)) { n = "100%"; }

            var processPercent = isPercentage(n);
            n = mathMin(max, mathMax(0, parseFloat(n)));

            // Automatically convert percentage into number
            if (processPercent) {
                n = parseInt(n * max, 10) / 100;
            }

            // Handle floating point rounding errors
            if ((math.abs(n - max) < 0.000001)) {
                return 1;
            }

            // Convert into [0, 1] range if it isn't already
            return (n % max) / parseFloat(max);
        }

        // Force a number between 0 and 1
        function clamp01(val) {
            return mathMin(1, mathMax(0, val));
        }

        // Parse an integer into hex
        function parseHex(val) {
            return parseInt(val, 16);
        }

        // Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
        // <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
        function isOnePointZero(n) {
            return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
        }

        // Check to see if string passed in is a percentage
        function isPercentage(n) {
            return typeof n === "string" && n.indexOf('%') != -1;
        }

        // Force a hex value to have 2 characters
        function pad2(c) {
            return c.length == 1 ? '0' + c : '' + c;
        }

        // Replace a decimal with it's percentage value
        function convertToPercentage(n) {
            if (n <= 1) {
                n = (n * 100) + "%";
            }

            return n;
        }

        var matchers = (function() {

            // <http://www.w3.org/TR/css3-values/#integers>
            var CSS_INTEGER = "[-\\+]?\\d+%?";

            // <http://www.w3.org/TR/css3-values/#number-value>
            var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";

            // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
            var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";

            // Actual matching.
            // Parentheses and commas are optional, but not required.
            // Whitespace can take the place of commas or opening paren
            var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
            var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";

            return {
                rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
                rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
                hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
                hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
                hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
                hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
                hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
            };
        })();

        // `stringInputToObject`
        // Permissive string parsing.  Take in a number of formats, and output an object
        // based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
        function stringInputToObject(color) {

            color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
            var named = false;
            if (names[color]) {
                color = names[color];
                named = true;
            }
            else if (color == 'transparent') {
                return { r: 0, g: 0, b: 0, a: 0 };
            }

            // Try to match string input using regular expressions.
            // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
            // Just return an object and let the conversion functions handle that.
            // This way the result will be the same whether the tinycolor is initialized with string or object.
            var match;
            if ((match = matchers.rgb.exec(color))) {
                return { r: match[1], g: match[2], b: match[3] };
            }
            if ((match = matchers.rgba.exec(color))) {
                return { r: match[1], g: match[2], b: match[3], a: match[4] };
            }
            if ((match = matchers.hsl.exec(color))) {
                return { h: match[1], s: match[2], l: match[3] };
            }
            if ((match = matchers.hsla.exec(color))) {
                return { h: match[1], s: match[2], l: match[3], a: match[4] };
            }
            if ((match = matchers.hsv.exec(color))) {
                return { h: match[1], s: match[2], v: match[3] };
            }
            if ((match = matchers.hex6.exec(color))) {
                return {
                    r: parseHex(match[1]),
                    g: parseHex(match[2]),
                    b: parseHex(match[3]),
                    format: named ? "name" : "hex"
                };
            }
            if ((match = matchers.hex3.exec(color))) {
                return {
                    r: parseHex(match[1] + '' + match[1]),
                    g: parseHex(match[2] + '' + match[2]),
                    b: parseHex(match[3] + '' + match[3]),
                    format: named ? "name" : "hex"
                };
            }

            return false;
        }

        root.tinycolor = tinycolor;

    })(this);



    $(function () {
        if ($.fn.spectrum.load) {
            $.fn.spectrum.processNativeColorInputs();
        }
    });


    function log(){window.console&&(log=Function.prototype.bind?Function.prototype.bind.call(console.log,console):function(){Function.prototype.apply.call(console.log,console,arguments)},log.apply(this,arguments))};


})(window, jQuery);
;/**

 A jQuery version of window.resizeStop.

 This creates a jQuery special event called "resizestop". This event fires after a certain number of milliseconds since the last resize event fired.

 Additionally, as part of the event data that gets passed to the eventual handler function, the resizestop special event passes the size of the window in an object called "size".

 For example:

 $(window).bind('resizestop', function (e) {
        console.log(e.data.size);
    });

 This is useful for performing actions that depend on the window size, but are expensive in one way or another - i.e. heavy DOM manipulation or asset loading that might be detrimental to performance if run as often as resize events can fire.

 @name jQuery.event.special.resizestop
 @requires jQuery 1.4.2
 @namespace

 */
(function ($, setTimeout) {

    var $window = $(window),
        cache = $([]),
        last = 0,
        timer = 0,
        size = {};

    /**
     Handles window resize events.

     @private
     @ignore
     */
    function onWindowResize() {
        last = $.now();
        timer = timer || setTimeout(checkTime, 10);
    }

    /**
     Checks if the last window resize was over the threshold. If so, executes all the functions in the cache.

     @private
     @ignore
     */
    function checkTime() {
        var now = $.now();
        if (now - last < $.resizestop.threshold) {
            timer = setTimeout(checkTime, 10);
        } else {
            clearTimeout(timer);
            timer = last = 0;
            size.width = $window.width();
            size.height = $window.height();
            cache.trigger('resizestop');
        }
    }

    /**
     Contains configuration settings for resizestop events.

     @namespace
     */
    $.resizestop = {
        propagate: false,
        threshold: 500
    };

    /**
     Contains helper methods used by the jQuery special events API.

     @namespace
     @ignore
     */
    $.event.special.resizestop = {
        setup: function (data, namespaces) {
            cache = cache.not(this); // Prevent duplicates.
            cache = cache.add(this);
            if (cache.length === 1) {
                $window.bind('resize', onWindowResize);
            }
        },
        teardown: function (namespaces) {
            cache = cache.not(this);
            if (!cache.length) {
                $window.unbind('resize', onWindowResize);
            }
        },
        add: function (handle) {
            var oldHandler = handle.handler;
            handle.handler = function (e) {
                // Generally, we don't want this to propagate.
                if (!$.resizestop.propagate) {
                    e.stopPropagation();
                }
                e.data = e.data || {};
                e.data.size = e.data.size || {};
                $.extend(e.data.size, size);
                return oldHandler.apply(this, arguments);
            };
        }
    };

})(jQuery, setTimeout);;angular.module('ui.directives')
	.directive('bsTimepicker', ['$timeout', function ($timeout) {
		'use strict';

		var TIME_REGEXP = '((?:(?:[0-1][0-9])|(?:[2][0-3])|(?:[0-9])):(?:[0-5][0-9])(?::[0-5][0-9])?(?:\\s?(?:am|AM|pm|PM))?)';

		return {
			restrict: 'A',
			require: '?ngModel',
			link: function postLink(scope, element, attrs, controller) {

				// If we have a controller (i.e. ngModelController) then wire it up
				if (controller) {
					element.on('changeTime.timepicker', function (ev) {
						$timeout(function () {
							controller.$setViewValue(element.val());
						});
					});
				}

				// Handle input time validity
				var timeRegExp = new RegExp('^' + TIME_REGEXP + '$', ['i']);
				controller.$parsers.unshift(function (viewValue) {
					// console.warn('viewValue', viewValue, timeRegExp,  timeRegExp.test(viewValue));
					if (!viewValue || timeRegExp.test(viewValue)) {
						controller.$setValidity('time', true);
						return viewValue;
					} else {
						controller.$setValidity('time', false);
						return;
					}
				});

				// Create datepicker
				element.attr('data-toggle', 'timepicker');
				element.parent().addClass('bootstrap-timepicker');
				//$timeout(function () {
				element.timepicker();
				//});

			}
		};

	}]);;angular.module('ui.directives').directive('colorPicker', function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        scope: false,
        replace: true,
        template: "<span><input class='input-small' /></span>",
        link: function(scope, element, attrs, ngModel) {
            var input = element.find('input');
            var options = angular.extend({
                color: ngModel.$viewValue,
                showPalette: true,
                showInput: true,
                preferredFormat: "hex",
                palette: [
                    ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)", /*"rgb(153, 153, 153)","rgb(183, 183, 183)",*/
                        "rgb(204, 204, 204)", "rgb(217, 217, 217)", /*"rgb(239, 239, 239)", "rgb(243, 243, 243)",*/ "rgb(255, 255, 255)"],
                    ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
                        "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"],
                    ["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)",
                        "rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)",
                        "rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)",
                        "rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)",
                        "rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)",
                        "rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)",
                        "rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)",
                        "rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)",
                        /*"rgb(133, 32, 12)", "rgb(153, 0, 0)", "rgb(180, 95, 6)", "rgb(191, 144, 0)", "rgb(56, 118, 29)",
                         "rgb(19, 79, 92)", "rgb(17, 85, 204)", "rgb(11, 83, 148)", "rgb(53, 28, 117)", "rgb(116, 27, 71)",*/
                        "rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)",
                        "rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
                ],
                change: function(color) {
                    scope.$apply(function() {
                        ngModel.$setViewValue(color.toHexString());
                    });
                }
            }, scope.$eval(attrs.options));

            ngModel.$render = function() {
                input.spectrum('set', ngModel.$viewValue || '');
            };

            input.spectrum(options);
        }
    };
});;angular.module('ui.directives').directive('feedback', function($timeout) {
    var hideMessage;

    return {
        restrict: 'C',
        link: function(scope, element, attrs) {
            element.hide();

            var feedback = element.find('div.feedback-content > div');

            //show messages
            scope.$on('feedback:start', function(event, args){
                args = args || {};
                args.type = args.type || 'alert';
                args.message = args.message || '';

                element.show();

                feedback.removeClass().addClass(args.type).text(args.message);
            });

            //hide messages
            scope.$on('feedback:stop', function(event, args){
                args = args || {};
                args.type = args.type || 'alert';
                args.message = args.message || '';

                element.hide();

                feedback.removeClass().addClass(args.type).text(args.message);
            });
        }
    }
});;angular.module('ui.directives').directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
});;(function ($) {;//tooltips
$('body').tooltip({
    selector: "*[data-toggle=tooltip]"
});

/******************************************************************/
//helper functions
function safeApply(scope, fn) {
    var phase = scope.$root.$$phase;
    if (phase === '$apply' || phase === '$digest')
        scope.$eval(fn);
    else
        scope.$apply(fn);
}

//random color generator
function randomHexColor(){
    function c() {
        return Math.floor(Math.random()*256).toString(16);
    }
    return "#"+c()+c()+c();
}

//highlight selected day in mini calendar
$(document).on('click', 'div.mini-calendar tbody td', function () {
    $('div.mini-calendar tbody td').removeClass('on');
    $(this).addClass('on');
});

//resize window
$(window).bind('resizestop', function(event){
    if($(this).width() < 1400){
        $('#sidebar').removeClass('span2').addClass('span3');
        $('#content').removeClass('span10').addClass('span9');
    } else {
        $('#sidebar').removeClass('span3').addClass('span2');
        $('#content').removeClass('span9').addClass('span10');
    }
});

//define applicaton
var saturnApp = angular.module('saturnApp', ['ui', 'ui.bootstrap', 'ui.filters', 'ngResource', 'ngMockE2E']);

saturnApp.config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'partials/index.html'
                }).
                when('/login', {
                    templateUrl: 'partials/login.html'
                }).
                when('/settings/', {
                    templateUrl: 'partials/settings.html'
                }).
                when('/settings/emails', {
                    templateUrl: 'partials/settings-emails.html'
                }).
                when('/settings/calendars', {
                    templateUrl: 'partials/settings-calendars.html'
                }).
                when('/settings/profile', {
                    templateUrl: 'partials/settings-profile.html'
                }).
                when('/settings/account', {
                    templateUrl: 'partials/settings-account.html'
                }).
                when('/calendar/:calendarId/settings', {
                    templateUrl: 'partials/settings-calendar.html'
                }).
                when('/calendar/create', {
                    templateUrl: 'partials/create-calendar.html'
                }).
                when('/event/create', {
                    templateUrl: 'partials/create-event.html'
                }).
                when('/event/edit/:eventId', {
                    templateUrl: 'partials/edit-event.html'
                }).
                otherwise({
                    redirectTo: '/'
                });
        }
    ]).run(function ($rootScope, $location, $httpBackend, Data) {
        // register listener to watch route changes
        $rootScope.$on("$routeChangeStart", function (event, next, current) {
            if (Data.user.authorised === false || !$.cookie('saturn_access_token')) {
                //force log out
                Data.user.authorised = false;

                // no logged user, we should be going to #login
                $location.path("/login");

                return false;
            }

            if (Data.user.authorised === true) {
                // logged in users should not see the login again
                if (next.templateUrl === "partials/login.html") {
                    $location.path("/");
                }
            }
        });

        $rootScope.$on("$routeChangeSuccess", function(event, current, previous){
            $.cookie('saturn_current_path', $location.path());
        });

        //mock server interaction
        $httpBackend.whenPOST('/login').respond(function(method, url, data){
            data = $rootScope.$eval(data);
            return [200, {
                'login_hint': data.user,
                'apiKey': 'AIzaSyDBKGUfuXDiE_SSs8hUoVKC58v1zoii9Z0',
                'clientId': '512508236814-shh88q7m8kmongk24vgnagsm5p7q5ghl.apps.googleusercontent.com',
                'scopes': 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
            }];
        });

        $httpBackend.whenPOST('/logout').respond(function(method, url, data) {
        });

        //otherwise
        $httpBackend.whenPOST(/.*/).passThrough();
        $httpBackend.whenGET(/.*/).passThrough();
        $httpBackend.whenPUT(/.*/).passThrough();
        $httpBackend.whenDELETE(/.*/).passThrough();
        $httpBackend.whenPATCH(/.*/).passThrough();
    });

/******************************************************************/
saturnApp.filter('encodeURIComponent', function () {
    return window.encodeURIComponent;
});

/******************************************************************/
    //Data storage
    //will be used for communication between controllers
saturnApp.factory('Data', function () {
    var d = new Date();

    return {
        'settings': {
            'baseURL': 'https://www.googleapis.com/calendar/v3',
            'date': {
                'dateFormat': 'mm/dd/yy',
                'minDate': d,
                'changeMonth': true,
                'changeYear': true,
                'yearRange': d.getFullYear() + ':' + (d.getFullYear() + 5)
            },
            'timePicker': {
                'showMeridian': true
            }
        }
    };
});

/******************************************************************/
    //ACL
saturnApp.factory('ACL', function ($resource, Data) {
    return $resource(
        Data.settings.baseURL + '/calendars/:calendarId/acl/:ruleId', {
            'calendarId': '@calendarId',
            'ruleId': '@ruleId'
        }, {
            'insert': {
                'method': 'POST'
            },
            'list': {
                'method': 'GET'
            },
            'update': {
                'method': 'PUT'
            },
            'patch': {
                'method': 'patch'
            }
        });
});

//Calendar List
saturnApp.factory('CalendarList', function ($resource, Data) {
    return $resource(
        Data.settings.baseURL + '/users/:user/calendarList/:calendarId', {
            'user': 'me',
            'calendarId': '@calendarId'
        }, {
            'insert': {
                'method': 'POST'
            },
            'list': {
                'method': 'GET'
            },
            'update': {
                'method': 'PUT'
            },
            'patch': {
                'method': 'patch'
            }
        });
});

//Calendars
saturnApp.factory('Calendars', function ($resource, Data) {
    return $resource(
        Data.settings.baseURL + '/calendars/:calendarId', {
            'calendarId': '@calendarId'
        }, {
            'clear': {
                'method': 'POST',
                'url': Data.settings.baseURL + '/calendars/:calendarId/clear'
            },
            'insert': {
                'method': 'POST'
            },
            'update': {
                'method': 'PUT'
            },
            'patch': {
                'method': 'PATCH'
            },
            'delete': {
                'method': 'DELETE'
            }
        });
});

//Colors
saturnApp.factory('Colors', function ($resource, Data) {
    return $resource(
        Data.settings.baseURL, {
            'get': {
                'method': 'GET',
                'url': Data.settings.baseURL + '/colors'
            }
        });
});

//Events
saturnApp.factory('Events', function ($resource, Data) {
    return $resource(
        Data.settings.baseURL, {
            'calendarId': '@calendarId',
            'eventId': '@eventId',
            'access_token': '@access_token'
        }, {
            'delete': {
                'method': 'DELETE',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events/:eventId'
            },
            'get': {
                'method': 'GET',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events/:eventId'
            },
            'import': {
                'method': 'POST',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events/import'
            },
            'insert': {
                'method': 'POST',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events'
            },
            'instances': {
                'method': 'GET',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events/:eventId/instances'
            },
            'list': {
                'method': 'GET',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events'
            },
            'move': {
                'method': 'POST',
                'URL': Data.settings.baseURL + '/calendars/:calendarId/events/:eventId/move'
            },
            'quickAdd': {
                'method': 'POST',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events/quickAdd'
            },
            'update': {
                'method': 'PUT',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events/:eventId'
            },
            'patch': {
                'method': 'PATCH',
                'url': Data.settings.baseURL + '/calendars/:calendarId/events/:eventId'
            }
        });
});

//Colors
saturnApp.factory('Freebusy', function ($resource, Data) {
    return $resource(
        Data.settings.baseURL, {
            'query': {
                'method': 'POST',
                'url': Data.settings.baseURL + '/freeBusy'
            }
        });
});

//Settings
saturnApp.factory('Settings', function ($resource, Data) {
    return $resource(
        Data.settings.baseURL, {
            'setting': '@setting'
        }, {
            'get': {
                'method': 'GET',
                'url': Data.settings.baseURL + '/users/me/settings/:setting'
            },
            'list': {
                'method': 'GET',
                'url': Data.settings.baseURL + '/users/me/settings/'
            }
        });
});

/******************************************************************/
/* Events */
saturnApp.controller('EventController', ['$scope', '$rootScope', '$filter', '$location', '$timeout', 'Events', 'Data', function ($scope, $rootScope, $filter, $location, $timeout, Events, Data) {
    $scope.data = Data;

    var i = 0,
        fetching = false;

    $scope.events =  function(start, end, callback) {
        i = 0;
        $scope.getEvents($scope.data.calendars, start, end, function(){
            // when no more calendars to fetch, please re-render events fetched
            $scope.calendar.fullCalendar('refetchEvents');
        });
    };


    //get events
    $scope.getEvents = function(sources, start, end, callback){
        if(!sources.length){
            return false;
        }

        if(i === sources.length){
            //notify everyone that events have loaded
            $rootScope.$broadcast('feedback:stop');

            i = 0;
            return false;
        }

        //get min and max time
        var timestamp = start.getTime() + end.getTime(),

        //format the start and end dates to match google specs
            startTime  = $filter('date')(start, 'yyyy-MM-ddTHH:mm:ssZ'),
            endTime  = $filter('date')(end, 'yyyy-MM-ddTHH:mm:ssZ');

        //check if the current calendar is selected
        if(sources[i].selected === true && sources[i].dateRange.indexOf(timestamp) === -1 && !fetching){
            //notify everyone that events started loading
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert',
                'message': 'Loading events ...'
            });

            fetching = true;
            safeApply($scope, function(){
                Events.list({
                    'calendarId': sources[i].id,
                    'access_token': $.cookie('saturn_access_token'),
                    'timeMin': startTime,
                    'timeMax': endTime
                },

                //success
                function(response){
                    sources[i].dateRange.push(timestamp);

                    sources[i].events.push.apply(sources[i].events, response.items);

                    sources[i].events = $filter('unique')(sources[i].events);

                    fetching = false;

                    i++;

                    callback();

                    //recall the get events function
                    $scope.getEvents(sources, start, end, callback);
                },

                //error
                function(response){
                    //show feedback
                    $rootScope.$broadcast('feedback:start', {
                        'type': 'alert alert-error',
                        'message': response.data.error.message
                    });

                    //hide feedback
                    $timeout(function(){
                        $rootScope.$broadcast('feedback:stop');
                    }, 1000);
                });
            });
        } else {
            i++;

            //recall the get events function
            $scope.getEvents(sources, start, end, callback);
        }
    };

    //add new event
    $scope.createEvent = function(){
        var d = new Date();

        //created and updated dates
        $scope.data.currentEvent.created = $.fullCalendar.formatDate(d, 'u');
        $scope.data.currentEvent.updated = $.fullCalendar.formatDate(d, 'u');

        //loop over all calendars
        angular.forEach($scope.data.calendars, function(value, key){
            if(value.id === $scope.data.currentEvent.source.id){
                value.events.push($scope.data.currentEvent);
            }
        });

        //show feedback
        $rootScope.$broadcast('feedback:start', {
            'type': 'alert',
            'message': 'Saving event ...'
        });

        //send the event to the server
        Events.insert({
            'calendarId': $scope.data.currentEvent.source.id,
            'start': {
                'dateTime': $.fullCalendar.formatDate($scope.data.currentEvent.start, 'u')
            },
            'end': {
                'dateTime': $.fullCalendar.formatDate($scope.data.currentEvent.start, 'u')
            },
            'summary': $scope.data.currentEvent.title,
            'description': $scope.data.currentEvent.description,
            'location': $scope.data.currentEvent.location
        },
        //success
        function(response){
            //reset the current event
            $scope.setCurrentEvent();

            //show feedback
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert alert-success',
                'message': 'Event saved'
            });

            //hide feedback
            $timeout(function(){
                $rootScope.$broadcast('feedback:stop');

                //go to homepage
                $location.path('/');
            }, 1000);
        },
        //error
        function(response){
            //show feedback
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert alert-error',
                'message': response.data.error.message
            });

            //hide feedback
            $timeout(function(){
                $rootScope.$broadcast('feedback:stop');
            }, 1000);
        });
    };

    //update event
    $scope.updateEvent = function(successCallback, errorCallback){
        var d = new Date();

        safeApply($scope, function(){
            //let the user know events are saving
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert',
                'message': 'Updating event ...'
            });

            $scope.data.currentEvent.updated = $.fullCalendar.formatDate(d, 'u');

            //send data to the server
            Events.update({
                'calendarId': $scope.data.currentEvent.source.id,
                'eventId': $scope.data.currentEvent.id,
                'start': {
                    'dateTime': $.fullCalendar.formatDate($scope.data.currentEvent.start, 'u')
                },
                'end': {
                    'dateTime': $.fullCalendar.formatDate($scope.data.currentEvent.end, 'u')
                },
                'summary': $scope.data.currentEvent.title,
                'description': $scope.data.currentEvent.description,
                'location': $scope.data.currentEvent.location,
                'sequence': $scope.data.currentEvent.sequence
            },
            //success
            function(response){
                //update sequence
                $scope.data.currentEvent.sequence++;

                //show feedback
                $rootScope.$broadcast('feedback:start', {
                    'type': 'alert alert-success',
                    'message': 'Event updated'
                });

                //hide feedback
                $timeout(function(){
                    $rootScope.$broadcast('feedback:stop');

                    //go to homepage
                    $location.path('/');
                }, 1000);

                if(typeof successCallback === 'function'){
                    successCallback();
                }
            },

            //error
            function(response){
                //show feedback
                $rootScope.$broadcast('feedback:start', {
                    'type': 'alert alert-error',
                    'message': response.data.error.message
                });

                //hide feedback
                $timeout(function(){
                    $rootScope.$broadcast('feedback:stop');
                }, 1000);

                if(typeof errorCallback === 'function'){
                    errorCallback();
                }
            });
        });
    };

    $scope.deleteEvent = function(){
        if(confirm('Are you sure you want to delete this event ?')){
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert',
                'message': 'Deleting event ...'
            });

            safeApply($scope, function(){
                //delete the event from the server
                Events.delete({
                    'calendarId': $scope.data.currentEvent.source.id,
                    'eventId': $scope.data.currentEvent.id,
                    'sendNotifications': true
                },
                //success
                function(response){
                    //feedback
                    $rootScope.$broadcast('feedback:start', {
                        'type': 'alert alert-success',
                        'message': 'Event deleted.'
                    });

                    $timeout(function(){
                        $rootScope.$broadcast('feedback:stop');
                    }, 1000);

                    //redirect to homepage
                    //$location.path('/');
                },
                //error
                function(response){
                    //feedback
                    $rootScope.$broadcast('feedback:start', {
                        'type': 'alert alert-error',
                        'message': response.data.error.message
                    });

                    $timeout(function(){
                        $rootScope.$broadcast('feedback:stop');
                    }, 1000);
                });
            });
        }
    };

    //check start/end time and date
    $scope.checkEventDates = function(){
        //check if start date is greater than end date
        if($scope.data.currentEvent.start.getTime() > $scope.data.currentEvent.end.getTime() || !$scope.data.currentEvent.end){
            //end is equal to start
            $scope.data.currentEvent.end = $scope.data.currentEvent.start;
        }
    };

    //current event
    $scope.setCurrentEvent = function(start, end, allDay){
        var startDate = start || new Date(),
            endDate = end || new Date();

        var startTime = $.fullCalendar.formatDate(startDate, 'hh:mm TT'),
            endTime = $.fullCalendar.formatDate(endDate, 'hh:mm TT');

        $scope.data.currentEvent = {
            'title': 'New event',
            'id': Math.random().toString(36).slice(2),
            'start': startDate,
            'end': endDate,
            'startDate': startDate,
            'endDate': endDate,
            'startTime': startTime,
            'endTime': endTime,
            'allDay': allDay || false,
            'organizer': {
                'displayName': $scope.data.user.firstName + ' ' + $scope.data.user.lastName,
                'email': $scope.data.user.email,
                'self': true
            },
            'creator': {
                'displayName': $scope.data.user.firstName + ' ' + $scope.data.user.lastName,
                'email': $scope.data.user.email,
                'self': true
            },
            'created': '',
            'updated': '',
            'editable': true,
            'source': {
                'editable': true
            }
        };
    };

    if(!$scope.data.currentEvent){
        $scope.setCurrentEvent();
    }

    //after the user has clicked an event
    $scope.eventClick = function( event, jsEvent, view ){
        //if we can edit the event
        if(event.editable === true || event.source.editable === true){
            //reset current event
            $scope.data.currentEvent = {};

            //copy selected event into current event
            $.extend($scope.data.currentEvent, event);

            var startDate = event.start,
                endDate = event.end;

            var startTime = $.fullCalendar.formatDate(startDate, 'hh:mm TT'),
                endTime;
            if(endDate){
                endTime = $.fullCalendar.formatDate(endDate, 'hh:mm TT');
            }

            //start/end datetimes
            $scope.data.currentEvent.startDate = startDate;
            $scope.data.currentEvent.endDate = endDate;

            $scope.data.currentEvent.startTime = startTime;
            $scope.data.currentEvent.endTime = endTime;

            //hackish way to check all day
            //works for now
            if(event.end && event.end.getTime() - event.start.getTime() === 86400000){
                $scope.data.currentEvent.allDay = true;
            } else {
                $scope.data.currentEvent.allDay = false;
            }

            safeApply($scope, function(){
                //go to the edit page
                $location.path('/event/edit/' + event.id);
            });
        }
    };

    //after the user has selected a time period
    $scope.select = function(start, end, allDay, jsEvent, view){
        $scope.setCurrentEvent(start, end, allDay);

        safeApply($scope, function(){
            //go to add event page
            $location.path('/event/create');
        });
    };

    //after an event has been moved to another slot
    $scope.eventDrop = function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view){
        //copy selected event into current event
        $scope.data.currentEvent = event;

        $scope.updateEvent(
            function(){},
            function(){
                revertFunc();
            }
        );
    };

    //after an event has been resized
    $scope.eventResize = function( event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ) {
        //copy selected event into current event
        $scope.data.currentEvent = event;

        $scope.updateEvent(
            function(){},
            function(){
                revertFunc();
            }
        );
    };

    //use stored sources for calendar events
    $scope.eventSources = [];

    $scope.updateEventSources = function(){
        $scope.eventSources.push.apply($scope.eventSources, $scope.data.calendars);
    };

    if($scope.data.calendars && $scope.data.calendars.length){
        $scope.updateEventSources();
    }

    $scope.$on('calendarsLoaded', function() {
        $scope.updateEventSources();
    });

    //master calendar
    $scope.masterCalendarOptions = {
        header: {
            left: 'month agendaWeek agendaDay agendaList',
            center: 'title',
            right: 'today prev,next'
        },
        allDayDefault: false,
        selectable: true,
        defaultView: 'agendaWeek',
        slotMinutes: 15,
        defaultEventMinutes: $scope.data.settings.defaultEventLength,
        eventClick: $scope.eventClick,
        eventDrop: $scope.eventDrop,
        eventResize: $scope.eventResize,
        viewDisplay: function (view) {
            // TODO: emit('loading:Started');
            $scope.getEvents($scope.data.calendars, view.start, view.end, function(){
                // when no more calendars to fetch, please re-render events fetched
                $scope.calendar.fullCalendar('refetchEvents');
            });
        },
        eventDataTransform: function(eventData){
            var d = new Date(),
                endDate,
                eventClass;

            if(eventData.end){
                if(eventData.end instanceof Date) {
                    endDate = eventData.end;
                }

                if(eventData.end.date){
                    endDate = $.fullCalendar.parseDate(eventData.end.date);
                }

                if(eventData.end.dateTime) {
                    endDate = $.fullCalendar.parseDate(eventData.end.dateTime);
                }

                if(endDate < d){
                    eventClass = 'past-event';
                }
            }

            return {
                id: eventData.id,
                title: eventData.title || eventData.summary,
                description: eventData.description,
                kind: eventData.kind,
                etag: eventData.etag,
                status: eventData.status,
                htmlLink: eventData.htmlLink,
                created: eventData.created,
                updated: eventData.updated,
                summary: eventData.summary,
                creator: eventData.creator,
                organizer: eventData.organizer,
                visibility: eventData.visibility,
                sequence: eventData.sequence,
                iCalUID: eventData.iCalUID,
                gadget: eventData.gadget,
                location: eventData.location,
                className: eventClass,
                start: eventData.start.date || eventData.start.dateTime || eventData.start,
                end: eventData.end ? (eventData.end.date || eventData.end.dateTime || eventData.end) : (eventData.start.date || eventData.start.dateTime || eventData.start)
            };
        },
        eventRender: function(event, element, view){
            if(event.gadget){
                //replace the element content with the icon
                element.html('<img title="' + event.gadget.title + '" src="' + event.gadget.iconLink + '" width="16" height="16" />');

                //no borders or backgrounds
                element.css({
                    'background': 'none',
                    'border': 0
                });
            }
        },
        eventAfterAllRender: function(view){
        },
        select: $scope.select
    };

    //mini calendar
    $scope.miniCalendarOptions = {
        header: {
            left: '',
            center: 'title',
            right: 'today prev,next'
        },
        editable: false,
        selectable: false,
        columnFormat: {
            day: 'D'
        },
        eventRender: function (event, element, view) {
            return false;
        },
        viewDisplay: function(view){
            $scope.calendar.fullCalendar('gotoDate', view.start);
        },
        dayClick: function (date, allDay, jsEvent, view) {
            $scope.calendar.fullCalendar('gotoDate', date);
        }
    };
}]);

/******************************************************************/
/* Calendars */
saturnApp.controller('CalendarController', ['$scope', '$rootScope', '$location', '$timeout', 'CalendarList', 'Calendars', 'Data', function ($scope, $rootScope, $location, $timeout, CalendarList, Calendars, Data) {
    $scope.data = Data;

    if(!$scope.data.calendars){
        $scope.data.calendars = [];
    }

    var bgColor = randomHexColor();
    //avoid generating a black background
    if(bgColor === '#000000'){
        bgColor = randomHexColor();
    }

    $scope.calendar = {
        //set random bg color
        //text color defaults to black
        'color': bgColor,
        'textColor': '#000'
    };

    if($scope.data.currentCalendar){
        $.extend($scope.calendar, $scope.data.currentCalendar);
    }

    //render calendars after login
    $scope.$watch('data.user.authorised', function(newValue, oldValue){
        if(newValue === true && $scope.data.calendars.length === 0){
            loadCalendarList();
        }
    });

    //load calendars
    function loadCalendarList() {
        //notify everyone that calendars started loading
        $rootScope.$broadcast('feedback:start', {
            'type': 'alert',
            'message': 'Loading calendars ...'
        });

        //request calendars from the server
        CalendarList.list({
            'access_token': $.cookie('saturn_access_token')
        },
        //success
        function(response){
            //feedback
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert alert-success',
                'message': 'Calendars loaded'
            });

            $timeout(function(){
                $rootScope.$broadcast('feedback:stop');
            }, 1000);

            //loop over calendars and add/chenge metadata
            angular.forEach(response.items, function(value, key){
                value.editable = (value.accessRole === 'owner' ? true : false);
                value.events = [];
                value.color = value.borderColor = value.backgroundColor;
                value.textColor = value.foregroundColor;
                value.dateRange = [];

                //push new calendar into stack
                $scope.data.calendars.push(value);
            });

            $scope.$emit('calendarsLoaded');
        },
        //error
        function(response){
            //feedback
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert alert-error',
                'message': response.data.error.message
            });

            $timeout(function(){
                $rootScope.$broadcast('feedback:stop');
            }, 1000);
        });
    }

    //save a new calendar
    $scope.createCalendar = function(){
        //feedback
        $rootScope.$broadcast('feedback:start', {
            'type': 'alert',
            'message': 'Saving calendar ...'
        });

        //insert new calendar
        Calendars.insert({
            'summary': $scope.calendar.summary,
            'description': $scope.calendar.description,
            'location': $scope.calendar.location,
            'timeZone': $scope.calendar.timeZone
        },

        //success
        function(response){
            //save the calendat into a calendar list
            CalendarList.insert({
                'id': response.id,
                'kind': response.kind,
                'etag': response.etag,
                'hidden': false,
                'selected': true,
                'foregroundColor': $scope.calendar.foregroundColor,
                'backgroundColor': $scope.calendar.backgroundColor,
                'defaultReminders': [{
                    "method": 'email',
                    "minutes": 10
                }]
            },

            //success
            function(resp){
                var calendar = {
                    'id': resp.id,
                    'kind': resp.kind,
                    'etag': resp.etag,
                    'hidden': resp.hidden,
                    'selected': resp.selected,
                    'foregroundColor': resp.foregroundColor,
                    'backgroundColor': resp.backgroundColor,
                    'colorId': resp.colorId,
                    'defaultReminders': resp.defaultReminders,
                    'locaton': resp.defaultReminders,
                    'summary': resp.summary,
                    'title': resp.summary,
                    'accessRole': resp.accessRole
                };

                //update color meta
                calendar.data.color = resp.backgroundColor;

                //push the calendar to personal calendars array
                $scope.data.calendars.push(calendar);

                //feedback
                $rootScope.$broadcast('feedback:start', {
                    'type': 'alert alert-success',
                    'message': 'Calendar saved'
                });

                $timeout(function(){
                    $rootScope.$broadcast('feedback:stop');
                }, 1000);

                //redirect to the homepage
                $location.path('/');
            },
            //error
            function(resp){
                //feedback
                $rootScope.$broadcast('feedback:start', {
                    'type': 'alert alert-error',
                    'message': resp.error.message
                });

                $timeout(function(){
                    $rootScope.$broadcast('feedback:stop');
                }, 1000);
            });
        },

        //error
        function(response){
            //feedback
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert alert-error',
                'message': response.error.message
            });

            $timeout(function(){
                $rootScope.$broadcast('feedback:stop');
            }, 1000);
        });
    };

    //update calendar settings
    $scope.updateCalendar = function(){
        //feedback
        $rootScope.$broadcast('feedback:start', {
            'type': 'alert',
            'message': 'Updating calendar ...'
        });

        $.extend($scope.data.currentCalendar, $scope.calendar);

        //hack to get calendar colors to behave ok
        $scope.data.currentCalendar.backgroundColor =  $scope.data.currentCalendar.color;
        $scope.data.currentCalendar.borderColor =  $scope.data.currentCalendar.color;

        //update calendar meta
        Calendars.update({
            'calendarId': $scope.calendar.id,
            'summary': $scope.calendar.summary,
            'description': $scope.calendar.description,
            'location': $scope.calendar.location,
            'timeZone': $scope.calendar.timeZone
        },

        //success
        function(response){
            //feedback
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert alert-success',
                'message': 'Calendar updated'
            });

            $timeout(function(){
                $rootScope.$broadcast('feedback:stop');
            }, 1000);

            $scope.calendar = null;

            //redirect to the homepage
            $location.path('/');
        },

        //error
        function(response){
            //feedback
            $rootScope.$broadcast('feedback:start', {
                'type': 'alert alert-error',
                'message': response.error.message
            });

            $timeout(function(){
                $rootScope.$broadcast('feedback:stop');
            }, 1000);
        });
    };

    //set current calendar ID
    $scope.setCurrentCalendarID = function(){
        $scope.data.currentEvent.source.id = this.calendar.id;
    };

    //set current calendar
    $scope.setCalendar = function(){
        $scope.data.currentCalendar = this.calendar;
    };

    //reset current calendar settings
    $scope.resetCalendar = function(){
        $.extend($scope.calendar, $scope.data.currentCalendar);
    };

    //delete calendar
    $scope.deleteCalendar = function(){
        var self = this;

        //make sure the user knows what he's doing
        if(confirm('Are you sure you want to delete this calendar ?')){
            //send a request to the server to delete the calendar
            Calendars.delete({
                'calendarId': self.calendar.id
            });

            //remove the current calendar from the array
            angular.forEach($scope.data.calendars, function(value, key){
                if(value.id === self.calendar.id){
                    $scope.data.calendars.splice(key, 1);
                }
            });
        }
    };

    //unsubscribe from calendar
    $scope.unsubscribe = function(){
        //make sure the user knows what he's doing
        if(confirm('Are you sure you want to unsubscribe from "' + this.calendar.summary + '" ?')){
        }
    };

    //display only this calendar
    $scope.displayCalendar = function(){
        var self = this;

        angular.forEach($scope.data.calendars, function(value, key){
            if(value.id === self.calendar.id){
                value.selected = true;
            } else {
                value.selected = false;
            }
        });
    };
}]);

/******************************************************************/
/* Settings */
saturnApp.controller('SettingsController', ['$scope', 'Data', function ($scope, Data) {
    $scope.data = Data;

    if(!$scope.data.settings.emails){
        $scope.data.settings.emails = [];
    }

    //add emails
    $scope.addEmail = function(){
        //add email to stack
        if($scope.data.settings.emails.indexOf($scope.data.settings.newEmail) === -1){
            $scope.data.settings.emails.push($scope.data.settings.newEmail);
        }

        //clear model
        $scope.data.settings.newEmail = null;
    };

    //remove emails
    $scope.deleteEmail = function(){
        if(confirm('Are you sure you want to remove this email from your list ?')){
            $scope.data.settings.emails.splice(this.$index, 1);
        }
    };
}]);

/******************************************************************/
    //User
saturnApp.controller('UserController', ['$scope', '$rootScope', '$location', '$http', '$timeout', 'Data', 'Settings', function ($scope, $rootScope, $location, $http, $timeout, Data, Settings) {
    $scope.data = Data;

    if(!$scope.data.user){
        $scope.data.user = {
            'firstName': 'User',
            'authorised': false
        };
    }

    //login
    $scope.login = function(){
        //make a post to the sever with the user credentials
        $http.post('/login', {
            'user': $scope.loginData.user,
            'password': $scope.loginData.password
        }).success(function(data, status, headers, config){
            $scope.data.apiKey = data.apiKey;
            //set google auth key
            gapi.client.setApiKey(data.apiKey);

            window.setTimeout(function(){
                gapi.auth.authorize({
                    'client_id': data.clientId,
                    'scope': data.scopes,
                    'response_type': 'token',
                    'immediate': false,
                    'login_hint': data.login_hint,
                    'approval_prompt': 'auto'
                }, handleAuthResult);
            }, 200);
        }).error(function(data, status, headers, config){
        });
    };

    //called after the user has logged in
    function handleAuthResult (response) {
        if (response && !response.error) {
            var d = new Date();

            d.setTime(d.getTime() + (parseInt(response.expires_in) * 1000));

            //save a copy of the access token for later use
            $.cookie('saturn_access_token', response.access_token, {'expires': d});

            $http.defaults.headers.common['Authorization'] = 'Bearer ' + $.cookie('saturn_access_token');

            //set the user as logged in
            $scope.data.user.authorised = true;

            //redirect to the home page
            $location.path('/');

            //get user data
            $scope.getUserData();

            //get user settings
            Settings.list({
                'access_token': $.cookie('saturn_access_token')
            },

            //success
            function(response){
                //loop over all the settings
                angular.forEach(response.items, function(value, key){
                    $scope.data.settings[value.id] = value.value;
                });
            },

            //error
            function(response){
                //show feedback
                $rootScope.$broadcast('feedback:start', {
                    'type': 'alert alert-error',
                    'message': response.data.error.message
                });

                //hide feedback
                $timeout(function(){
                    $rootScope.$broadcast('feedback:stop');
                }, 1000);
            });
        }
    }

    //logout
    $scope.logout = function () {
        //destroy stored cookie
        $.cookie('saturn_access_token', null, {'expires': -1});
        $.cookie('saturn_current_path', null, {'expires': -1});

        //reset data
        $scope.data.user.authorised = false;
        $scope.data.calendars = [];

        //hide feedback
        $rootScope.$broadcast('feedback:stop');

        //redirect to the login page
        $location.path('/login');
    };

    //get user data
    $scope.getUserData = function(){
        safeApply($scope, function(){
            //makea request to google apps and get user data
            $http({
                'method': 'GET',
                'url': 'https://www.googleapis.com/oauth2/v3/userinfo',
                'params': {
                    'access_token': $.cookie('saturn_access_token')
                }
            }).success(function(data, status, headers, config){
                    //update user data
                    $scope.data.user.firstName = data.given_name;
                    $scope.data.user.lastName = data.family_name;
                    $scope.data.user.email = data.email;
                    $scope.data.user.gender = data.gender;
                    $scope.data.user.picture = data.picture;
                    $scope.data.user.profile = data.profile;
                });
        });
    };

    //if the user refreshes the page and is logged in
    if($.cookie('saturn_access_token')){
        //set the user as logged in
        $scope.data.user.authorised = true;

        $http.defaults.headers.common['Authorization'] = 'Bearer ' + $.cookie('saturn_access_token');

        //if we have a path stored, go there
        if($.cookie('saturn_current_path')){
            $location.path($.cookie('saturn_current_path'));
        } else {
            //redirect to the home page
            $location.path('/');
        }

        //get user data
        $scope.getUserData();
    }
}]);;})(jQuery);