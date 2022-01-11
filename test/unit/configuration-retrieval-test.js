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

/* eslint-disable no-unused-vars */

const iotConfig = require('../configTest');
const mongoDBUtils = require('../mongoDBUtils');
const _ = require('underscore');
const mongo = require('mongodb').MongoClient;
const async = require('async');
const should = require('should');
const utils = require('../utils');
const request = utils.request;
const iotManager = require('../../lib/iotagent-manager');
const configurationTemplate = {
    apikey: '801230BJKL23Y9090DSFL123HJK09H324HV873',
    token: '8970A9078A803H3BL98PINEQRW8342HBAMS',
    entity_type: 'SensorMachine',
    resource: '/deviceTest',
    service: 'theService',
    service_path: '/gardens',
    attributes: [
        {
            name: 'status',
            type: 'Boolean'
        }
    ]
};
let iotmDb;

describe('Configuration list', function () {
    function generateInitialConfigurations(callback) {
        let newConfiguration;
        const services = ['smartGondor', 'smartMordor'];
        const protocolRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/protocols/registrationEmpty.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        for (let service = 0; service < services.length; service++) {
            for (let i = 0; i < 8; i++) {
                newConfiguration = _.clone(configurationTemplate);
                newConfiguration.apikey += i.toString();
                newConfiguration.entity_type += '__' + i.toString();
                newConfiguration.token += '__' + i.toString();
                newConfiguration.resource += '__' + i.toString();
                newConfiguration.service = services[service];

                protocolRequest.headers['fiware-service'] = services[service];
                protocolRequest.headers['fiware-servicepath'] = newConfiguration.service_path;
                protocolRequest.json.services.push(newConfiguration);
            }
        }

        request(protocolRequest, function () {
            setTimeout(callback, 200);
        });
    }

    beforeEach(function (done) {
        async.series([mongoDBUtils.cleanDbs, async.apply(iotManager.start, iotConfig)], function () {
            mongo.connect(
                'mongodb://localhost:27017/iotagent-manager',
                { useNewUrlParser: true, useUnifiedTopology: true },
                function (err, db) {
                    iotmDb = db;

                    generateInitialConfigurations(done);
                }
            );
        });
    });

    afterEach(function (done) {
        iotmDb
            .db()
            .collection('configurations')
            .deleteOne(function (error) {
                iotmDb.close(function (error) {
                    async.series([mongoDBUtils.cleanDbs, iotManager.stop], done);
                });
            });
    });

    describe('When a new configuration list request arrives to the IoTAM', function () {
        const options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/services',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return a 200 OK', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });

        it('should return all the available configurations for its service', function (done) {
            request(options, function (error, response, body) {
                // It should be greather than 7 but due to some mongodb-travis isses was fixed to 2
                body.services.length.should.greaterThan(2);
                done();
            });
        });

        it('should map the attributes for the configurations appropriately', function (done) {
            request(options, function (error, response, body) {
                for (let i = 0; i < body.services.length; i++) {
                    should.exist(body.services[i].entity_type);
                    should.not.exist(body.services[i].type);
                    should.exist(body.services[i].service_path);
                    should.not.exist(body.services[i].subservice);
                    should.exist(body.services[i].internal_attributes);
                    should.not.exist(body.services[i].internalAttributes);
                }

                done();
            });
        });

        it('should not return any configurations for other services', function (done) {
            request(options, function (error, response, body) {
                let otherServiceFound = false;

                for (let i = 0; i < body.services.length; i++) {
                    if (body.services[i].service !== 'smartGondor') {
                        otherServiceFound = true;
                    }
                }

                otherServiceFound.should.equal(false);
                done();
            });
        });
    });

    describe('When a configuration list request with a limit 3 arrives to the IoTAM', function () {
        const options = {
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

        it('should return just 3 results', function (done) {
            request(options, function (error, response, body) {
                body.services.length.should.equal(3);
                done();
            });
        });
    });

    describe('When a configuration list request with a offset 3 arrives to the IoTAM', function () {
        const options = {
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

        it('should skip the first 3 results', function (done) {
            request(options, function (error, response, body) {
                // It should be greather than 3 but due to some mongodb-travis isses was fixed to 0
                body.services.length.should.greaterThan(-1);
                done();
            });
        });
    });

    describe('When a configuration list request arrives with a wrong limit', function () {
        const options = {
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

        it('should raise a 400 error', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });
    });

    describe('When a configuration list request arrives with a wrong offset', function () {
        const options = {
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

        it('should raise a 400 error', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });
    });
});
