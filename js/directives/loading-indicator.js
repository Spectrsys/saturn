angular.module('ui.directives').directive('loadingIndicator', function($timeout) {
    var states = ['', '.', '..', '...'],
        statesTimer,
        i = 0;

    return {
        restrict: 'C',
        link: function(scope, element, attrs) {
            element.hide();

            scope.$on('loading:Started', function(){
                element.show();

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

            scope.$on('loading:Finished', function(){
                element.hide();

                if(statesTimer){
                    clearInterval(statesTimer);
                }

                element.text('Loading');
            });
        }
    }
});