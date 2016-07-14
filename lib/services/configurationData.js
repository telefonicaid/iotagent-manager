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

var Configuration = require('../model/Configuration'),
    errors = require('../errors'),
    logger = require('logops'),
    context = {
        op: 'IoTAManager.ConfigurationDB'
    },
    provisioningAPITranslation = {
        /* jshint camelcase:false */

        name: 'id',
        service: 'service',
        service_path: 'subservice',
        entity_name: 'name',
        entity_type: 'type',
        internal_attributes: 'internalAttributes'
    };

function get(apikey, resource, protocol, callback) {
    var condition = {
            apikey: apikey,
            resource: resource,
            protocol: protocol
        },
        query;

    query = Configuration.model.find(condition).sort();

    query.exec(function(error, configurations) {
        if (!error && configurations && configurations.length === 1) {
            callback(null, configurations[0]);
        } else if (error) {
            callback(new errors.InternalDbError(error));
        } else {
            callback(new errors.DeviceGroupNotFound(['apikey', 'resource', 'protocol'], [apikey, resource, protocol]));
        }
    });
}

function save(protocol, iotagent, resource, configuration, oldConfiguration, callback) {
    var configurationObj = oldConfiguration || new Configuration.model(),
        attributeList = [
            'name',
            'apikey',
            'token',
            'service',
            'service_path',
            'entity_name',
            'entity_type',
            'timezone',
            'transport',
            'endpoint',
            'attributes',
            'commands',
            'lazy',
            'internal_attributes'
        ];

    logger.debug(context, 'Saving Configuration [%s][%s][%s]', protocol, iotagent, resource);

    configurationObj.protocol = protocol;
    configurationObj.iotagent = iotagent;
    configurationObj.resource = resource;

    for (var i = 0; i < attributeList.length; i++) {
        configurationObj[provisioningAPITranslation[attributeList[i]] || attributeList[i]] =
            configuration[attributeList[i]];
    }

    configurationObj.save(callback);
}

exports.get = get;
exports.save = save;
