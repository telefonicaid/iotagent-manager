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

/**
 * This module sets up the connection with the mongodb through mongoose. This connection will be used
 * in mongoose schemas to persist objects.
 */

const mongoose = require('mongoose');
const config = require('../utils/commonConfig');
const constants = require('../utils/constants');
const errors = require('../errors');
let defaultDb;
const DEFAULT_DB_NAME = 'iotagent-manager';

mongoose.Promise = global.Promise; // not including this causes DeprecationWarning

function loadModels() {
    require('./Protocol').load(defaultDb);
    require('./Configuration').load(defaultDb);
}

// Delay function for nodejs16
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new connection to the Mongo DB.
 *
 * @this Reference to the dbConn module itself.
 */
async function init(logger, host, db, port, username, password, options) {
    let credentials = '';
    if (username && password) {
        credentials = `${username}:${password}@`;
    }

    const hosts = host
        .split(',')
        .map((item) => `${item}:${port}`)
        .join(',');
    let url = `mongodb://${credentials}${hosts}/${db}`;

    if (options.replicaSet) {
        url += `?replicaSet=${options.replicaSet.rs_name}`;
    }

    const maxRetries = config.getConfig().mongodb?.retries || constants.DEFAULT_MONGODB_RETRIES;
    const retryTime = config.getConfig().mongodb?.retryTime || constants.DEFAULT_MONGODB_RETRY_TIME;
    /* eslint-disable no-await-in-loop */
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`Attempt ${attempt}: Connecting to MongoDB at ${url}`);
            defaultDb = await mongoose.connect(url, options);
            logger.info('Successfully connected to MongoDB.');

            // Register events
            mongoose.connection.on('error', (err) => logger.error('Mongo Driver error:', err));
            mongoose.connection.on('connected', () => logger.debug('Mongo Driver connected'));
            mongoose.connection.on('disconnected', () => logger.debug('Mongo Driver disconnected'));
            mongoose.connection.on('reconnectFailed', () => {
                logger.error('MONGODB-004: MongoDB connection was lost');
                process.exit(1);
            });

            loadModels();
            break; // End loop if connection was OK
        } catch (error) {
            logger.error(`Attempt ${attempt} failed: ${error}`);
            if (attempt < maxRetries) {
                logger.info(`Retrying in ${retryTime} seconds...`);
                await delay(retryTime * 1000);
            } else {
                throw new Error(`MONGODB-002: Connection failed after ${maxRetries} attempts.`);
            }
        }
    }
    /* eslint-enable no-await-in-loop */
}

async function configureDb(logger) {
    const currentConfig = config.getConfig();
    if (!currentConfig.mongodb?.host) {
        logger.fatal('No host found for MongoDB driver.');
        throw new errors.BadConfiguration('No host found for MongoDB driver');
    }

    const dbName = currentConfig.mongodb.db || DEFAULT_DB_NAME;
    const port = currentConfig.mongodb.port || 27017;
    const options = currentConfig.mongodb.replicaSet ? { replicaSet: currentConfig.mongodb.replicaSet } : {};

    await init(
        logger,
        currentConfig.mongodb.host,
        dbName,
        port,
        currentConfig.username,
        currentConfig.password,
        options
    );
}

exports.configureDb = configureDb;
exports.db = defaultDb;
exports.DEFAULT_DB_NAME = DEFAULT_DB_NAME;
