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

var config = {},
    logger = require('logops');

function anyIsSet(variableSet) {
    for (var i = 0; i < variableSet.length; i++) {
        if (process.env[variableSet[i]]) {
            return true;
        }
    }

    return false;
}

/**
 * Looks for environment variables that could override configuration values.
 */
function processEnvironmentVariables() {
    var environmentVariables = [
            'IOTA_SERVER_PORT',
            'IOTA_SERVER_HOST',
            'IOTA_LOG_LEVEL'
        ],
        serverVariables = [
            'IOTA_SERVER_PORT',
            'IOTA_SERVER_HOST'
        ],
        mongoVariables = [
            'IOTA_MONGO_HOST',
            'IOTA_MONGO_PORT',
            'IOTA_MONGO_DB',
            'IOTA_MONGO_REPLICASET'
        ];

    for (var i = 0; i < environmentVariables.length; i++) {
        if (process.env[environmentVariables[i]]) {
            logger.info('Setting %s to environment value: %s',
                environmentVariables[i], process.env[environmentVariables[i]]);
        }
    }

    if (anyIsSet(serverVariables)) {
        config.server = {};
    }

    if (process.env.IOTA_SERVER_HOST) {
        config.server.host = process.env.IOTA_SERVER_HOST;
    }

    if (process.env.IOTA_SERVER_PORT) {
        config.server.port = process.env.IOTA_SERVER_PORT;
    }

    if (process.env.IOTA_LOG_LEVEL) {
        config.logLevel = process.env.IOTA_LOG_LEVEL;
        logger.setLevel(process.env.IOTA_LOG_LEVEL);
    }

    if (anyIsSet(mongoVariables)) {
        config.mongodb = {};
    }

    if (process.env.IOTA_MONGO_HOST) {
        config.mongodb.host = process.env.IOTA_MONGO_HOST;
    }

    if (process.env.IOTA_MONGO_PORT) {
        config.mongodb.port = process.env.IOTA_MONGO_PORT;
    }

    if (process.env.IOTA_MONGO_DB) {
        config.mongodb.db = process.env.IOTA_MONGO_DB;
    }

    if (process.env.IOTA_MONGO_REPLICASET) {
        config.mongodb.replicaSet = process.env.IOTA_MONGO_REPLICASET;
    }
}

function setConfig(newConfig) {
    config = newConfig;

    if (config.logLevel) {
        logger.setLevel(config.logLevel);
    }

    processEnvironmentVariables();
}

function getConfig() {
    return config;
}

exports.setConfig = setConfig;
exports.getConfig = getConfig;
