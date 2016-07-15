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

var iotConfig = require('../configTest');

describe.only('IoTA Redirections', function() {
    var operations = [
        ['GET Device', null, 'GET', '/iot/devices/devId'],
        ['PUT Device', null, 'PUT', '/iot/devices/devId'],
        ['GET Device List', null, 'GET', '/iot/devices'],
        ['POST Device', null, 'POST', '/iot/devices'],
        ['POST Configuration', null, 'POST', '/iot/services'],
        ['GET Configuration', null, 'GET', '/iot/services'],
        ['PUT Configuration', null, 'PUT', '/iot/services']
    ];

    function testOperation(operation) {
        describe('When a ' + operation[0] + ' operation arrives to the manager', function() {
            var options = {
                url: 'http://localhost:' + iotConfig.server.port + operation[3],
                method: operation[2],
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            };

            beforeEach(function() {
                if (operation[1] !== null) {
                    options.json = utils.readExampleFile(operation[1]);
                }
            });

            it('should be redirected to the appropriate IoTAgent based on the protocol');
        });
    }

    for (var i = 0; i < operations.length; i++) {
        testOperation(operations[i]);
    }
});