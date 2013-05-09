angular.module('ui.directives').directive('colorPicker', function() {
    return {
        scope: {
            color: '=colorPicker'
        },
        link: function(scope, element, attrs) {
            element.colorPicker({
                // initialize the color to the color on the scope
                pickerDefault: scope.color,
                // update the scope whenever we pick a new color
                onColorChange: function(id, newValue) {
                    scope.$apply(function() {
                        scope.color = newValue;
                    });
                    // there is a currently a bug in Angular where you have to
                    // call $apply() twice if you're setting an attribute on
                    // an isolate scope property bound with =
                    // (in our case, '=colorPicker')
                    //
                    // See https://github.com/angular/angular.js/issues/1276
                    scope.$apply();
                }
            });

            // update the color picker whenever the value on the scope changes
            scope.$watch('color', function(value) {
                element.val(value);
                element.change();
            });
        }
    }
});