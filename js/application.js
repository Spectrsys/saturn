$('body').tooltip({
    selector: "a[data-toggle=tooltip]"
});

function colspan(){
    if($(window).width() > 1400) {
        $('#sidebar, #sidebar-2').addClass('span2').removeClass('span3');
        $('#content').addClass('span8').removeClass('span6');
    } else {
        $('#sidebar, #sidebar-2').addClass('span3').removeClass('span2');
        $('#content').addClass('span6').removeClass('span8');
    }
}

$(window).resize(function(){
    colspan();
});

colspan();

/******************************************************************/
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
    }
]);


var userConfig = {
    'clientId': '512508236814-d35qanajio78edinfs3sekn56g8ia07l.apps.googleusercontent.com',
    'apiKey': 'Onhyzb0B8l1VltUAjcslrLbk',
    'scopes': 'https://www.googleapis.com/auth/calendar'
};

saturnApp.controller('UserController', function(){
    $scope.handleClientLoad = function(){
        alert(3);
    };

    $scope.checkAuth = function() {
        gapi.auth.authorize({client_id: userConfig.clientId, scope: userConfig.scopes, immediate: true}, $scope.handleAuthResult);
    };

    $scope.handleAuthResult = function(authResult) {
        if (authResult && !authResult.error) {
            this.makeApiCall();
        } else {
            authorizeButton.style.visibility = '';
            authorizeButton.onclick = this.handleAuthClick;
        }
    }
});

/******************************************************************/
/* Events */
saturnApp.controller('EventController', function($scope, $rootScope, $filter){
    //get events from google calendar
    $scope.googleCalendarEvents = {
        'url' : 'http://www.google.com/calendar/feeds/usa__en%40holiday.calendar.google.com/public/basic'
    };

    //get events from a JSON file
    $scope.JSONEvents = {
        'url' : '/data/events/1.json',
        'color': '#ff0000',
        'textColor': '#fff',
        'editable': true,
        'title': 'Events from JSON file',
        'state': true,
        'cache': true
    };

    $scope.JSONEvents2 = {
        'url' : '/data/events/2.json',
        'color': '#00ff00',
        'textColor': '#0000ff',
        'editable': false,
        'title': 'Events from JSON file number 2',
        'state': false,
        'cache': true
    };

    $scope.eventsCache = [$scope.JSONEvents, $scope.JSONEvents2, $scope.googleCalendarEvents];
    $scope.eventSources = $.grep([$scope.JSONEvents, $scope.JSONEvents2, $scope.googleCalendarEvents], function(arrayElement, index){
        return arrayElement.state === true;
    });

    $scope.resetEventDetails = function(start, end){
        $scope.action = 'Add';

        var date = new Date(),
            d = date.getDate(),
            m = date.getMonth(),
            y = date.getFullYear(),
            H = date.getHours(),
            M  = date.getMinutes();

        };
    }

    $scope.resetEventDetails();

    $scope.addRemoveEventSource = function(sources,source) {
        var canAdd = 0;
        angular.forEach(sources,function(value, key){
            if(sources[key] === source) {
                sources.splice(key,1)
                canAdd = 1;
            }
        });
        if(canAdd === 0){
            sources.push(source);
        }
    };

    $scope.removeEventSource = function(sources,index) {
        sources.splice(index,1);
    };

    /*******************************************************/
    //called after the user has selected something in the calendar
    $scope.select = function(startDate, endDate, allDay, jsEvent, view){
        $scope.$apply(function(){
            $scope.resetEventDetails(startDate, endDate, allDay, jsEvent, view);
        });
    };

    //when you click on an event
    $scope.eventClick = function(event, jsEvent, view){
        window.console.log(event);

        if(event.editable || event.source.editable) {
            $scope.$apply(function(){
                $scope.action = 'Edit';
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

    //remove an event
    $scope.remove = function(index){
        alert(2);
    }

    //got to a new date
    $scope.$watch('currentDate', function() {
        if($scope.currentDate != undefined){
            //go to the specified date
            $scope.calendar.fullCalendar('gotoDate', $scope.currentDate);
        }
    });


function EventController($scope, $rootScope, $location) {
	var date = new Date(),
		d = date.getDate(),
		m = date.getMonth(),
		y = date.getFullYear();

	//get events from google calendar
	$scope.eventSource = {
		url : "http://www.google.com/calendar/feeds/usa__en%40holiday.calendar.google.com/public/basic",
		className : 'gcal-event', // an option!
		currentTimezone : 'America/Chicago' // an option!
	};

	$scope.events = [];

	$scope.eventSources = [$scope.events, $scope.eventSource];

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
		$scope.$apply(function(){
			$location.path('/edit-event/' + event._id);
		});
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
        //update current event
        $rootScope.currentEvent = {
            'startDate': startDate,
            'endDate': endDate,
            'startTime': '',
            'endTime': '',
            'allDay': allDay
        };

		$scope.$apply(function(){
			//redirect to add event view
			$location.path('/add-event');
		});
	};

	//will be called after the user unselects or before every new selection
	$scope.unselect = function(view, jsEvent){

	};

	//calendar configuration
	$scope.uiConfig = {
		fullCalendar:{
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
			unselect: $scope.unselect
		}
	};
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
        viewDisplay: function(view){
            $scope.dateCache = $scope.calendar.fullCalendar('getDate');
        },
        loading: function(bool){
            if(!bool) {
                $scope.calendar.fullCalendar('gotoDate', $scope.dateCache);
            }
        },
        select: $scope.select,
        unselect: $scope.unselect
    };

}

/******************************************************************/
/* Settings */
saturnApp.controller('SettingsController', function($scope, $rootScope, $http, $location){
});
