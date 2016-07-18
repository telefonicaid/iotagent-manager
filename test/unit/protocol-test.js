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

var request = require('request'),
    iotConfig = require('../configTest'),
    mongoDBUtils = require('../mongoDBUtils'),
    async = require('async'),
    should = require('should'),
    utils = require('../utils'),
    iotManager = require('../../lib/iotagent-manager');

describe('Protocol creation tests', function() {
    var listRequest = {
        url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
        method: 'GET',
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function(done) {
        iotManager.start(iotConfig, done);
    });

    afterEach(function(done) {
        async.series([
            mongoDBUtils.cleanDbs,
            iotManager.stop
        ], done);
    });

    describe('When a new IoTAgent protocol registration request arrives to the IOTAM', function() {
        var protocolRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/protocols/registrationWithGroups.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should return a 200 OK code if the registration was correct', function(done) {
            request(protocolRequest, function(error, result, body) {
                should.not.exist(error);
                should.exist(body);
                result.statusCode.should.equal(200);
                done();
            });
        });
        it('should appear in subsequent listings', function(done) {
            request(protocolRequest, function(error, result, body) {
                request(listRequest, function(error, result, body) {
                    var parsedBody;

                    should.not.exist(error);
                    should.exist(body);

                    parsedBody = JSON.parse(body);

                    result.statusCode.should.equal(200);
                    should.exist(parsedBody.protocols);
                    should.exist(parsedBody.count);
                    parsedBody.count.should.equal(1);
                    done();
                });
            });
        });
    });

    describe('When a protocol registration arrives with missing attributes', function() {
        var protocolRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/protocols/registrationWithMissingAttrs.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should return a 400 BAD INPUT code to the IoTA', function(done) {
            request(protocolRequest, function(error, result, body) {
                should.not.exist(error);
                should.exist(body);
                result.statusCode.should.equal(400);
                done();
            });
        });
    });

    describe('When a protocol registration arrives with extra attributes', function() {
        var protocolRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/protocols/registrationWithWrongAttrs.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should return a 400 BAD INPUT code to the IoTA', function(done) {
            request(protocolRequest, function(error, result, body) {
                should.not.exist(error);
                should.exist(body);
                result.statusCode.should.equal(400);
                done();
            });
        });
    });

    describe('When an already existing registration arrives to the IoTAM', function() {
        var protocolRequest = {
                url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
                method: 'POST',
                json: utils.readExampleFile('./test/examples/protocols/registrationWithGroups.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            },
            protocolRequest2 = {
                url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
                method: 'POST',
                json: utils.readExampleFile('./test/examples/protocols/registrationWithGroupsUpdate.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            };

        it('should return a 200 OK', function(done) {
            request(protocolRequest, function(error, result, body) {
                request(protocolRequest2, function(error, result, body) {
                    should.not.exist(error);
                    should.exist(body);
                    result.statusCode.should.equal(200);
                    done();
                });
            });
        });

        it('should NOT create a new register', function(done) {
            request(protocolRequest, function(error, result, body) {
                request(protocolRequest2, function(error, result, body) {
                    request(listRequest, function(error, result, body) {
                        var parsedBody;

                        should.not.exist(error);
                        should.exist(body);

                        parsedBody = JSON.parse(body);

                        result.statusCode.should.equal(200);
                        should.exist(parsedBody.protocols);
                        should.exist(parsedBody.count);
                        parsedBody.count.should.equal(1);
                        done();
                    });
                });
            });
        });

        it('should update the information in previous registration records', function(done) {
            request(protocolRequest, function(error, result, body) {
                request(protocolRequest2, function(error, result, body) {
                    request(listRequest, function(error, result, body) {
                        var parsedBody;

                        should.not.exist(error);
                        should.exist(body);

                        parsedBody = JSON.parse(body);

                        parsedBody.protocols[0].description.should.equal(
                            'A generic protocol updated with new information');

                        parsedBody.protocols[0].iotagent.should.equal('http://smartGondor.com/New');

                        done();
                    });
                });
            });
        });
    });
});
