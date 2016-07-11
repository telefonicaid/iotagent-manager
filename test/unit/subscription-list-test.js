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
    utils = require('../utils'),
    iotManager = require('../../lib/iotagent-manager');

describe('Subscription list tests', function() {
    beforeEach(function(done) {
        iotManager.start(iotConfig, done);
    });

    afterEach(function(done) {
        iotManager.stop(done);
    });

    describe('When a simple subscription list request arrives to a database without subscriptions', function() {
        var listRequest = {
            url: 'http://localhost:' + iotConfig.server.port + '/iot/protocols',
            method: 'GET',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should return the list of the subscriptions', function(done) {
            request(listRequest, function(error, result, body) {
                should.not.exist(error);
                should.exist(body);
                result.statusCode.should.equal(200);
                done();
            });
        });
        it('should return a 200 OK code');
    });

    describe('When a subscription list request with an offset = 3 arrives to the IOTAM', function() {
        it('should skip the 3 first registers');
    });

    describe('When a subscription list request arreives with a limit of 4', function() {
        it('should return just 4 records');
    });
});
