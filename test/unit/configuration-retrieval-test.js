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

describe('Configuration list', function() {
    describe('When a new configuration list request arrives to the IoTAM', function() {
        it('should return a 200 OK');
        it('should return all the available configurations');
    });

    describe('When a configuration list request with a limit 3 arrives to the IoTAM', function() {
        it('should return just 3 results');
    });

    describe('When a configuration list request with a offset 3 arrives to the IoTAM', function() {
        it('should skip the first 3 results');
    });

    describe('When a configuration list request arrives with a wrong limit', function() {
        it('should raise a 400 error');
    });

    describe('When a configuration list request arrives with a wrong offset', function() {
        it('should raise a 400 error');
    });

});
