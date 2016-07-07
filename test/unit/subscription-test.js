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

describe('Subscription tests', function() {
    describe('When a new IoTAgent registration subscription arrives to the IOTAM', function() {
        it('should return a 200 OK code if the registration was correct');
        it('should appear in subsequent listings');
    });

    describe('When a registration arrives with an incorrect payload', function() {
        it('should return a 400 BAD INPUT code to the IoTA');
    });

    describe('When an already existing registration arrives to the IoTAM', function() {
        it('should NOT create a new register');
        it('should update the information in previous registration records');
    });
});
