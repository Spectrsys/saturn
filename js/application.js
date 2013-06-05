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
        ]).run(function ($rootScope, $location, $httpBackend, Data) {
            // register listener to watch route changes
            $rootScope.$on("$routeChangeStart", function (event, next, current) {
                if (Data.user.authorised === false) {
                    // no logged user, we should be going to #login
                    if (next.templateUrl !== "partials/login.html") {
                        $location.path("/login");
                    }
                }

                if (Data.user.authorised === true) {
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
    //Data storage
    //will be used for communication between controllers
    saturnApp.factory('Data', function () {
        return {
            'baseURL': 'https://www.googleapis.com/calendar/v3',
            'user': {
                'firstName': 'User',
                'authorised': false
            },
            'calendars': [],
            'calendarList': [{
                'title': 'My calendars',
                'calendars': []
            }, {
                'title': 'Subscribed calendars',
                'calendars': []
            }],
            'eventTokens': [],
            'tempCalendar': {},
            'events': []
        };
    });

    /******************************************************************/
    //ACL
    saturnApp.factory('ACL', function ($resource, Data) {
        return $resource(
            Data.baseURL + '/calendars/:calendarId/acl/:ruleId', {
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
            Data.baseURL + '/users/:user/calendarList/:calendarId', {
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
            Data.baseURL + '/calendars/:calendarId', {
                'calendarId': '@calendarId',
                'key': '@key'
            }, {
                'clear': {
                    'method': 'POST',
                    'url': Data.baseURL + '/calendars/:calendarId/clear'
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
            Data.baseURL, {
                'get': {
                    'method': 'GET',
                    'url': Data.baseURL + '/colors'
                }
            });
    });

    //Events
    saturnApp.factory('Events', function ($resource, Data) {
        return $resource(
            Data.baseURL, {
                'calendarId': '@calendarId',
                'eventId': '@eventId',
                'access_token': '@access_token'
            }, {
                'delete': {
                    'method': 'DELETE',
                    'url': Data.baseURL + '/calendars/:calendarId/events/:eventId'
                },
                'get': {
                    'method': 'GET',
                    'url': Data.baseURL + '/calendars/:calendarId/events/:eventId'
                },
                'import': {
                    'method': 'POST',
                    'url': Data.baseURL + '/calendars/:calendarId/events/import'
                },
                'insert': {
                    'method': 'POST',
                    'url': Data.baseURL + '/calendars/:calendarId/events'
                },
                'instances': {
                    'method': 'GET',
                    'url': Data.baseURL + '/calendars/:calendarId/events/:eventId/instances'
                },
                'list': {
                    'method': 'GET',
                    'url': Data.baseURL + '/calendars/:calendarId/events'
                },
                'move': {
                    'method': 'POST',
                    'URL': Data.baseURL + '/calendars/:calendarId/events/:eventId/move'
                },
                'quickAdd': {
                    'method': 'POST',
                    'url': Data.baseURL + '/calendars/:calendarId/events/quickAdd'
                },
                'update': {
                    'method': 'POST',
                    'url': Data.baseURL + '/calendars/:calendarId/events/:eventId'
                },
                'patch': {
                    'method': 'PATCH',
                    'url': Data.baseURL + '/calendars/:calendarId/events/:eventId'
                }
            });
    });

    //Colors
    saturnApp.factory('Freebusy', function ($resource, Data) {
        return $resource(
            Data.baseURL, {
                'query': {
                    'method': 'POST',
                    'url': Data.baseURL + '/freeBusy'
                }
            });
    });

    //Settings
    saturnApp.factory('Settings', function ($resource, Data) {
        return $resource(
            Data.baseURL, {
                'userId': '@userId',
                'setting': '@setting'
            }, {
                'get': {
                    'method': 'GET',
                    'url': Data.baseURL + '/users/:userId/settings/:setting'
                },
                'list': {
                    'method': 'GET',
                    'url': Data.baseURL + '/users/:userId/settings'
                }
            });
    });

    /******************************************************************/
    /* Events */
    saturnApp.controller('EventController', function ($scope, $filter, $location, Events, Data) {
        $scope.data = Data;

        var events = [],
            eventsCache = [],
            i = 0;

        $scope.events =  function(start, end, callback) {
            $scope.fetchEvents($scope.data.calendars, start, end, function(){
                callback(events);
            });
        };

        $scope.fetchEvents = function(sources, start, end, callback){
            if(sources.length === 0){
                return;
            }

            if(sources.length === i){
                i = 0;
                callback(events);

                return;
            }

            start  = $filter('date')(start, 'yyyy-MM-ddTHH:mm:ssZ');
            end  = $filter('date')(end, 'yyyy-MM-ddTHH:mm:ssZ');

            if(typeof eventsCache[sources[i].id + start + end] !== 'undefined'){
                $scope.getCachedEvents(eventsCache[sources[i].id + start + end], function(){
                    i++;
                    $scope.fetchEvents(sources, start, end, callback);
                });
            } else {
                $scope.getEvents($scope.data.calendars, start, end, function(){
                    i++;
                    $scope.fetchEvents(sources, start, end, callback);
                });
            }
        };

        $scope.getCachedEvents = function(source, callback){
            events.push.apply(source);

            if(typeof  callback === 'function'){
                callback();
            }
        };

        $scope.getEvents = function(sources, start, end, callback){
            safeApply($scope, function(){
                var promise = Events.list({
                    'calendarId': sources[i].id,
                    'access_token': $.cookie('saturn_access_token'),
                    'timeMin': start,
                    'timeMax': end
                });

                promise.$then(function(){
                    if(promise.items && (promise.items.length > 0) && (eventsCache[sources[i].id + start + end] === undefined)){
                        events.push.apply(events, promise.items);
                        eventsCache[sources[i].id + start + end] = promise.items;
                    }

                    if(typeof  callback === 'function'){
                        callback();
                    }
                });
            });
        };

        $scope.eventSources = [$scope.events];


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
                    $scope.$broadcast('loading:Started');
                } else {
                    $scope.$broadcast('loading:Finished');
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
    saturnApp.controller('CalendarController', function ($scope, $location, CalendarList, Calendars, Data) {
        $scope.data = Data;

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

        if($scope.data.currentCalendar){
            angular.copy($scope.data.currentCalendar, $scope.calendar);
        }

        //render calendars after login
        $scope.$watch('data.user.authorised', function(newValue, oldValue){
            if(newValue === true && $scope.data.calendars.length === 0){
                loadCalendarList();
            }
        });

        //load calendars
        function loadCalendarList() {
            //request calendars from the server
            var promise = CalendarList.list({
                'access_token': $.cookie('saturn_access_token')
            });

            //after they've loaded
            promise.$then(function () {
                //save the in the root scope
                $scope.data.calendars = promise.items;

                //sort them by owner
                sortCalendars($scope.data.calendars);
            });
        }

        //sort calendars by access role
        function sortCalendars(calendars) {
            angular.forEach(calendars, function (value, key) {
                //personal calendars
                if (calendars[key].accessRole === 'owner') {
                    $scope.data.calendarList[0].calendars.push(calendars[key]);
                }

                //subscribed calendars
                if (calendars[key].accessRole === 'reader') {
                    $scope.data.calendarList[1].calendars.push(calendars[key]);
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
            angular.copy($scope.calendar, $scope.data.currentCalendar);

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
            $scope.data.currentCalendar = this.calendar;
        };

        //reset current calendar settings
        $scope.resetCalendar = function(){
            angular.copy($scope.data.currentCalendar, $scope.calendar);

            //redirect to the homepage
            $location.path('/');
        };

        //delete calendar
        $scope.deleteCalendar = function(){
            //make sure the user knows what he's doing
            if(confirm('Are you sure you want to delete this calendar ?')){
                //remove the current calendar from the array
                $scope.data.calendarList[0].calendars.splice(this.$index, 1);

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
    saturnApp.controller('SettingsController', function ($scope, Data) {
        $scope.data = Data;
    });

    /******************************************************************/
        //User
    saturnApp.controller('UserController', function ($scope, $location, $http, Data) {
        $scope.data = Data;

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
                //save a copy of the access token for later use
                $.cookie('saturn_access_token', response.access_token);

                //set the user as logged in
                $scope.data.user.authorised = true;

                //redirect to the home page
                $location.path('/');

                //get user data
                $scope.getUserData();
            }
        }

        //logout
        $scope.logout = function () {
            //destroy token cookie
            $.cookie('saturn_access_token', null);

            //set the user as logged out
            $scope.data.user.authorised = false;

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

        if($.cookie('saturn_access_token')){
            //set the user as logged in
            $scope.data.user.authorised = true;

            //redirect to the home page
            $location.path('/');

            //get user data
            $scope.getUserData();
        }
    });
})(jQuery);

(function($){
    //$ is protected
})(jQuery);