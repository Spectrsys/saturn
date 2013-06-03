(function ($) {
    //tooltips
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

    //calendar
    $(document).on('click', 'div.mini-calendar tbody td', function () {
        $('div.mini-calendar tbody td').removeClass('on');
        $(this).addClass('on');
    });

    //define applicaton
    var saturnApp = angular.module('saturnApp', ['ui', 'ui.bootstrap', 'ngResource', 'ngMockE2E']);

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
                    otherwise({
                        redirectTo: '/'
                    });
            }
        ]).run(function ($rootScope, $location, $httpBackend) {
            //application setup
            $rootScope.setup = function () {
                $rootScope.user = {
                    'authorised': false
                };

                $rootScope.dataCache = $rootScope.config = null;

                //application data storage
                $rootScope.dataCache = {
                    'calendars': [],
                    'calendarList': [{
                        'title': 'My calendars',
                        'calendars': []
                    }, {
                        'title': 'Subscribed calendars',
                        'calendars': []
                    }
                    ],
                    'eventTokens': [],
                    'tempCalendar': {},
                    'events': []
                };

                $rootScope.config = {
                    'baseURL': 'https://www.googleapis.com/calendar/v3'
                };
            };

            $rootScope.setup();

            // register listener to watch route changes
            $rootScope.$on("$routeChangeStart", function (event, next, current) {
                if ($rootScope.user.authorised === false) {
                    // no logged user, we should be going to #login
                    if (next.templateUrl !== "partials/login.html") {
                        $location.path("/login");
                    }
                }

                if ($rootScope.user.authorised === true) {
                    // logged in users should not see the login again
                    if (next.templateUrl === "partials/login.html") {
                        $location.path("/");
                    }
                }
            });

            //mock server interaction
            $httpBackend.whenPOST('/login').respond(function(method, url, data){
                data = $rootScope.$eval(data);
                return [200, {
                    'login_hint': data.user,
                    'apiKey': 'AIzaSyC3K--D5YHRX9rz0hU4tkb6evngzEuk-34',
                    'clientId': '512508236814-d35qanajio78edinfs3sekn56g8ia07l.apps.googleusercontent.com',
                    'scopes': 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
                }];
            });

            $httpBackend.whenPOST('/logout').respond(function(method, url, data) {
            });

            //otherwise
            $httpBackend.whenGET(/.*/).passThrough();
        });

    /******************************************************************/
    saturnApp.filter('encodeURIComponent', function () {
        return window.encodeURIComponent;
    });

    /******************************************************************/
        //ACL
    saturnApp.factory('ACL', function ($resource, $rootScope) {
        return $resource(
            $rootScope.config.baseURL + '/calendars/:calendarId/acl/:ruleId', {
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
    saturnApp.factory('CalendarList', function ($resource, $rootScope) {
        return $resource(
            $rootScope.config.baseURL + '/users/:user/calendarList/:calendarId', {
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
    saturnApp.factory('Calendars', function ($resource, $rootScope) {
        return $resource(
            $rootScope.config.baseURL + '/calendars/:calendarId', {
                'calendarId': '@calendarId',
                'key': '@key'
            }, {
                'clear': {
                    'method': 'POST',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/clear'
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
    saturnApp.factory('Colors', function ($resource, $rootScope) {
        return $resource(
            $rootScope.config.baseURL, {
                'get': {
                    'method': 'GET',
                    'url': $rootScope.config.baseURL + '/colors'
                }
            });
    });

    //Events
    saturnApp.factory('Events', function ($resource, $rootScope) {
        return $resource(
            $rootScope.config.baseURL, {
                'calendarId': '@calendarId',
                'eventId': '@eventId',
                'access_token': '@access_token'
            }, {
                'delete': {
                    'method': 'DELETE',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
                },
                'get': {
                    'method': 'GET',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
                },
                'import': {
                    'method': 'POST',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/import'
                },
                'insert': {
                    'method': 'POST',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events'
                },
                'instances': {
                    'method': 'GET',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId/instances'
                },
                'list': {
                    'method': 'GET',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events'
                },
                'move': {
                    'method': 'POST',
                    'URL': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId/move'
                },
                'quickAdd': {
                    'method': 'POST',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/quickAdd'
                },
                'update': {
                    'method': 'POST',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
                },
                'patch': {
                    'method': 'PATCH',
                    'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
                }
            });
    });

    //Colors
    saturnApp.factory('Freebusy', function ($resource, $rootScope) {
        return $resource(
            $rootScope.config.baseURL, {
                'query': {
                    'method': 'POST',
                    'url': $rootScope.config.baseURL + '/freeBusy'
                }
            });
    });

    //Settings
    saturnApp.factory('Settings', function ($resource, $rootScope) {
        return $resource(
            $rootScope.config.baseURL, {
                'userId': '@userId',
                'setting': '@setting'
            }, {
                'get': {
                    'method': 'GET',
                    'url': $rootScope.config.baseURL + '/users/:userId/settings/:setting'
                },
                'list': {
                    'method': 'GET',
                    'url': $rootScope.config.baseURL + '/users/:userId/settings'
                }
            });
    });

    /******************************************************************/
    /* Events */
    saturnApp.controller('EventController', function ($scope, $rootScope, $filter, $location, Events) {
        $scope.events =  function(start, end, callback) {
            //return fetchEvents($rootScope.dataCache.calendars, start, end, callback);
        };

        $scope.eventSources = [$scope.events];

        //fetch events
        var i = 0,
            evtCache = [];

        function fetchEvents(sources, start, end, callback){
            var sortStart  = $filter('date')(start, 'yyyy-MM-ddTHH:mm:ssZ'),
                sortEnd  = $filter('date')(end, 'yyyy-MM-ddTHH:mm:ssZ');

            if(!sources.length){
                return false;
            }

            if(i === sources.length){
                i = 0;
                if(typeof callback === 'function'){
                    callback();
                }

                return false;
            }

            if(sources[i].selected === true){
                safeApply($scope, function(){
                    var promise = Events.list({
                        'calendarId': sources[i].id,
                        'access_token': $rootScope.dataCache.access_token,
                        'timeMin': sortStart,
                        'timeMax': sortEnd
                    });

                    promise.$then(function(){
                        i++;

                        evtCache.push.apply(evtCache, promise.items);
                        return fetchEvents(sources, start, end, callback);
                    });
                });
            } else {
                i++;
                return fetchEvents(sources, start, end, callback);
            }

            return evtCache;
        }

        $scope.updateEventSources = function(){
        };

        //master calendar
        $scope.masterCalendar = {
            header: {
                left: 'month agendaWeek agendaDay',
                center: 'title',
                right: 'today prev,next'
            },
            allDayDefault: false,
            selectable: true,
            defaultView: 'agendaWeek',
            slotMinutes: 15,
            eventClick: $scope.eventClick,
            viewDisplay: function (view) {
            },
            loading: function (bool) {
                if (!bool) {
                    $rootScope.$broadcast('loading:Started');
                } else {
                    $rootScope.$broadcast('loading:Finished');
                }
            },
            select: $scope.select,
            unselect: $scope.unselect
        };

        //mini calendar
        $scope.miniCalendar = {
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
            eventRender: function () {
                return false;
            },
            dayClick: function (date, allDay, jsEvent, view) {}
        };
    });

    /******************************************************************/
    /* Calendars */
    saturnApp.controller('CalendarController', function ($scope, $rootScope, $location, CalendarList, Calendars) {
        var bgColor = randomHexColor();
        //avoid generating a black background
        if(bgColor === '#000000'){
            bgColor = randomHexColor();
        }

        $scope.calendar = {
            //set random bg color
            //text color defaults to black
            'backgroundColor': bgColor,
            'foregroundColor': '#000'
        };

        if($rootScope.currentCalendar){
            angular.copy($rootScope.currentCalendar, $scope.calendar);
        }

        //render calendars after login
        $rootScope.$on('login', function(){
            loadCalendarList();
        });

        //load calendars
        function loadCalendarList() {
            //request calendars from the server
            var promise = CalendarList.list({
                'access_token': $rootScope.dataCache.access_token
            });

            //after they've loaded
            promise.$then(function () {
                //save the in the root scope
                $rootScope.dataCache.calendars = promise.items;

                //sort them by owner
                sortCalendars($rootScope.dataCache.calendars);
            });
        }

        //sort calendars by access role
        function sortCalendars(calendars) {
            angular.forEach(calendars, function (value, key) {
                //personal calendars
                if (calendars[key].accessRole === 'owner') {
                    $rootScope.dataCache.calendarList[0].calendars.push(calendars[key]);
                }

                //subscribed calendars
                if (calendars[key].accessRole === 'reader') {
                    $rootScope.dataCache.calendarList[1].calendars.push(calendars[key]);
                }
            });
        }


        //save a new calendar
        $scope.createCalendar = function(){
            //insert new calendar
            var promise = Calendars.insert({
                'summary': $scope.calendar.summary,
                'description': $scope.calendar.description,
                'location': $scope.calendar.location,
                'timeZone': $scope.calendar.timeZone
            });

            //callback
            promise.$then(function(){

            });
        };

        //save calendar settings
        $scope.saveCalendar = function(){
            angular.copy($scope.calendar, $rootScope.currentCalendar);

            //update calendar meta
            var promise = Calendars.update({
                'calendarId': $scope.calendar.id,
                'summary': $scope.calendar.summary,
                'description': $scope.calendar.description,
                'location': $scope.calendar.location,
                'timeZone': $scope.calendar.timeZone
            });

            //callback
            promise.$then(function(){
                $scope.resetCalendar();
            });
        };

        //set current calendar
        $scope.setCalendar = function(){
            $rootScope.currentCalendar = this.calendar;
        };

        //reset current calendar settings
        $scope.resetCalendar = function(){
            angular.copy($rootScope.currentCalendar, $scope.calendar);

            //redirect to the homepage
            $location.path('/');
        };

        //delete calendar
        $scope.deleteCalendar = function(){
            //make sure the user knows what he's doing
            if(confirm('Are you sure you want to delete this calendar ?')){
                //remove the current calendar from the array
                $rootScope.dataCache.calendarList[0].calendars.splice(this.$index, 1);

                //send a request to teh server to delete the calendar
                Calendars.delete({
                    'calendarId': this.calendar.id
                });
            }
        };

        //unsubscribe from calendar
        $scope.unsubscribe = function(){
            //make sure the user knows what he's doing
            if(confirm('Are you sure you want to unsubscribe from "' + this.calendar.summary + '" ?')){
            }
        };
    });

    /******************************************************************/
    /* Settings */
    saturnApp.controller('SettingsController', function ($scope, $rootScope) {});

    /******************************************************************/
        //User
    saturnApp.controller('UserController', function ($scope, $rootScope, $location, $http) {
        //login
        $scope.login = function(){
            //make a post to the sever with the user credentials
            $http.post('/login', {
                'user': $scope.loginData.user,
                'password': $scope.loginData.password
            }).success(function(data, status, headers, config){
                //set google auth key
                gapi.client.setApiKey(data.apiKey);

                window.setTimeout(function(){
                    gapi.auth.authorize({
                        'client_id': data.clientId,
                        'scope': data.scopes,
                        'response_type': 'token',
                        'immediate': false,
                        'login_hint': data.login_hint,
                        'approval_prompt': 'force'
                    }, handleAuthResult);
                }, 200);
            }).error(function(data, status, headers, config){
            });
        };

        //called after the user has logged in
        function handleAuthResult (response) {
            if (response && !response.error) {
                //notify everyone that the user has logged in
                $rootScope.$broadcast('login');

                //save a copy of the access token for later use
                $rootScope.dataCache.access_token = response.access_token;

                //set the user as logged in
                $rootScope.user.authorised = true;

                //redirect to the home page
                $location.path('/');

                //get user data
                $scope.getUserData();
            }
        }

        //logout
        $scope.logout = function () {
            //set the user as logged in
            $rootScope.user.authorised = false;

            //redirect to the login page
            $location.path('/login');

            //application setup
            $rootScope.setup();

            //notify everyone that the user has logged out
            $rootScope.$broadcast('logout');
        };

        //get user data
        $scope.getUserData = function(){
            safeApply($scope, function(){
                //makea request to google apps and get user data
                $http({
                    'method': 'GET',
                    'url': 'https://www.googleapis.com/oauth2/v3/userinfo',
                    'params': {
                        'access_token': $rootScope.dataCache.access_token
                    }
                }).success(function(data, status, headers, config){
                    //update user data
                    $rootScope.user.firstName = data.given_name;
                    $rootScope.user.lastName = data.family_name;
                    $rootScope.user.email = data.email;
                    $rootScope.user.gender = data.gender;
                    $rootScope.user.picture = data.picture;
                });
            });
        };
    });
})(jQuery);