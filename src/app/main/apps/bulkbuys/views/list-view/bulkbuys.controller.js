(function ()
{
    'use strict';

    angular
        .module('app.bulkbuys')
        .controller('BulkbuysController', BulkbuysController);

    /** @ngInject */
    function BulkbuysController($state, $scope, $mdDialog, $document, bulkbuyService, customers, beers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.bulkbuyGridOptions = bulkbuyService.gridOptions('vm.bulkbuys', customers, beers);
        }

    }
})();