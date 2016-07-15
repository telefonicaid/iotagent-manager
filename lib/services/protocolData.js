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

var Protocol = require('../model/Protocol'),
    Configuration = require('../model/Configuration'),
    configurations = require('./configurationData'),
    async = require('async'),
    errors = require('../errors'),
    apply = async.apply,
    logger = require('logops'),
    context = {
        op: 'IoTAManager.ProtocolAPI'
    };

function processConfiguration(protocol, iotagent, resource, configuration, callback) {
    configurations.get(configuration.apikey, resource, protocol, function(error, oldConfiguration) {
        if (error) {
            callback(error);
        } else if (oldConfiguration.services.length === 0) {
            configurations.save(protocol, iotagent, resource, configuration, null, callback);
        } else {
            configurations.save(protocol, iotagent, resource, configuration, oldConfiguration.services[0], callback);
        }
    });
}

function cleanConfigurations(protocol, iotagent, resource, callback) {
    Configuration.model.remove({
        protocol: protocol,
        iotagent: iotagent,
        resource: resource
    }, function(error, commandResult) {
        if (error) {
            logger.error(context, 'Internal MongoDB Error getting device: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (commandResult && commandResult.result) {
            logger.debug('Configurations for Protocol [%s][%s][%s] successfully removed.',
                protocol, iotagent, resource);

            callback(null);
        } else {
            logger.error(context, 'Unexpected state cleaning previous services from Protocol [%s][%s][%s]',
                protocol, iotagent, resource);

            callback(new errors.InternalDbError('Unexpected state cleaning previous services'));
        }
    });
}

function getProtocol(resource, protocol, callback) {
    var condition = {
            resource: resource,
            protocol: protocol
        },
        query;

    query = Protocol.model.find(condition).sort();

    query.exec(function(error, protocol) {
        if (!error && protocol && protocol.length === 1) {
            callback(null, protocol[0]);
        } else if (error) {
            callback(error);
        } else {
            callback(new errors.ProtocolNotFound(resource, protocol));
        }
    });
}

function save(newProtocol, callback) {
    getProtocol(newProtocol.resource, newProtocol.protocol, function(error, protocol) {
        if (error && error.name !== 'PROTOCOL_NOT_FOUND') {
            callback(error);
        } else {
            var protocolObj = protocol || new Protocol.model(),
                attributeList = ['iotagent', 'resource', 'protocol', 'description'],
                actions = [];

            for (var i = 0; i < attributeList.length; i++) {
                protocolObj[attributeList[i]] = newProtocol[attributeList[i]];
            }

            actions.push(apply(cleanConfigurations, newProtocol.protocol, newProtocol.iotagent, newProtocol.resource));

            if (newProtocol.services) {
                actions.push(apply(async.map,
                    newProtocol.services,
                    apply(processConfiguration, newProtocol.protocol, newProtocol.iotagent, newProtocol.resource)));
            }

            actions.push(protocolObj.save.bind(protocolObj));

            async.series(actions, callback);
        }
    });
}

exports.save = save;
