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

var iotConfig = require('../configTest'),
    nock = require('nock'),
    request = require('request'),
    agentMock,
    should = require('should'),
    mongoDBUtils = require('../mongoDBUtils'),
    iotManager = require('../../lib/iotagent-manager'),
    async = require('async'),
    utils = require('../utils'),
    _ = require('underscore');

describe('IoTA Redirections', function() {
    var operations = [
            ['GET Device', null, 'GET', '/iot/devices/devId', './test/examples/provisioning/getDevice.json'],
            ['PUT Device', './test/examples/provisioning/putDevice.json', 'PUT', '/iot/devices/devId', null],
            ['GET Device List', null, 'GET', '/iot/devices', './test/examples/provisioning/getDeviceList.json'],
            ['DELETE Device', null, 'DELETE', '/iot/devices/devId', null],
            ['POST Device', './test/examples/provisioning/postDevice.json', 'POST', '/iot/devices', null],
            ['POST Configuration', './test/examples/provisioning/postGroup.json', 'POST', '/iot/services', null],
            ['PUT Configuration', './test/examples/provisioning/putGroup.json', 'PUT', '/iot/services', null],
            ['DELETE Configuration', null, 'DELETE', '/iot/services', null]
        ],
        protocolRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/protocols/registrationEmpty.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };
    
    beforeEach(function(done) {
        async.series([
            mongoDBUtils.cleanDbs,
            async.apply(iotManager.start, iotConfig)
        ], function(error) {
            request(protocolRequest, function(error, response, body) {
                done();
            });
        });
    }); 
    
    afterEach(function(done) {
        nock.cleanAll();

        async.series([
            mongoDBUtils.cleanDbs,
            iotManager.stop
        ], done);
    });

    function testOperation(operation) {
        describe('When a ' + operation[0] + ' operation arrives to the manager', function() {
            var options = {
                url: 'http://localhost:' + iotConfig.server.port + operation[3],
                method: operation[2],
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                },
                qs: {
                    protocol: 'GENERIC_PROTOCOL'
                }
            };

            beforeEach(function(done) {
                if (operation[1] !== null) {
                    options.json = utils.readExampleFile(operation[1]);
                }

                agentMock = nock('http://smartGondor.com/')
                    .matchHeader('fiware-service', 'smartGondor')
                    .matchHeader('fiware-servicepath', '/gardens');

                if (operation[2] === 'POST') {
                    agentMock
                        .post(operation[3], utils.readExampleFile(operation[1]))
                        .reply(200, operation[4] || {});
                } else if (operation[2] === 'PUT') {
                    agentMock
                        .put(operation[3], utils.readExampleFile(operation[1]))
                        .reply(200, operation[4] || {});
                } else if (operation[2] === 'GET') {
                    agentMock
                        .get(operation[3])
                        .reply(200, operation[4] || {});
                } else {
                    agentMock
                        .delete(operation[3])
                        .reply(200, operation[4] || {});
                }

                done();
            });

            it('should be redirected to the appropriate IoTAgent based on the protocol', function(done) {
                request(options, function(error, response, body) {
                    should.not.exist(error);
                    agentMock.done();

                    response.statusCode.should.equal(200);
                    done();
                });
            });
        });
    }

    for (var i = 0; i < operations.length; i++) {
        testOperation(operations[i]);
    }

    describe('When a request arrives without a protocol', function() {
        var wrongRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/devices',
            method: 'GET',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should fail with a 400 error', function(done) {
            request(wrongRequest, function(error, response, body) {
                should.not.exist(error);

                response.statusCode.should.equal(400);

                done();
            });
        });
    });
});