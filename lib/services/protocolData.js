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

function processConfiguration(logger, protocol, description, iotagent, resource, configuration, callback) {
    configurations.get(configuration.apikey, resource, protocol, function (error, oldConfiguration) {
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
    const queryObj = {
        protocol,
        iotagent,
        resource
    };
    const query = Configuration.model.deleteMany(queryObj);
    query
        .exec({})
        .then((commandResult) => {
            logger.debug(
                'Configurations for Protocol [%s][%s][%s] successfully removed.',
                protocol,
                iotagent,
                resource
            );
            callback(null);
        })
        .catch((error) => {
            logger.error('MONGODB-003: Internal MongoDB Error removing services from protocol: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

function getProtocol(protocol, callback) {
    const condition = {
        protocol
    };
    const query = Protocol.model.find(condition).sort();
    query
        .exec({})
        .then((protocolFound) => {
            if (protocolFound && protocolFound.length === 1) {
                callback(null, protocolFound[0]);
            } else {
                const resource = 'n/a';
                callback(new errors.ProtocolNotFound(resource, protocol));
            }
        })
        .catch((error) => {
            callback(error);
        });
}

function listProtocol(callback) {
    const condition = {};
    function toObject(o) {
        return o.toObject();
    }
    const query = Protocol.model.find(condition).sort();
    query
        .exec({})
        .then((protocols) => {
            callback(null, protocols.map(toObject));
        })
        .catch((error) => {
            callback(error);
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
            function func1(callback) {
                protocolObj
                    .save({})
                    .then((res) => {
                        callback(null, res);
                    })
                    .catch((error) => {
                        callback(error);
                    });
            }
            actions.push(func1);
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
            const query = Protocol.model.deleteOne(condition);
            query
                .exec({})
                .then((results) => {
                    logger.debug('Protocol [%s] successfully removed with results [%j]', id, results);
                    callback(null);
                })
                .catch((error) => {
                    logger.debug('Internal MongoDB Error getting device: %s', error);
                    callback(new errors.InternalDbError(error));
                });
        }
    });
}

exports.save = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, save);

exports.get = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, getProtocol);

exports.list = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, listProtocol);

exports.remove = iotagentLib.alarms.intercept(iotagentLib.constants.MONGO_ALARM, removeProtocol);
