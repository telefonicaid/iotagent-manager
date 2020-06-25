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
const mongoDBUtils = require('../mongoDBUtils');
const mongo = require('mongodb').MongoClient;
const async = require('async');
const should = require('should');
const utils = require('../utils');
const iotManager = require('../../lib/iotagent-manager');
let iotmDb;

describe('Configuration cache', function() {
    const protocolRequest = {
        url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
        method: 'POST',
        json: utils.readExampleFile('./test/examples/protocols/registrationWithGroups.json'),
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        }
    };
    beforeEach(function(done) {
        async.series([mongoDBUtils.cleanDbs, async.apply(iotManager.start, iotConfig)], function() {
            mongo.connect(
                'mongodb://localhost:27017/iotagent-manager',
                { useNewUrlParser: true },
                function(err, db) {
                    iotmDb = db;
                    done();
                }
            );
        });
    });

    afterEach(function(done) {
        iotmDb
            .db()
            .collection('configurations')
            .deleteOne(function(error) {
                iotmDb.close(function(error) {
                    async.series([mongoDBUtils.cleanDbs, iotManager.stop], done);
                });
            });
    });

    describe('When an IoT Agent sends a registration with configurations', function() {
        it('should store the configurations in MongoDB', function(done) {
            request(protocolRequest, function(error, result, body) {
                iotmDb
                    .db()
                    .collection('configurations')
                    .find({})
                    .toArray(function(err, docs) {
                        should.not.exist(err);
                        should.exist(docs);
                        should.exist(docs.length);

                        docs.length.should.equal(1);

                        should.exist(docs[0].apikey);
                        should.exist(docs[0].token);
                        should.exist(docs[0].type);
                        should.exist(docs[0].resource);
                        should.exist(docs[0].service);
                        should.exist(docs[0].subservice);
                        should.exist(docs[0].attributes);
                        should.exist(docs[0].attributes.length);

                        should.exist(docs[0].protocol);
                        should.exist(docs[0].resource);
                        should.exist(docs[0].iotagent);

                        docs[0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                        docs[0].token.should.equal('8970A9078A803H3BL98PINEQRW8342HBAMS');
                        docs[0].type.should.equal('SensorMachine');
                        docs[0].resource.should.equal('/iot/d');
                        docs[0].service.should.equal('theService');
                        docs[0].subservice.should.equal('theSubService');

                        docs[0].protocol.should.equal('GENERIC_PROTOCOL');
                        docs[0].iotagent.should.equal('http://smartGondor.com/');

                        docs[0].attributes.length.should.equal(1);

                        done();
                    });
            });
        });
    });

    describe('When an IoT Agent updates the registration information with different configurations', function() {
        const firstProtocolRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/protocols/registrationWithGroups.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const secondProtocolRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/protocols/registrationWithNewGroups.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should remove the older information', function(done) {
            request(firstProtocolRequest, function(error, result, body) {
                request(secondProtocolRequest, function(error, result, body) {
                    iotmDb
                        .db()
                        .collection('configurations')
                        .find({})
                        .toArray(function(err, docs) {
                            should.not.exist(err);
                            should.exist(docs);
                            should.exist(docs.length);

                            docs.length.should.equal(1);

                            done();
                        });
                });
            });
        });

        it('should store the additional information', function(done) {
            request(firstProtocolRequest, function(error, result, body) {
                request(secondProtocolRequest, function(error, result, body) {
                    iotmDb
                        .db()
                        .collection('configurations')
                        .find({})
                        .toArray(function(err, docs) {
                            should.exist(docs[0].apikey);
                            should.exist(docs[0].token);
                            should.exist(docs[0].type);
                            should.exist(docs[0].resource);
                            should.exist(docs[0].service);
                            should.exist(docs[0].subservice);
                            should.exist(docs[0].attributes);
                            should.exist(docs[0].attributes.length);

                            should.exist(docs[0].protocol);
                            should.exist(docs[0].description);
                            should.exist(docs[0].resource);
                            should.exist(docs[0].iotagent);

                            docs[0].apikey.should.equal('L23123HJ01230BJ4HV87K0BMSA807898PI9H2');
                            docs[0].token.should.equal('90DSFLK3Y9032NEQL8970A92HBARW83403H3');
                            docs[0].type.should.equal('OtherMachine');
                            docs[0].resource.should.equal('/iot/d');
                            docs[0].service.should.equal('otherServices');
                            docs[0].subservice.should.equal('differentPath');

                            docs[0].protocol.should.equal('GENERIC_PROTOCOL');
                            docs[0].description.should.equal('A generic protocol');
                            docs[0].iotagent.should.equal('http://smartGondor.com/');

                            done();
                        });
                });
            });
        });
    });
});
