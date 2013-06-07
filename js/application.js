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
                    when('/event/create', {
                        templateUrl: 'partials/create-event.html'
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
                    'apiKey': 'AIzaSyC3K--D5YHRX9rz0hU4tkb6evngzEuk-34',
                    'clientId': '512508236814-d35qanajio78edinfs3sekn56g8ia07l.apps.googleusercontent.com',
                    'scopes': 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
                }];
            });

            $httpBackend.whenPOST('/logout').respond(function(method, url, data) {
            });

            //otherwise
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
                'country': 'US',
                'language': 'en',
                'timeZone': 'America/Mexico_City',
                'meetingLength': 15,
                'weekStart': '1',
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
                'calendarId': '@calendarId',
                'key': '@key'
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
                    'method': 'POST',
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
                'userId': '@userId',
                'setting': '@setting'
            }, {
                'get': {
                    'method': 'GET',
                    'url': Data.settings.baseURL + '/users/:userId/settings/:setting'
                },
                'list': {
                    'method': 'GET',
                    'url': Data.settings.baseURL + '/users/:userId/settings'
                }
            });
    });

    /******************************************************************/
    /* Events */
    saturnApp.controller('EventController', function ($scope, $filter, $location, Events, Data) {
        $scope.data = Data;

        //used for creating and editing events
        if(!$scope.data.event){
            $scope.data.event = {};
        }

        var i = 0;

        $scope.events =  function(start, end, callback) {
            i = 0;
            $scope.getEvents($scope.data.calendars, start, end, function(){
                callback();
            });
        };

        //get events
        $scope.getEvents = function(sources, start, end, callback){
            if(!sources.length){
                return;
            }

            if(i === sources.length){
                i = 0;
                return;
            }

            //get min and max time
            var min = start.getTime(),
                max = end.getTime(),

            //format the start and end dates to match google specs
                startTime  = $filter('date')(start, 'yyyy-MM-ddTHH:mm:ssZ'),
                endTime  = $filter('date')(end, 'yyyy-MM-ddTHH:mm:ssZ');

            //check if the current calendar is selected
            if(sources[i].selected === true){
                safeApply($scope, function(){
                    var promise = Events.list({
                        'calendarId': sources[i].id,
                        'access_token': $.cookie('saturn_access_token'),
                        'timeMin': startTime,
                        'timeMax': endTime
                    });

                    promise.$then(function(){
                        angular.forEach(promise.items, function(value, key){
                            value.title = value.title || value.summary;

                            if(value.start && value.start.date){
                                value.start = value.start.date;
                            }

                            if(value.start && value.start.dateTime){
                                value.start = value.start.dateTime;
                            }

                            if(value.end && value.end.date){
                                value.end = value.end.date;
                            }

                            if(value.end && value.end.dateTime){
                                value.end = value.end.dateTime;
                            }
                            sources[i].events.push(value);
                        });
                        i++;

                        //recall the get events function
                        $scope.getEvents(sources, start, end, callback);
                    });
                });
            } else {
                i++;

                //recall the get events function
                $scope.getEvents(sources, start, end, callback);
            }
        };

        //add new event
        $scope.addEvent = function(){

        };

        //after the user has clicked an event
        $scope.eventClick = function( event, jsEvent, view ){
            $scope.data.event = event;

            //if we can edit the event
            if(event.editable === true || event.source.editable === true){

                //go to the edit page
                $location.path('/event/edit/' + event.id);
            }
        };

        //after the user has selected a time period
        $scope.select = function(startDate, endDate, allDay, jsEvent, view){
            safeApply($scope, function(){
                //setup event meta
                $scope.data.event.startDate = startDate;
                $scope.data.event.endDate = endDate;
                $scope.data.event.allDay = allDay;

                //go to add event page
                $location.path('/event/create');
            });
        };


        //use stored sources for calendar events
        $scope.eventSources = [];

        //master calendar
        $scope.masterCalendarOptions = {
            header: {
                left: 'month agendaWeek agendaDay',
                center: 'title',
                right: 'today prev,next'
            },
            allDayDefault: false,
            selectable: true,
            defaultView: 'agendaWeek',
            slotMinutes: $scope.data.settings.meetingLength,
            eventClick: $scope.eventClick,
            viewDisplay: function (view) {
                $scope.getEvents($scope.data.calendars, view.start, view.end, function(){
                });
            },

            loading: function (bool) {
                if (!bool) {
                    $scope.$broadcast('loading:Started');
                } else {
                    $scope.$broadcast('loading:Finished');
                }
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
                //loop over calendars and add/chenge metadata
                angular.forEach(promise.items, function(value, key){
                    value.editable = (value.accessRole === 'owner' ? true : false);
                    value.events = [];
                    value.color = value.backgroundColor;
                    value.textColor = value.foregroundColor;
                    value.dateRange = [];

                    //push new calendar into stack
                    $scope.data.calendars.push(value);
                });
            });
        }


        //save a new calendar
        $scope.createCalendar = function(){
            //generate a random ID
            $scope.calendar.id = $scope.calendar.summary.replace(/\s+/gi, '_') + Math.random();

            //set the calendar to selected
            $scope.calendar.selected = true;

            //set the calendar as a personal one
            $scope.calendar.accessRole = 'owner';

            //push the calendar to personal calendars array
            $scope.data.calendars.push($scope.calendar);

            //insert new calendar
            var promise = Calendars.insert({
                'summary': $scope.calendar.summary,
                'description': $scope.calendar.description,
                'location': $scope.calendar.location,
                'timeZone': $scope.calendar.timeZone
            });

            //callback
            promise.$then(function(){
                $scope.resetCalendar();
            });
            //redirect to the homepage
            $location.path('/');
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
    });

    /******************************************************************/
    /* Settings */
    saturnApp.controller('SettingsController', function ($scope, Data) {
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
    });

    /******************************************************************/
        //User
    saturnApp.controller('UserController', function ($scope, $location, $http, Data) {
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
            //destroy stored cookie
            $.cookie('saturn_access_token', null, {'expires': -1});
            $.cookie('saturn_current_path', null, {'expires': -1});

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

        //if the user refreshes the page and is logged in
        if($.cookie('saturn_access_token')){
            //set the user as logged in
            $scope.data.user.authorised = true;

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
    });
})(jQuery);