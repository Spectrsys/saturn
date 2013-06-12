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
                    'apiKey': 'AIzaSyCFj15TpkchL4OUhLD1Q2zgxQnMb7v3XaM',
                    'clientId': '314009841930-iq278jutp1hfh159a2eg9pippfg4j581.apps.googleusercontent.com',
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
    saturnApp.controller('EventController', function ($scope, $rootScope, $filter, $location, $timeout, Events, Data) {
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
                    var promise = Events.list({
                        'calendarId': sources[i].id,
                        'access_token': $.cookie('saturn_access_token'),
                        'timeMin': startTime,
                        'timeMax': endTime
                    });

                    promise.$then(function(){
                        sources[i].dateRange.push(timestamp);

                        sources[i].events.push.apply(sources[i].events, promise.items);

                        sources[i].events = $filter('unique')(sources[i].events);

                        fetching = false;

                        i++;

                        callback();

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

            //send the event to the server
            var promise = Events.insert({
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
            });

            promise.$then(function(){

            });

            //reset the current event
            $scope.setCurrentEvent();

            //go to homepage
            $location.path('/');
        };

        //update event
        $scope.updateEvent = function(){
            var d = new Date();

            safeApply($scope, function(){
                //let the user know events are saving
                $rootScope.$broadcast('feedback:start', {
                    'type': 'alert',
                    'message': 'Updating event ...'
                });

                $scope.data.currentEvent.updated = $.fullCalendar.formatDate(d, 'u');
                $scope.data.currentEvent.sequence++;

                //send data to the server
                var promise = Events.update({
                    'calendarId': $scope.data.currentEvent.source.id,
                    'eventId': $scope.data.currentEvent.id,
                    'start': {
                        'dateTime': $.fullCalendar.formatDate($scope.data.currentEvent.start, 'u')
                    },
                    'end': {
                        'dateTime': $.fullCalendar.formatDate($scope.data.currentEvent.start, 'u')
                    },
                    'summary': $scope.data.currentEvent.title,
                    'description': $scope.data.currentEvent.description,
                    'location': $scope.data.currentEvent.location,
                    'sequence': $scope.data.currentEvent.sequence
                });

                promise.$then(function(response){
                    //success
                    if(response.status === 200){
                        //show feedback
                        $rootScope.$broadcast('feedback:start', {
                            'type': 'alert alert-success',
                            'message': 'Event updated'
                        });
                    }
                    //error
                    else {
                        //show feedback
                        $rootScope.$broadcast('feedback:start', {
                            'type': 'alert alert-error',
                            'message': 'Failed to update event'
                        });
                    }

                    //hide feedback
                    $timeout(function(){
                        $rootScope.$broadcast('feedback:stop');

                        //go to homepage
                        $location.path('/');
                    }, 1000);
                });
            });
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
            $scope.data.currentEvent = event;

            $scope.updateEvent();
        };

        //after an event has been resized
        $scope.eventResize = function( event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ) {
            $scope.data.currentEvent = event;

            $scope.updateEvent();
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
                left: 'month agendaWeek agendaDay',
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

                if(eventData.end instanceof Date) {
                    endDate = eventData.end;
                } else if(eventData.end.date){
                    endDate = $.fullCalendar.parseDate(eventData.end.date);
                } else if(eventData.end.dateTime) {
                    endDate = $.fullCalendar.parseDate(eventData.end.dateTime);
                }

                if(endDate < d){
                    eventClass = 'past-event';
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
    });

    /******************************************************************/
    /* Calendars */
    saturnApp.controller('CalendarController', function ($scope, $rootScope, $location, $timeout, CalendarList, Calendars, Data) {
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
            var promise = CalendarList.list({
                'access_token': $.cookie('saturn_access_token')
            });

            //after they've loaded
            promise.$then(function () {
                //loop over calendars and add/chenge metadata
                angular.forEach(promise.items, function(value, key){
                    value.editable = (value.accessRole === 'owner' ? true : false);
                    value.events = [];
                    value.color = value.borderColor = value.backgroundColor;
                    value.textColor = value.foregroundColor;
                    value.dateRange = [];

                    //push new calendar into stack
                    $scope.data.calendars.push(value);
                });
                $scope.$emit('calendarsLoaded');

                //notify everyone that calendars have loaded
                $rootScope.$broadcast('feedback:stop');
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
            var promise = Calendars.insert({
                'summary': $scope.calendar.summary,
                'description': $scope.calendar.description,
                'location': $scope.calendar.location,
                'timeZone': $scope.calendar.timeZone
            });

            //callback
            promise.$then(function(response){
                //save the calendat into a calendar list
                var calendarList = CalendarList.insert({
                    'id': response.data.id,
                    'kind': response.data.kind,
                    'etag': response.data.etag,
                    'hidden': false,
                    'selected': true,
                    'foregroundColor': $scope.calendar.foregroundColor,
                    'backgroundColor': $scope.calendar.backgroundColor,
                    'defaultReminders': [{
                        "method": 'email',
                        "minutes": 10
                    }]
                });

                calendarList.$then(function(response){
                    if(response.status === 200){
                        //feedback
                        $rootScope.$broadcast('feedback:start', {
                            'type': 'alert alert-success',
                            'message': 'Calendar successfully created'
                        });

                        $timeout(function(){
                            $rootScope.$broadcast('feedback:stop');
                        }, 1000);

                        //update color meta
                        response.data.color = response.data.backgroundColor;

                        //push the calendar to personal calendars array
                        $scope.data.calendars.push(response.data);
                    } else {
                        //feedback
                        $rootScope.$broadcast('feedback:start', {
                            'type': 'alert alert-errot',
                            'message': 'Calendar could not be saved. Try again.'
                        });

                        $timeout(function(){
                            $rootScope.$broadcast('feedback:stop');
                        }, 1000);
                    }
                });

                $scope.resetCalendar();

                //redirect to the homepage
                $location.path('/');
            });
            //redirect to the homepage
            //$location.path('/');
        };

        //save calendar settings
        $scope.saveCalendar = function(){
            $.extend($scope.data.currentCalendar, $scope.calendar);

            //hack to get calendar colors to behave ok
            $scope.data.currentCalendar.backgroundColor =  $scope.data.currentCalendar.color;
            $scope.data.currentCalendar.borderColor =  $scope.data.currentCalendar.color;

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
                $scope.calendar = null;
            });

            $location.path('/');

            $scope.calendar = null;
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
    saturnApp.controller('UserController', function ($scope, $rootScope, $location, $http, Data, Settings) {
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
                var promise = Settings.list({
                    'access_token': $.cookie('saturn_access_token')
                });

                promise.$then(function(){
                    //loop over all the settings
                    angular.forEach(promise.items, function(value, key){
                        $scope.data.settings[value.id] = value.value;
                    });
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
    });
})(jQuery);