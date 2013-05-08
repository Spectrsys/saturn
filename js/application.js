$('body').tooltip({
    selector: "*[data-toggle=tooltip]"
});

//safe apply
function safeApply(scope, fn) {
    var phase = scope.$root.$$phase;
    if(phase == '$apply' || phase == '$digest')
        scope.$eval(fn);
    else
        scope.$apply(fn);
}

var saturnApp = angular.module('saturnApp', ['ui', 'ui.bootstrap']);

saturnApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/', {templateUrl: 'partials/index.html', controller: 'EventController'}).
        when('/settings', {templateUrl: 'partials/settings.html', controller: 'SettingsController'}).
        otherwise({redirectTo: '/'});
    }]);

saturnApp.controller('EventController', function($scope, $rootScope, $filter){
    //get events from google calendar
    $scope.googleCalendarEvents = {
        url : "http://www.google.com/calendar/feeds/usa__en%40holiday.calendar.google.com/public/basic"
    };

    //get events from a JSON file
    $scope.JSONEvents = {
        url : "/data/events/1.json"
    };

    $scope.events = [];

    $scope.eventSources = [$scope.events, $scope.JSONEvents, $scope.googleCalendarEvents];

    $scope.action = 'Add';

    $scope.resetEventDetails = function(start, end){
        var date = new Date(),
            d = date.getDate(),
            m = date.getMonth(),
            y = date.getFullYear(),
            H = date.getHours(),
            M  = date.getMinutes();

        switch (true) {
            case (M < 15):
                M = 15;

                break;

            case (M < 30):
                M = 30;

                break;

            case (M < 45):
                M = 45;

                break;

            case (M < 60):
                M = 60;

                break;
        }

        var startDate = start ? start : new Date(y, m, d, H, M),
            endDate = end ? end : new Date(y, m, d, H + 1, M);

        $scope.currentEvent = {
            'title': 'New Event',
            'location': '',
            'description': '',
            'start': startDate,
            'end': endDate,
            'startTime': $filter('date')(startDate, 'shortTime'),
            'endTime': $filter('date')(endDate, 'shortTime'),
            'timezone': '',
            'allDay': false,
            'recurring': false,
            'recurrenceEnd': null,
            'frequency': 0,
            'interval': 0,
            'repeatDays': {
                'sunday': false,
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': false,
                'friday': false,
                'saturday': false
            } ,
            'availability': 1,
            'color': '#99ccff',
            'textColor': '#333'
        };
    }

    $scope.resetEventDetails();

    /*******************************************************/
    //called after the user has selected something in the calendar
    $scope.select = function(startDate, endDate, allDay, jsEvent, view){
        $scope.$apply(function(){
            $scope.resetEventDetails(startDate, endDate, allDay, jsEvent, view);
        });
    };

    //when you click on an event
    $scope.eventClick = function(event, jsEvent, view){
        if(event.editable) {
            $scope.$apply(function(){
                $scope.currentEvent = event;
            });
        }

        if(event.url) {
            window.open(event.url, 'eventPreview', 'width=400, height=400');
        }

        return false;
    };

    //after you drag and drop an event
    $scope.eventDrop = function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view){

    }

    //after you resize an event
    $scope.eventResize = function( event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ) {

    }

    //save new event
    $scope.save = function(){
    }

    //got to a new date
    $scope.$watch('currentDate', function() {
        if($scope.currentDate != undefined){
            //go to the specified date
            $scope.calendar.fullCalendar('gotoDate', $scope.currentDate);
        }
    });

    /*******************************************************/
    //calendar configuration
    $scope.extendedCalendar = {
        header:{
            left: 'month agendaWeek agendaDay',
            center: 'title',
            right: 'today prev,next'
        },
        editable:  true,
        selectable: true,
        slotMinutes: 15,
        eventClick: $scope.eventClick,
        eventDrop: $scope.eventDrop,
        eventResize: $scope.eventResize,
        eventRender: function(event, element, view){
            var content = '';

            content += '<div class="event-dates"><i class="icon-calendar"></i> ' + $filter('date')(event.start, 'dd/MM/yyyy') + ', ';
            content +=  $filter('date')(event.start, 'shortTime');
            if(event.end){
                content += ' - ' + $filter('date')(event.end, 'dd/MM/yyyy') + ', ';
                content += $filter('date')(event.start, 'shortTime');
            }
            content += '</div>';

            if(event.description) {
                content += '<p class="event-description">' + event.description + '</p>';
            }

            if(event.location) {
                content += '<div class="event-location">' + event.location + '</div>';
            }

            element.popover({
                'title': event.title,
                'content': content,
                'html': true,
                'trigger': 'hover',
                'placement': 'top',
                'delay': 200
            });
        },
        select: $scope.select,
        unselect: $scope.unselect
    };

    $scope.miniCalendar = {
        header:{
            left: '',
            center: 'title',
            right: 'today prev,next'
        },
        editable:  false,
        selectable: false,
        columnFormat: {
            day: 'D'
        },
        eventRender: function(){
            return false;
        },
        dayClick: function(date, allDay, jsEvent, view){
            $scope.$apply(function(){
                $scope.currentDate = date;
            });
        }
    };
});

saturnApp.controller('SettingsController', function($scope, $rootScope, $http, $location){
    $scope.save = function(){
        $.extend(true, $rootScope.settings, $scope.settings);

        $http({
            'method': 'POST',
            'url': '',
            'data': $scope.settings
        }).success(function(data, status, headers, config){
            $location.path('/');
        });
    };
});