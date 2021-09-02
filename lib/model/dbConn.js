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
const logger = require('logops');
const async = require('async');
const errors = require('../errors');
let defaultDb;
const DEFAULT_DB_NAME = 'iotagent-manager';
const context = {
    op: 'IoTAManager.DbConn'
};

mongoose.Promise = global.Promise; // not including this causes DeprecationWarning

function loadModels() {
    require('./Protocol').load(defaultDb);
    require('./Configuration').load(defaultDb);
}

/**
 * Creates a new connection to the Mongo DB.
 *
 * @this Reference to the dbConn module itself.
 */
function init(host, db, port, username, password, options, callback) {
    let url;
    let credentials = '';
    let retries = 0;
    let lastError;
    const maxRetries =
        (config.getConfig().mongodb && config.getConfig().mongodb.retries) || constants.DEFAULT_MONGODB_RETRIES;

    if (username && password) {
        credentials = username + ':' + password + '@';
    }

    function addPort(item) {
        return item + ':' + port;
    }

    function commaConcat(previous, current, currentIndex) {
        if (currentIndex !== 0) {
            previous += ',';
        }

        previous += current;

        return previous;
    }

    const hosts = host.split(',').map(addPort).reduce(commaConcat, '');

    url = 'mongodb://' + credentials + hosts + '/' + db;

    if (options.replicaSet) {
        url += '?replicaSet=' + options.replicaSet.rs_name;
    }

    /* eslint-disable-next-line no-unused-vars */
    function createConnectionHandler(error, results) {
        if (defaultDb) {
            logger.info(context, 'Successfully connected to MongoDB.');
            module.exports.db = defaultDb;
            loadModels();
        } else {
            logger.error(context, 'MONGODB-002: Error found after [%d] attempts: %s', retries, error || lastError);
        }

        callback(error);
    }

    function retryCheck() {
        return !defaultDb && retries < maxRetries;
    }

    function connectionAttempt(url, options, callback) {
        logger.info(
            context,
            'Attempting to connect to MongoDB instance with url %j and options %j. Attempt %d',
            url,
            options,
            retries
        );
        // just to avoid warnings with recent mongoose versions
        options.useNewUrlParser = true;
        options.useUnifiedTopology = true;
        mongoose.set('useCreateIndex', true);
        /* eslint-disable-next-line no-unused-vars */
        const candidateDb = mongoose.createConnection(url, options, function (error, result) {
            if (error) {
                logger.error(context, 'MONGODB-001: Error trying to connect to MongoDB: %s', error);
                lastError = error;
            } else {
                defaultDb = candidateDb;

                defaultDb.on('error', function (error) {
                    logger.error(context, 'Mongo Driver error: %j', error);
                });
                /* eslint-disable-next-line no-unused-vars */
                defaultDb.on('connecting', function (error) {
                    logger.debug(context, 'Mongo Driver connecting');
                });
                defaultDb.on('connected', function () {
                    logger.debug(context, 'Mongo Driver connected');
                });
                defaultDb.on('reconnected', function () {
                    logger.debug(context, 'Mongo Driver reconnected');
                });
                defaultDb.on('disconnected', function () {
                    logger.debug(context, 'Mongo Driver disconnected');
                });
                defaultDb.on('reconnectFailed', function () {
                    logger.error(context, 'MONGODB-004: MongoDB connection was lost');
                    process.exit(1);
                });
                defaultDb.on('disconnecting', function () {
                    logger.debug(context, 'Mongo Driver disconnecting');
                });
                defaultDb.on('open', function () {
                    logger.debug(context, 'Mongo Driver open');
                });
                defaultDb.on('close', function () {
                    logger.debug(context, 'Mongo Driver close');
                });
            }

            callback();
        });
    }

    function tryCreateConnection(callback) {
        const attempt = async.apply(connectionAttempt, url, options, callback);
        const seconds =
            (config.getConfig().mongodb && config.getConfig().mongodb.retryTime) ||
            constants.DEFAULT_MONGODB_RETRY_TIME;

        retries++;

        if (retries === 1) {
            logger.info(context, 'First connection attempt');
            attempt();
        } else {
            logger.info(context, 'Waiting %d seconds before attempting again.', seconds);
            setTimeout(attempt, seconds * 1000);
        }
    }

    defaultDb = null;
    async.whilst(retryCheck, tryCreateConnection, createConnectionHandler);
}

function configureDb(callback) {
    const currentConfig = config.getConfig();

    if (!currentConfig.mongodb || !currentConfig.mongodb.host) {
        logger.fatal(context, 'No host found for MongoDB driver.');
        callback(new errors.BadConfiguration('No host found for MongoDB driver'));
    } else {
        let dbName = currentConfig.mongodb.db;
        const port = currentConfig.mongodb.port || 27017;
        const options = {};

        if (!currentConfig.mongodb.db) {
            dbName = DEFAULT_DB_NAME;
        }

        if (currentConfig.mongodb.replicaSet) {
            options.replset = { rs_name: currentConfig.mongodb.replicaSet };
        }

        init(
            config.getConfig().mongodb.host,
            dbName,
            port,
            currentConfig.username,
            currentConfig.password,
            options,
            callback
        );
    }
}

exports.configureDb = configureDb;
exports.db = defaultDb;
exports.DEFAULT_DB_NAME = DEFAULT_DB_NAME;
