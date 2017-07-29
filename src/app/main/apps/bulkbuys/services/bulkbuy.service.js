(function () {
    'use strict';

    angular
        .module('app.bulkbuys')
        .factory('bulkbuyService', bulkbuyService);

    /** @ngInject */
    function bulkbuyService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance,
            customerList,
            statusList,
            chargesList,
            formData;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveBulkbuy: saveBulkbuy,
            updateBulkbuy: updateBulkbuy,
            fetchBulkbuyList: fetchBulkbuyList,
            bulkbuyForm: bulkbuyForm
        };

        var quantityList = [{
            id: 0,
            quantity: 6
        }, {
            id: 1,
            quantity: 10
        }, {
            id: 2,
            quantity: 20
        }];
        return service;

        //////////

        function bulkbuyForm(customerList, beerList) {
            var bulkbuyForm = {
                colCount: 2,
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    dataField: 'date',
                    label: {
                        text: 'Date'
                    },
                    editorType: 'dxDateBox',
                    editorOptions: {
                         onInitialized: function(e) {
                            e.component.option('value', new Date());
                        }
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Date is required'
                    }]
                }, {
                    dataField: 'invoice',
                    caption: 'Invoice',
                    dataType: 'string',
                    validationRules: [{
                        type: 'required',
                        message: 'Invoice number is required'
                    }]
                }, {
                    dataField: 'customerSelected',
                    label: {
                        text: 'Customer'
                    },
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: customerList,
                        displayExpr: "name",
                        valueExpr: "$id",
                        searchExpr: ["name", "phone", "email"],
                        itemTemplate: function (itemData, itemIndex, itemElement) {
                            var rightBlock = $("<div style='display:inline-block;'>");
                            rightBlock.append("<p style='font-size:larger;'><b>" + itemData.name + "</b></p>");
                            rightBlock.append("<p>Phone: <span>" + itemData.phone + "</span></p>");
                            rightBlock.append("<p>Email ID: <span>" + itemData.email ? itemData.email : '' + "</span></p>");
                            itemElement.append(rightBlock);
                        }
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a customer'
                    }]
                }, {
                    dataField: "quantity",
                    label: {
                        text: "Units (0.5 Ltrs per unit)"
                    },
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: quantityList,
                        displayExpr: "quantity",
                        valueExpr: "id"
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a quantity'
                    }]
                }]
            };
            return bulkbuyForm;
        }
        /**
         * Grid Options for bulkbuy list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource, customers, beers) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchBulkbuyList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (bulkbuyObj) {
                            //var data = formInstance.option('formData');
                            saveBulkbuy(bulkbuyObj);
                        },
                        update: function (key, bulkbuyObj) {
                            updateBulkbuy(key, bulkbuyObj);
                        },
                        remove: function (key) {
                            deleteBulkbuy(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: true,
                        mode: 'form',
                        form: bulkbuyForm()
                    },
                    columns: config.bulkbuyGridCols(tenantId, customers, beers),
                    export: {
                        enabled: true,
                        fileName: 'Bulkbuys',
                        allowExportSelectedData: true
                    },
                    onRowRemoving: function(e) {
                        var d = $.Deferred();
                        
                        if (quantityList[e.data.quantity].quantity > e.data.balancedQuantity) {
                            d.reject("Can not delete the record");
                        } else {
                            d.resolve();
                        }
                        e.cancel = d.promise();
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Bulkbuy Form data
         */
        function saveBulkbuy(bulkbuyObj) {
            var ref = rootRef.child('tenant-bulkbuys').child(tenantId);
             if(!bulkbuyObj.date) {
                bulkbuyObj.date = new Date();
            }
            bulkbuyObj.date = bulkbuyObj.date.toString();
            bulkbuyObj.balancedQuantity = quantityList[bulkbuyObj.quantity].quantity;
            firebaseUtils.addData(ref, bulkbuyObj).then(function(key) {
                var mergeObj = {};
                mergeObj['tenant-customer-bulkbuy-records/'+ tenantId + '/' + bulkbuyObj.customerSelected + '/records/' + key] = bulkbuyObj;
                firebaseUtils.updateData(rootRef, mergeObj).then(function(key) {
                    var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(bulkbuyObj.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                    firebaseUtils.getListSum(ref, 'balancedQuantity').then(function (data) {
                        var mergeObj = {};
                        mergeObj['tenant-customer-bulkbuy-records/'+ tenantId + '/' + bulkbuyObj.customerSelected + '/balancedQuantity'] = data;
                        firebaseUtils.updateData(rootRef, mergeObj);
                    });
                });
            });
            //updateKegQuantity();
        }

        function updateKegQuantity() {
            fetchBulkbuyList().then(function (data) {
                data.forEach(function (bulkbuy) {
                    var ref = rootRef.child('tenant-kegs').child(tenantId).orderByChild('beerSelected').equalTo(bulkbuy.beerSelected);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        updateDb(data, quantityList[bulkbuy.quantity].quantity);
                    });
                });
            });

        }


        function hasMin(data, attrib) {
            return data.reduce(function (prev, curr) {
                return prev[attrib] < curr[attrib] ? prev : curr;
            });
        }
        function updateDb(data, quantity) {
            var smallestBrew = hasMin(data, 'LtrsBalanced');
            var ref = rootRef.child('tenant-kegs').child(tenantId).child(smallestBrew['$id']);
            if (smallestBrew.LtrsBalanced < quantity) {
                firebaseUtils.updateData(ref, { 'LtrsBalanced': 0 });
                var index = getIndexByArray(data, 'LtrsBalanced', smallestBrew.LtrsBalanced);
                data.splice(index, 1);
                updateDb(data, quantity - smallestBrew.LtrsBalanced);
            } else {
                var balance = smallestBrew.LtrsBalanced - quantity;
                firebaseUtils.updateData(ref, { 'LtrsBalanced': balance });
            }

        }

        function getIndexByArray(data, key, value) {
            for (var i = 0; i < data.length; i++) {
                if (data[i][key] == value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * Fetch bulkbuy list
         * @returns {Object} Bulkbuy data
         */
        function fetchBulkbuyList() {
            var ref = rootRef.child('tenant-bulkbuys').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch bulkbuy list
         * @returns {Object} Bulkbuy data
         */
        function updateBulkbuy(key, bulkbuyData) {
            var mergeObj = {};
            mergeObj['tenant-bulkbuys/'+ tenantId + '/' + key['$id']] = bulkbuyData;
            mergeObj['tenant-customer-bulkbuy-records/'+ tenantId + '/' + bulkbuyData.customerSelected + '/records/' + key['$id']] = bulkbuyData;
            firebaseUtils.updateData(rootRef, mergeObj).then(function(key) {
                var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(bulkbuyData.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                firebaseUtils.getListSum(ref, 'balancedQuantity').then(function (data) {
                    var mergeObj = {};
                    mergeObj['tenant-customer-bulkbuy-records/'+ tenantId + '/' + bulkbuyData.customerSelected + '/balancedQuantity'] = data;
                     firebaseUtils.updateData(rootRef, mergeObj);
                });
            });
            //updateKegQuantity();
        }

        /**
         * Delete Bulkbuy
         * @returns {Object} bulkbuy data
         */
        function deleteBulkbuy(key) {
            var mergeObj = {};
            mergeObj['tenant-bulkbuys/'+ tenantId + '/' + key['$id'] + '/deactivated'] = false;
            mergeObj['tenant-customer-bulkbuy-records/'+ tenantId + '/' + key.customerSelected + '/records/' + key['$id'] + '/deactivated'] = false;
            //mergeObj['tenant-bulkbuy-records-deactivated/'+ tenantId + '/' + key['$id']] = key;
            firebaseUtils.updateData(rootRef, mergeObj).then(function(){
                var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(bulkbuyData.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                firebaseUtils.getListSum(ref, 'balancedQuantity').then(function (data) {
                    var mergeObj = {};
                    mergeObj['tenant-customer-bulkbuy-records/'+ tenantId + '/' + bulkbuyData.customerSelected + '/balancedQuantity'] = data;
                     firebaseUtils.updateData(rootRef, mergeObj);
                });
            });
            //updateKegQuantity();
        }

    }
}());