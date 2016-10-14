/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-manager
 *
 * iotagent-manager is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-manager is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-manager.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

/* jshint camelcase: false */

var request = require('request'),
    iotConfig = require('../configTest'),
    mongoDBUtils = require('../mongoDBUtils'),
    _ = require('underscore'),
    mongo = require('mongodb').MongoClient,
    async = require('async'),
    should = require('should'),
    utils = require('../utils'),
    iotManager = require('../../lib/iotagent-manager'),
    configurationTemplate = {
        'apikey': '801230BJKL23Y9090DSFL123HJK09H324HV8732',
        'token': '8970A9078A803H3BL98PINEQRW8342HBAMS',
        'entity_type': 'SensorMachine',
        'resource': '/deviceTest',
        'service': 'theService',
        'service_path': '/gardens',
        'attributes': [
            {
                'name': 'status',
                'type': 'Boolean'
            }
        ]
    },
    iotmDb;


describe('Configuration list', function() {
    function generateInitialConfigurations(callback) {
        var newConfiguration,
            services = ['smartGondor', 'smartMordor'],
            protocolRequest = {
                url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
                method: 'POST',
                json: utils.readExampleFile('./test/examples/protocols/registrationEmpty.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            };

        for (var service in services) {
            for (var i = 0; i < 8; i++) {
                newConfiguration = _.clone(configurationTemplate);
                newConfiguration.apikey += '__' + i;
                newConfiguration.entity_type += '__' + i;
                newConfiguration.token += '__' + i;
                newConfiguration.resource += '__' + i;
                newConfiguration.service = services[service];

                protocolRequest.json.services.push(newConfiguration);
            }
        }

        request(protocolRequest, function() {
            setTimeout(callback, 200);
        });
    }

    beforeEach(function(done) {
        async.series([
            mongoDBUtils.cleanDbs,
            async.apply(iotManager.start, iotConfig)
        ], function() {
            mongo.connect('mongodb://localhost:27017/iotagent-manager', function(err, db) {
                iotmDb = db;

                generateInitialConfigurations(done);
            });
        });
    });

    afterEach(function(done) {
        iotmDb.collection('configurations').remove(function(error) {
            iotmDb.close(function(error) {
                async.series([
                    mongoDBUtils.cleanDbs,
                    iotManager.stop
                ], done);
            });
        });
    });

    describe('When a new configuration list request arrives to the IoTAM', function() {
        var options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/services',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return a 200 OK', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });

        it('should return all the available configurations for its service', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);

                parsedBody.services.length.should.greaterThan(6);
                done();
            });
        });

        it('should not return any configurations for other services', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body),
                    otherServiceFound = false;

                for (var i = 0; i < parsedBody.services.length; i++) {
                    if (parsedBody.services[i].service !== 'smartGondor') {
                        otherServiceFound = true;
                    }
                }

                otherServiceFound.should.equal(false);
                done();
            });
        });
    });

    describe('When a configuration list request with a limit 3 arrives to the IoTAM', function() {
        var options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/services',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            qs: {
                limit: 3
            },
            method: 'GET'
        };

        it('should return just 3 results', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);

                parsedBody.services.length.should.equal(3);
                done();
            });
        });
    });

    describe('When a configuration list request with a offset 3 arrives to the IoTAM', function() {
        var options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/services',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            qs: {
                offset: 3
            },
            method: 'GET'
        };

        it('should skip the first 3 results', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);

                parsedBody.services.length.should.greaterThan(4);
                done();
            });
        });
    });

    describe('When a configuration list request arrives with a wrong limit', function() {
        var options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/services',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            qs: {
                limit: 'three'
            },
            method: 'GET'
        };

        it('should raise a 400 error', function(done) {
            request(options, function(error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });
    });

    describe('When a configuration list request arrives with a wrong offset', function() {
        var options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/services',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            qs: {
                offset: 'three'
            },
            method: 'GET'
        };

        it('should raise a 400 error', function(done) {
            request(options, function(error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });
    });
});
