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
const nock = require('nock');
let agentMock;
const should = require('should');
const mongoDBUtils = require('../mongoDBUtils');
const iotManager = require('../../lib/iotagent-manager');
const async = require('async');
const utils = require('../utils');
const request = utils.request;

describe('IoTA Redirections', function () {
    const operations = [
        [
            'GET Device',
            null,
            'GET',
            '/iot/devices/devId',
            './test/examples/provisioning/getDevice.json',
            './test/examples/provisioning/getDeviceReply.json'
        ],
        ['PUT Device', './test/examples/provisioning/putDevice.json', 'PUT', '/iot/devices/devId'],
        [
            'GET Device List',
            null,
            'GET',
            '/iot/devices',
            './test/examples/provisioning/getDeviceList.json',
            './test/examples/provisioning/getDeviceList.json'
        ],

        ['DELETE Device', null, 'DELETE', '/iot/devices/devId'],
        ['POST Device', './test/examples/provisioning/postDevice.json', 'POST', '/iot/devices'],
        ['POST Configuration', './test/examples/provisioning/postGroup.json', 'POST', '/iot/groups'],
        ['PUT Configuration', './test/examples/provisioning/putGroup.json', 'PUT', '/iot/groups'],
        ['DELETE Configuration', null, 'DELETE', '/iot/groups']
    ];
    const protocolRequest = {
        url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
        method: 'POST',
        json: utils.readExampleFile('./test/examples/protocols/registrationEmpty.json'),
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function (done) {
        async.series([mongoDBUtils.cleanDbs, async.apply(iotManager.start, iotConfig)], function (error) {
            request(protocolRequest, function (error, response, body) {
                done();
            });
        });
    });

    afterEach(function (done) {
        nock.cleanAll();

        async.series([mongoDBUtils.cleanDbs, iotManager.stop], done);
    });

    function testOperation(operation) {
        describe('When a ' + operation[0] + ' operation arrives to the manager', function () {
            const options = {
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

            beforeEach(function (done) {
                if (operation[1] !== null) {
                    options.json = utils.readExampleFile(operation[1]);
                }

                agentMock = nock('http://smartGondor.com/')
                    .matchHeader('fiware-service', 'smartGondor')
                    .matchHeader('fiware-servicepath', '/gardens');

                if (operation[2] === 'POST') {
                    agentMock
                        .post(operation[3], utils.readExampleFile(operation[1]))
                        .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                        .reply(200, operation[4] ? utils.readExampleFile(operation[4]) : {});
                } else if (operation[2] === 'PUT') {
                    agentMock
                        .put(operation[3], utils.readExampleFile(operation[1]))
                        .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                        .reply(200, operation[4] ? utils.readExampleFile(operation[4]) : {});
                } else if (operation[2] === 'GET') {
                    agentMock
                        .get(operation[3])
                        .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                        .reply(200, operation[4] ? utils.readExampleFile(operation[4]) : {});
                } else {
                    agentMock
                        .delete(operation[3])
                        .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                        .reply(200, operation[4] ? utils.readExampleFile(operation[4]) : {});
                }

                done();
            });

            it('should be redirected to the appropriate IoTAgent based on the protocol', function (done) {
                request(options, function (error, response, body) {
                    should.not.exist(error);
                    agentMock.done();

                    response.statusCode.should.equal(200);
                    done();
                });
            });

            if (options.method === 'GET' && operation[5]) {
                it('should return the appropriate response for GETs', function (done) {
                    request(options, function (error, response, body) {
                        const expectedObj = utils.readExampleFile(operation[5]);
                        should.deepEqual(body, expectedObj);
                        done();
                    });
                });
            }
        });
    }

    for (let i = 0; i < operations.length; i++) {
        testOperation(operations[i]);
    }

    describe('When a GET request arrives without a protocol', function () {
        const wrongRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/devices',
            method: 'GET',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            agentMock = nock('http://smartGondor.com/')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens');

            agentMock
                .get('/iot/devices')
                .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                .reply(200, utils.readExampleFile('./test/examples/provisioning/getDeviceList.json'));

            done();
        });

        it('should return the combined responses for all the protocols', function (done) {
            request(wrongRequest, function (error, response, body) {
                should.not.exist(error);

                response.statusCode.should.equal(200);

                done();
            });
        });
    });

    describe('When a request arrives to the manager with an array of protocols', function () {
        const options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/groups',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/examples/provisioning/postGroupArray.json')
        };
        let secondAgentMock;

        beforeEach(function (done) {
            agentMock = nock('http://smartGondor.com/')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens');

            agentMock
                .post('/iot/groups', utils.readExampleFile('./test/examples/provisioning/postCleanGroup1.json'))
                .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                .reply(200, {});

            secondAgentMock = nock('http://anotherprotocol.com/')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens');

            secondAgentMock
                .post('/iot/groups', utils.readExampleFile('./test/examples/provisioning/postCleanGroup2.json'))
                .query({ resource: '/iot/a', protocol: 'ANOTHER_PROTOCOL' })
                .reply(200, {});

            protocolRequest.json.protocol = 'ANOTHER_PROTOCOL';
            protocolRequest.json.resource = '/iot/a';
            protocolRequest.json.iotagent = 'http://anotherProtocol.com';

            request(protocolRequest, function (error, response, body) {
                protocolRequest.json = utils.readExampleFile('./test/examples/protocols/registrationEmpty.json');

                done();
            });
        });

        it('should be redirected to both IoTAgent with a single protocol each', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                agentMock.done();

                response.statusCode.should.equal(200);
                done();
            });
        });
    });

    describe('When a device creation request arrives to the manager with protocol in its body', function () {
        const options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/examples/provisioning/postDevice.json')
        };

        beforeEach(function (done) {
            agentMock = nock('http://smartGondor.com/')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/iot/devices', utils.readExampleFile('./test/examples/provisioning/postDevice.json'))
                .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                .reply(200, {});

            done();
        });

        it('should be redirected to the appropriate agent', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                agentMock.done();

                response.statusCode.should.equal(200);
                done();
            });
        });
    });

    describe('When the creation of multiple devices arrive to the manager', function () {
        const options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/examples/provisioning/postDeviceMultiple.json')
        };

        beforeEach(function (done) {
            agentMock = nock('http://smartGondor.com/')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/iot/devices', utils.readExampleFile('./test/examples/provisioning/postDeviceMultiple.json'))
                .query({ resource: '/iot/d', protocol: 'GENERIC_PROTOCOL' })
                .reply(200, {});

            done();
        });

        it('should redirect a multiple device creation', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                agentMock.done();

                response.statusCode.should.equal(200);
                done();
            });
        });
    });

    describe('When a device creation request arrives for a protocol with the "/iot" prefix', function () {
        const options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/examples/provisioning/postDeviceWithPrefix.json')
        };
        let secondAgentMock;

        beforeEach(function (done) {
            secondAgentMock = nock('http://anotherprotocol.com/')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens');

            secondAgentMock
                .post('/iot/devices', utils.readExampleFile('./test/examples/provisioning/postDeviceWithPrefix.json'))
                .query({ resource: '/iot/a', protocol: 'PREFIX_PROTOCOL' })
                .reply(200, {});

            protocolRequest.json.protocol = 'PREFIX_PROTOCOL';
            protocolRequest.json.resource = '/iot/a';
            protocolRequest.json.iotagent = 'http://anotherProtocol.com/iot';

            request(protocolRequest, function (error, response, body) {
                protocolRequest.json = utils.readExampleFile('./test/examples/protocols/registrationEmpty.json');

                done();
            });
        });

        it('should be redirected to the appropriate agent', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                secondAgentMock.done();

                response.statusCode.should.equal(200);
                done();
            });
        });
    });

    describe('When a device creation response is not valid JSON', function () {
        const options = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/examples/provisioning/postDeviceWithPrefix.json')
        };
        let secondAgentMock;

        beforeEach(function (done) {
            secondAgentMock = nock('http://anotherprotocol.com/')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens');

            secondAgentMock
                .post('/iot/devices', utils.readExampleFile('./test/examples/provisioning/postDeviceWithPrefix.json'))
                .query({ resource: '/iot/a', protocol: 'PREFIX_PROTOCOL' })
                .reply(200, 'NOT JSON');

            protocolRequest.json.protocol = 'PREFIX_PROTOCOL';
            protocolRequest.json.resource = '/iot/a';
            protocolRequest.json.iotagent = 'http://anotherProtocol.com/iot';

            request(protocolRequest, function (error, response, body) {
                protocolRequest.json = utils.readExampleFile('./test/examples/protocols/registrationEmpty.json');

                done();
            });
        });

        it('should return an error', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(500);
                secondAgentMock.done();
                done();
            });
        });
    });
});
