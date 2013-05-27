(function($){
    $('body').tooltip({
        selector: "*[data-toggle=tooltip]"
    });
})(jQuery);

/******************************************************************/
//helper functions
function safeApply(scope, fn) {
    var phase = scope.$root.$$phase;
    if(phase === '$apply' || phase === '$digest')
        scope.$eval(fn);
    else
        scope.$apply(fn);
}

//calendar
$(document).on('click', 'div.mini-calendar tbody td', function(){
    $('div.mini-calendar tbody td').removeClass('on');
    $(this).addClass('on');
});

//update entity
function updateEntity(source, destination) {
    if(typeof source === typeof  destination) {
        angular.copy(source, destination);
    }
}

var userConfig = {
    'clientId': '512508236814-d35qanajio78edinfs3sekn56g8ia07l.apps.googleusercontent.com',
    'scopes': 'https://www.googleapis.com/auth/calendar'
};

//define applicaton
var saturnApp = angular.module('saturnApp', ['ui', 'ui.bootstrap', 'ngResource']);

saturnApp.config(['$routeProvider', function($routeProvider) {
        $routeProvider.
            when('/', {templateUrl: 'partials/index.html'}).
            when('/login', {templateUrl: 'partials/login.html'}).
            when('/settings/profile', {templateUrl: 'partials/settings-profile.html'}).
            when('/settings/account', {templateUrl: 'partials/settings-account.html'}).
            when('/calendar/:calendarId/settings', {templateUrl: 'partials/calendar-settings.html'}).
            when('/calendar/create', {templateUrl: 'partials/calendar-settings.html'}).
            otherwise({redirectTo: '/'});
    }
    ]).run(function($rootScope){
        $rootScope.config = {
            'baseURL': 'https://www.googleapis.com/calendar/v3',
            'collapsed': {
            }
        };

        $rootScope.dataCache = {
            'calendarList': [
                {
                    'title': 'My calendars',
                    'calendars': []
                },
                {
                    'title': 'Subscribed calendars',
                    'calendars': []
                }
            ],
            'eventTokens': [],
            'currentCalendar':{},
            'tempCalendar': {},
            'events': []
        };

        $rootScope.user = {
            'loggedIn': false
        };

        $rootScope.logout = function(){
            $rootScope.user.loggedIn = false;
        }
    });

/******************************************************************/
saturnApp.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
});

/******************************************************************/
//ACL
saturnApp.factory('ACL', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL + '/calendars/:calendarId/acl/:ruleId',
        {
            'calendarId': '@calendarId',
            'ruleId': '@ruleId'
        },
        {
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
        }
    );
});

//Calendar List
saturnApp.factory('CalendarList', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL + '/users/:user/calendarList/:calendarId',
        {
            'user': 'me',
            'calendarId': '@calendarId'
        },
        {
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
        }
    );
});

//Calendars
saturnApp.factory('Calendars', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL + '/calendars/:calendarId',
        {
            'calendarId': '@calendarId'
        },
        {
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
            }
        }
    );
});

//Colors
saturnApp.factory('Colors', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'get': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/colors'
            }
        }
    );
});

//Events
saturnApp.factory('Events', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'calendarId': '@calendarId',
            'eventId': '@eventId',
            'access_token': '@access_token'
        },
        {
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
        }
    );
});

//Colors
saturnApp.factory('Freebusy', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'query': {
                'method': 'POST',
                'url': $rootScope.config.baseURL + '/freeBusy'
            }
        }
    );
});

//Settings
saturnApp.factory('Settings', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'userId' : '@userId',
            'setting': '@setting'
        },
        {
            'get': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/users/:userId/settings/:setting'
            },
            'list': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/users/:userId/settings'
            }
        }
    );
});

/******************************************************************/
/* Events */
saturnApp.controller('EventController', function($scope, $rootScope, $filter, $location, Events, Calendars){
    $scope.eventSources = $rootScope.dataCache.events;

    //master calendar
    $scope.masterCalendar = {
        header:{
            left: 'month agendaWeek agendaDay',
            center: 'title',
            right: 'today prev,next'
        },
        allDayDefault: false,
        selectable: true,
        defaultView: 'agendaWeek',
        slotMinutes: 15,
        eventClick: $scope.eventClick,
        viewDisplay: function(view){
        },
        loading: function(bool){
            if(!bool) {
                $rootScope.$broadcast('loading:Started');
                $scope.calendar.fullCalendar('gotoDate', $scope.dateCache);
            } else {
                $rootScope.$broadcast('loading:Finished');
            }
        },
        select: $scope.select,
        unselect: $scope.unselect
    };

    //mini calendar
    $scope.miniCalendar = {
        header:{
            left: '',
            center: 'title',
            right: 'today prev,next'
        },
        editable: false,
        selectable: false,
        columnFormat: {
            day: 'D'
        },
        eventRender: function(){
            return false;
        },
        dayClick: function(date, allDay, jsEvent, view){
        }
    };
});

/******************************************************************/
/* Settings */
saturnApp.controller('SettingsController', function($scope, $rootScope){
});

//User
saturnApp.controller('UserController', function($scope, $rootScope, CalendarList){
    $scope.checkAuth = function(){
        gapi.auth.authorize({
            'client_id': userConfig.clientId,
            'scope': userConfig.scopes,
            'immediate': false
        }, authCallback);
    };

    function authCallback(response){
        if(response && !response.error) {
            //notify everyone that we're loading some data
            $rootScope.$broadcast('loading:Started');

            $rootScope.user.loggedIn = true;

            safeApply($rootScope, function(){
                $rootScope.dataCache.access_token = response.access_token;

                var promise = CalendarList.list({
                    'access_token': $rootScope.dataCache.access_token
                });

                promise.$then(function(){
                    sortCalendars(promise.items, function(){
                        $rootScope.$broadcast('calendar:CalendarListLoaded');
                    });
                });
            });
        }
    }

    //sort calendars by access role
    function sortCalendars(calendars, callback){
        angular.forEach(calendars, function(value, key){
            //personal calendars
            if(calendars[key].accessRole === 'owner'){
                $rootScope.dataCache.calendarList[0].calendars.push(calendars[key]);
            }

            //subscribed calendars
            if(calendars[key].accessRole === 'reader'){
                $rootScope.dataCache.calendarList[1].calendars.push(calendars[key]);
            }
        });

        if(callback && typeof callback === 'function'){
            callback();
        }
    }
});
