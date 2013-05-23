angular.module('ui.directives').directive('loadingIndicator', function() {
    var states = ['', '.', '..', '...'],
        statesTimer,
        i = 0;

    return {
        restrict: 'C',
        link: function(scope, element, attrs) {
            element.hide();

            //loading star
            scope.$on('loading:Started', function(){
                element.show().removeClass('alert-error');

                if(statesTimer){
                    clearInterval(statesTimer);
                }

                statesTimer = setInterval(function(){
                    element.text('Loading' + states[i]);

                    i++;

                    if(i === states.length) {
                        i = 0;
                    }
                }, 1000);
            });

            //loading finished
            scope.$on('loading:Finished', function(){
                element.hide();

                if(statesTimer){
                    clearInterval(statesTimer);
                }

                element.text('Loading');
            });

            //loading error
            scope.$on('loading:Error', function(){
                element.show();

                if(statesTimer){
                    clearInterval(statesTimer);
                }

                element.addClass('alert-error');

                element.text('Error loading data');
            });

            //timeout
            scope.$on('loading:Timeout', function(){
                element.show();

                if(statesTimer){
                    clearInterval(statesTimer);
                }

                element.addClass('alert-error');

                element.text('Connection timed out');
            });
        }
    }
});