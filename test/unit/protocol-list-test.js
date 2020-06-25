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

const request = require('request');
const iotConfig = require('../configTest');
const should = require('should');
const mongoDBUtils = require('../mongoDBUtils');
const iotManager = require('../../lib/iotagent-manager');
const async = require('async');
const utils = require('../utils');
const _ = require('underscore');

describe('Protocol list tests', function() {
    const exampleCreation = {
        url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
        method: 'POST',
        json: utils.readExampleFile('./test/examples/protocols/registrationWithGroups.json'),
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function(done) {
        async.series([mongoDBUtils.cleanDbs, async.apply(iotManager.start, iotConfig)], done);
    });

    afterEach(function(done) {
        async.series([mongoDBUtils.cleanDbs, iotManager.stop], done);
    });

    function generateProtocols(number) {
        const protocolExecutionList = [];
        let protocol;

        for (let i = 0; i < number; i++) {
            protocol = _.clone(exampleCreation);
            protocol.json = _.clone(exampleCreation.json);
            protocol.json.protocol += i;

            protocolExecutionList.push(request.bind(request, protocol));
        }

        return protocolExecutionList;
    }

    describe('When a simple protocol list request arrives to a database without protocols', function() {
        const listRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'GET',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should return the list of the protocols', function(done) {
            request(listRequest, function(error, result, body) {
                const parsedBody = JSON.parse(body);

                should.exist(parsedBody.protocols);
                should.exist(parsedBody.count);
                parsedBody.count.should.equal(0);

                done();
            });
        });
        it('should return a 200 OK code', function(done) {
            request(listRequest, function(error, result, body) {
                should.not.exist(error);
                should.exist(body);
                result.statusCode.should.equal(200);
                done();
            });
        });
    });

    describe('When a simple protocol list request arrives to a database with two protocols', function() {
        const listRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'GET',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function(done) {
            const protocolCreationRequests = generateProtocols(2);

            async.series(protocolCreationRequests, function(error, results) {
                done();
            });
        });

        it('should return the complete list of the protocols', function(done) {
            request(listRequest, function(error, result, body) {
                const parsedBody = JSON.parse(body);

                should.exist(parsedBody.protocols);
                should.exist(parsedBody.count);
                parsedBody.count.should.equal(2);
                parsedBody.protocols.length.should.equal(2);

                done();
            });
        });
    });

    describe('When a protocol list request with an offset = 3 arrives to the IOTAM', function() {
        const listRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'GET',
            qs: {
                offset: 3
            },
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function(done) {
            const protocolCreationRequests = generateProtocols(10);

            async.series(protocolCreationRequests, function(error, results) {
                done();
            });
        });

        it('should skip the 3 first registers', function(done) {
            request(listRequest, function(error, result, body) {
                const parsedBody = JSON.parse(body);

                should.exist(parsedBody.protocols);
                should.exist(parsedBody.count);
                parsedBody.count.should.equal(10);
                parsedBody.protocols.length.should.equal(7);
                parsedBody.protocols['0'].protocol.should.equal('GENERIC_PROTOCOL3');
                done();
            });
        });
    });

    describe('When a protocol list request arreives with a limit of 4', function() {
        const listRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'GET',
            qs: {
                limit: 4
            },
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function(done) {
            const protocolCreationRequests = generateProtocols(10);

            async.series(protocolCreationRequests, function(error, results) {
                done();
            });
        });

        it('should return just 4 records', function(done) {
            request(listRequest, function(error, result, body) {
                const parsedBody = JSON.parse(body);

                should.exist(parsedBody.protocols);
                should.exist(parsedBody.count);
                parsedBody.count.should.equal(10);
                parsedBody.protocols.length.should.equal(4);

                done();
            });
        });
    });
});
