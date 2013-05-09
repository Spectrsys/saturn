$('body').tooltip({
    selector: "a[data-toggle=tooltip]"
});

var saturnApp = angular.module('saturnApp', ['ui', 'ui.bootstrap']).
    config(['$routeProvider', function($routeProvider) {
        $routeProvider.
            when('/', {templateUrl: 'partials/index.html', controller: EventController}).
            when('/add-event', {templateUrl: 'partials/details.html', controller: EventController}).
            when('/edit-event/:eventId', {templateUrl: 'partials/details.html', controller: EventController}).
            when('/settings', {templateUrl: 'partials/settings.html', controller: SettingsController}).
            otherwise({redirectTo: '/'});
    }]);

saturnApp.factory('Events', function($http){
    var factory = {};

    //get events
    factory.getEvents = function(){
    }

    return factory;
});


function EventController($scope, $rootScope, $location, Events) {
    var date = new Date(),
        d = date.getDate(),
        m = date.getMonth(),
        y = date.getFullYear();

    //get events from google calendar
    $scope.googleCalendarEvents = {
        url : "http://www.google.com/calendar/feeds/usa__en%40holiday.calendar.google.com/public/basic"
    };

    //get events from a JSON file
    $scope.JSONEvents = {
        url : "http://saturn.dev/data/events/1.json"
    };

    $scope.events = [];

    $scope.eventSources = [$scope.JSONEvents, $scope.googleCalendarEvents];

    //add a new event
    $scope.addEvent = function() {
        $scope.events.push($scope.currentEvent);
    }

    //remove an event
    $scope.remove = function(index) {
        $scope.events.splice(index, 1);
    }

    //when you click on an event
    $scope.eventClick = function(event, jsEvent, view){
        if(event.editable) {
            $scope.$apply(function(){
                $location.path('/edit-event/' + event._id);
            });
        }

        return false;
    };

    $scope.addEventOnClick = function( date, allDay, jsEvent, view ){
        $scope.$apply(function(){
            $scope.alertMessage = ('Day Clicked ' + date);
        });
    };

    $scope.addOnDrop = function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view){
        $scope.$apply(function(){
            $scope.alertMessage = ('Event Droped to make dayDelta ' + dayDelta);
        });
    };

    $scope.addOnResize = function(event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ){
        $scope.$apply(function(){
            $scope.alertMessage = ('Event Resized to make dayDelta ' + minuteDelta);
        });
    };

    //will be called after the user finishes his selection
    $scope.select = function(startDate, endDate, allDay, jsEvent, view){
    };

    //will be called after the user unselects or before every new selection
    $scope.unselect = function(view, jsEvent){

    };

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
        dayClick: $scope.addEventOnClick,
        eventClick: $scope.eventClick,
        eventDrop: $scope.addOnDrop,
        eventResize: $scope.addOnResize,
        select: $scope.select,
        unselect: $scope.unselect,
        loading: function(isLoading, view){
            if(!isLoading) {
                $scope.extCal = $scope.calendar;
            }
        }
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
            console.log($scope);

            $scope.extCal.fullCalendar('changeView', 'agendaDay')
                .fullCalendar('gotoDate', date.getFullYear(), date.getMonth(), date.getDate());
        },
        loading: function(isLoading, view){
            if(!isLoading) {
                $scope.minCal = $scope.calendar;
            }
        }
    };
}

function QuickEventController($scope, $location, $http){

}

function SettingsController($scope, $location, $http){

}