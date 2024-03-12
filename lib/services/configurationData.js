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

/* eslint-disable prefer-rest-params */

const Configuration = require('../model/Configuration');
const iotagentLib = require('iotagent-node-lib');
const errors = require('../errors');
const logger = require('logops');
const async = require('async');

const provisioningAPITranslation = {
    name: 'id',
    service: 'service',
    service_path: 'subservice',
    entity_type: 'type',
    internal_attributes: 'internalAttributes',
    static_attributes: 'staticAttributes',
    timestamp: 'timestamp',
    explicitAttrs: 'explicitAttrs',
    entityNameExp: 'entityNameExp',
    payloadType: 'payloadType'
};

function createGetWithFields(fields) {
    return function () {
        const queryObj = {};
        let i = 0;

        let limit;
        let offset;

        while (typeof arguments[i] !== 'function') {
            if (arguments[i]) {
                if (fields[i] === 'limit') {
                    limit = parseInt(arguments[i], 10);
                } else if (fields[i] === 'offset') {
                    offset = parseInt(arguments[i], 10);
                } else {
                    queryObj[fields[i]] = arguments[i];
                }
            }

            i++;
        }

        const callback = arguments[i];

        logger.debug('Looking for configuration with params %j and query %j', fields, queryObj);

        const query = Configuration.model.find(queryObj);

        if (limit) {
            query.limit(parseInt(limit, 10));
        }

        if (offset) {
            query.skip(parseInt(offset, 10));
        }

        async.series(
            [query.exec.bind(query), Configuration.model.countDocuments.bind(Configuration.model, queryObj)],
            function (error, results) {
                if (!error && results && results.length === 2) {
                    callback(null, {
                        services: results[0],
                        count: results[1]
                    });
                } else if (error) {
                    callback(new errors.InternalDbError(error));
                } else {
                    callback(new errors.DeviceGroupNotFound(fields, arguments));
                }
            }
        );
    };
}

function save(theLogger, protocol, description, iotagent, resource, configuration, oldConfiguration, callback) {
    /* eslint-disable-next-line new-cap */
    const configurationObj = oldConfiguration || new Configuration.model();
    const attributeList = [
        'name',
        'apikey',
        'description',
        'token',
        'service',
        'service_path',
        'entity_name',
        'entity_type',
        'timezone',
        'cbHost',
        'transport',
        'endpoint',
        'attributes',
        'commands',
        'lazy',
        'internal_attributes',
        'static_attributes',
        'timestamp',
        'explicitAttrs',
        'entityNameExp',
        'payloadType'
    ];

    theLogger.debug('Saving Configuration [%s][%s][%s]', protocol, iotagent, resource);

    configurationObj.protocol = protocol;
    configurationObj.description = description;
    configurationObj.iotagent = iotagent;
    configurationObj.resource = resource;

    for (let i = 0; i < attributeList.length; i++) {
        configurationObj[provisioningAPITranslation[attributeList[i]] || attributeList[i]] =
            configuration[attributeList[i]];
        if (
            attributeList[i] === 'description' &&
            (configuration[attributeList[i]] === '' || configuration[attributeList[i]] == null)
        ) {
            configurationObj[provisioningAPITranslation[attributeList[i]] || attributeList[i]] = description;
        }
    }
    theLogger.debug('Saving Configuration %j translated to %j ', configuration, configurationObj);
    configurationObj.save(callback);
}

exports.get = iotagentLib.alarms.intercept(
    iotagentLib.constants.MONGO_ALARM,
    createGetWithFields(['apikey', 'resource', 'protocol', 'type'])
);

exports.save = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, save);

exports.list = iotagentLib.alarms.intercept(
    iotagentLib.constants.MONGO_ALARM,
    createGetWithFields(['service', 'subservice', 'protocol', 'apikey', 'type', 'limit', 'offset'])
);
