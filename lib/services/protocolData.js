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

const Protocol = require('../model/Protocol');
const Configuration = require('../model/Configuration');
const iotagentLib = require('iotagent-node-lib');
const configurations = require('./configurationData');
const async = require('async');
const errors = require('../errors');
const apply = async.apply;
//const logger = require('logops');
// const context = {
//     op: 'IoTAManager.ProtocolAPI'
// };

function processConfiguration(logger, protocol, description, iotagent, resource, configuration, callback) {
    configurations.get(logger, configuration.apikey, resource, protocol, function (error, oldConfiguration) {
        if (error) {
            callback(error);
        } else if (oldConfiguration.services.length === 0) {
            configurations.save(logger, protocol, description, iotagent, resource, configuration, null, callback);
        } else {
            configurations.save(
                logger,
                protocol,
                description,
                iotagent,
                resource,
                configuration,
                oldConfiguration.services[0],
                callback
            );
        }
    });
}

function cleanConfigurations(logger, protocol, iotagent, resource, callback) {
    Configuration.model.deleteMany(
        {
            protocol,
            iotagent,
            resource
        },
        /* eslint-disable-next-line no-unused-vars */
        function (error, commandResult) {
            if (error) {
                logger.error('MONGODB-003: Internal MongoDB Error removing services from protocol: %s', error);

                callback(new errors.InternalDbError(error));
            } else {
                logger.debug(
                    'Configurations for Protocol [%s][%s][%s] successfully removed.',
                    protocol,
                    iotagent,
                    resource
                );

                callback(null);
            }
        }
    );
}

function getProtocol(protocol, callback) {
    const condition = {
        protocol
    };
    const query = Protocol.model.find(condition).sort();

    query.exec(function (error, protocolFound) {
        if (!error && protocolFound && protocolFound.length === 1) {
            callback(null, protocolFound[0]);
        } else if (error) {
            callback(error);
        } else {
            const resource = 'n/a';
            callback(new errors.ProtocolNotFound(resource, protocol));
        }
    });
}

function listProtocol(callback) {
    const condition = {};

    function toObject(o) {
        return o.toObject();
    }

    const query = Protocol.model.find(condition).sort();

    query.exec(function (error, protocols) {
        if (error) {
            callback(error);
        } else {
            callback(null, protocols.map(toObject));
        }
    });
}

function save(logger, newProtocol, callback) {
    getProtocol(newProtocol.protocol, function (error, protocol) {
        if (error && error.name !== 'PROTOCOL_NOT_FOUND') {
            callback(error);
        } else {
            /* eslint-disable-next-line new-cap */
            const protocolObj = protocol || new Protocol.model();
            const attributeList = ['iotagent', 'resource', 'protocol', 'description'];
            const actions = [];

            for (let i = 0; i < attributeList.length; i++) {
                protocolObj[attributeList[i]] = newProtocol[attributeList[i]];
            }

            actions.push(
                apply(cleanConfigurations, logger, newProtocol.protocol, newProtocol.iotagent, newProtocol.resource)
            );

            if (newProtocol.services) {
                actions.push(
                    apply(
                        async.map,
                        newProtocol.services,
                        apply(
                            processConfiguration,
                            logger,
                            newProtocol.protocol,
                            newProtocol.description,
                            newProtocol.iotagent,
                            newProtocol.resource
                        )
                    )
                );
            }

            actions.push(protocolObj.save.bind(protocolObj));

            async.series(actions, callback);
        }
    });
}

function removeProtocol(logger, id, callback) {
    const condition = {
        protocol: id
    };

    logger.debug('Removing protocol with id [%s]', id);
    /* eslint-disable-next-line no-unused-vars */
    getProtocol(condition.protocol, function (error, protocol) {
        if (error) {
            callback(error);
        } else {
            Protocol.model.deleteOne(condition, function (error, results) {
                if (error) {
                    logger.debug('Internal MongoDB Error getting device: %s', error);
                    callback(new errors.InternalDbError(error));
                } else {
                    logger.debug('Protocol [%s] successfully removed with results [%j]', id, results);
                    callback(null);
                }
            });
        }
    });
}

exports.save = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, save);

exports.get = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, getProtocol);

exports.list = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, listProtocol);

exports.remove = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, removeProtocol);
