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

class BadConfiguration {
    constructor(msg) {
        this.name = 'BAD_CONFIGURATION';
        this.message = 'The application startup failed due to a bad configuration:' + msg;
    }
}
class DeviceGroupNotFound {
    constructor(fields, values) {
        this.name = 'DEVICE_GROUP_NOT_FOUND';
        if (values && fields) {
            this.message = "Couldn't find device group for fields: " + fields + ' and values: ' + values;
        } else {
            this.message = "Couldn't find device group";
        }
        this.code = 404;
    }
}
class ProtocolNotFound {
    constructor(resource, protocol) {
        this.name = 'PROTOCOL_NOT_FOUND';
        this.message = 'Protocol not found for resource [' + resource + '] and protocol [' + protocol + ']';
        this.code = 404;
    }
}
class InternalDbError {
    constructor(msg) {
        this.name = 'INTERNAL_DB_ERROR';
        this.message = 'An internal DB Error happened: ' + msg;
        this.code = 500;
    }
}
class WrongParameterValue {
    constructor(value) {
        this.name = 'WRONG_PARAMETER_VALUE';
        this.message = 'The value[' + value + ' is not a valid query parameter value.';
        this.code = 400;
    }
}
class TargetServerError {
    constructor(msg) {
        this.name = 'TARGET_SERVER_ERROR';
        this.message = 'There was an error redirecting the request to the target server: ' + msg;
        this.code = 500;
    }
}
class TargetResponseError {
    constructor(msg) {
        this.name = 'TARGET_RESPONSE_ERROR';
        this.message = 'There was an error parsing the response from target server: ' + msg;
        this.code = 500;
    }
}
class MissingParameters {
    constructor(value) {
        this.name = 'MISSING_PARAMETERS';
        this.message = 'There were some parameters missing in the request: ' + value;
        this.code = 400;
    }
}
class DuplicateError {
    constructor(response) {
        this.name = response.name;
        this.message = response.message;
        this.code = 409;
        // Expect IOTAM CPP format: errors[{ endpoint, code, details { name, mesage} }]
        this.errors = [{ code: this.code, details: response }];
    }
}

module.exports = {
    BadConfiguration,
    DeviceGroupNotFound,
    ProtocolNotFound,
    InternalDbError,
    WrongParameterValue,
    TargetServerError,
    TargetResponseError,
    MissingParameters,
    DuplicateError
};
