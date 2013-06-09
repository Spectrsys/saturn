angular.module('ui.directives').directive('feedback', function($timeout) {
    var hideMessage;

    return {
        restrict: 'C',
        link: function(scope, element, attrs) {
            element.hide();

            var feedback = element.find('div.feedback-content > div');

            //show messages
            scope.$on('feedback:start', function(event, args){
                args = args || {};
                args.type = args.type || 'alert';
                args.message = args.message || '';

                element.show();

                feedback.removeClass().addClass(args.type).text(args.message);
            });

            //hide messages
            scope.$on('feedback:stop', function(event, args){
                args = args || {};
                args.type = args.type || 'alert';
                args.message = args.message || '';

                element.hide();

                feedback.removeClass().addClass(args.type).text(args.message);
            });
        }
    }
});