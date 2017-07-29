(function () {
    'use strict';

    angular
        .module('app.bulkbuys.customers')
        .factory('BulkbuyCustomerService', customerService);

    /** @ngInject */
    function customerService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            formOptions: formOptions,
            saveCustomer: saveCustomer,
            updateCustomer: updateCustomer,
            deleteCustomer: deleteCustomer,
            fetchCustomerList: fetchCustomerList
        };

        return service;

        //////////

        /**
         * Return form Item Configuration
         * @returns {Object} Item configuration
         */
        function formOptions() {
            var formOptionsItems = {

                bindingOptions: {
                    formData: 'vm.customers'
                },
                colCount: 2,
                items: [{
                    dataField: 'name',
                    label: {
                        text: 'Name'
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Name is required'
                    }]
                }, {
                    dataField: 'phone',
                    label: {
                        text: 'Phone'
                    },
                    editorOptions: {
                        mask: '0000000000'
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Phone number is required'
                    }]
                }, {
                    dataField: 'email',
                    label: {
                        text: 'Email'
                    },
                    validationRules: [{
                        type: 'email',
                        message: 'Please enter valid e-mail address'
                    }]
                }, {
                    dataField: 'alias',
                    label: {
                        text: 'Short Name'
                    }
                }, {
                    dataField: 'gstno',
                    label: {
                        text: 'GST No'
                    },
                    editorOptions: {
                        mask: '00AAAAAAAAAA0A0'
                    }
                }, {
                    dataField: 'adress',
                    label: {
                        text: 'Address'
                    }
                }, {
                    dataField: 'city',
                    label: {
                        text: 'City'
                    }
                }, {
                    dataField: 'state',
                    label: {
                        text: 'State'
                    }
                }, {
                    dataField: 'zipcode',
                    label: {
                        text: 'ZIP/Pincode'
                    },
                    editorOptions: {
                        mask: '000000'
                    }
                }],
                onContentReady: function () {
                    var dxFormInstance = $('#customer-form').dxForm('instance');
                }
            };
            return formOptionsItems;
        }

        
        /**
         * Save form data
         * @returns {Object} Customer Form data
         */
        function saveCustomer(customerObj) {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId);
            customerObj.user = auth.$getAuth().uid;
            customerObj.date = customerObj.date.toString();
            return firebaseUtils.addData(ref, customerObj);
        }

        /**
         * Fetch customer list
         * @returns {Object} Customer data
         */
        function fetchCustomerList() {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch customer list
         * @returns {Object} Customer data
         */
        function updateCustomer(key, customerData) {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, customerData);
        }

        /**
         * Delete Customer
         * @returns {Object} customer data
         */
        function deleteCustomer(key) {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());