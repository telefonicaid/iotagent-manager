/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */

module.exports = {
    TIMESTAMP_ATTRIBUTE: 'TimeInstant',
    TIMESTAMP_TYPE: 'ISO8601',
    SERVICE_HEADER: 'fiware-service',
    SUBSERVICE_HEADER: 'fiware-servicepath',

    COMMAND_RESULT_SUFIX: '_info',
    COMMAND_STATUS_SUFIX: '_status',
    COMMAND_STATUS: 'commandStatus',
    COMMAND_RESULT: 'commandResult',

    DEFAULT_RESOURCE: '/iot/d',

    DEFAULT_MONGODB_RETRIES: 5,
    DEFAULT_MONGODB_RETRY_TIME: 5,

    FORWARDED_HEADER: 'forwarded',
    X_REAL_IP_HEADER: 'x-real-ip',
    CORRELATOR_HEADER: 'fiware-correlator'
};
