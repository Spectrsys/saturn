var canAdd = 0,
    self = this;

angular.forEach($rootScope.dataCache.CalendarList,function(value, key){
    if($rootScope.dataCache.CalendarList[key] === self.id){
        $rootScope.eventSources.splice(key,1)
        canAdd = 1;
    }
});
if(canAdd === 0){
    $rootScope.eventSources.push(self.id);
}