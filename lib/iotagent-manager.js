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

const http = require('http');
const express = require('express');
const config = require('./utils/commonConfig');
const bodyParser = require('body-parser');
const middleware = require('iotagent-node-lib').middlewares;
const packageInformation = require('../package.json');
const protocols = require('./services/protocols');
const configurations = require('./services/configurations');
const iotaRedirector = require('./services/iotaRedirector');
const dbConn = require('./model/dbConn');
const iotaLib = require('iotagent-node-lib');
const async = require('async');
const apply = async.apply;
let northboundServer;
const logger = require('logops');
const loggingMiddleware = require('./utils/logging').requestLogger('IotAgent-Manager');
// const context = {
//     op: 'IoTAManager.NorthboundServer'
// };

/**
 *  Express middleware for tracing the complete request arriving to the IoTA in debug mode.
 */
function traceRequest(req, res, next) {
    const logger = req.logger;
    logger.debug('Request for path [%s] from [%s]', req.path, req.get('host'));
    logger.debug('Headers:\n%j\n', req.headers);
    logger.debug('Request for path [%s] query [%j] from [%s]', req.path, req.query, req.get('host'));

    if (req.is('json') || req.is('application/ld+json')) {
        logger.debug('Body:\n\n%s\n\n', JSON.stringify(req.body, null, 4));
    }

    next();
}

function startServer(newConfig, callback) {
    let baseRoot = '/';

    logger.format = logger.formatters.pipe;

    // logger.getContext = function domainContext() {
    //     var domainObj = require('domain').active || {};
    //     return {
    //         corr: domainObj.corr,
    //         trans: domainObj.trans,
    //         op: domainObj.op,
    //         from: domainObj.from,
    //         srv: domainObj.service,
    //         subsrv: domainObj.subservice,
    //         msg: domainObj.msg,
    //         comp: config.componentName || 'IoTAgentManager'
    //     };
    // };

    northboundServer = {
        server: null,
        app: express(),
        router: express.Router()
    };

    logger.info('Starting IoT Agent Manager listening on port [%s]', newConfig.server.port);
    logger.debug('Using config:\n\n%s\n', JSON.stringify(newConfig, null, 4));

    northboundServer.app.set('port', newConfig.server.port);
    northboundServer.app.set('host', newConfig.server.host || '0.0.0.0');
    northboundServer.app.set('etag', false);
    //northboundServer.app.use(iotaLib.requestDomain);
    northboundServer.app.use(loggingMiddleware);
    northboundServer.app.use(bodyParser.json({ limit: newConfig.bodyParserLimit }));

    if (newConfig.logLevel && newConfig.logLevel === 'DEBUG') {
        //northboundServer.app.use(middleware.traceRequest);
        northboundServer.app.use(traceRequest);
    }

    if (newConfig.server.baseRoot) {
        baseRoot = newConfig.server.baseRoot;
    }

    const iotaInformation = {
        libVersion: packageInformation.dependencies['iotagent-node-lib'],
        port: newConfig.server.port,
        baseRoot
    };

    if (newConfig.iotaVersion) {
        iotaInformation.version = newConfig.iotaVersion;
    }

    middleware.setIotaInformation(iotaInformation);

    northboundServer.router.get('/iot/about', middleware.retrieveVersion);
    northboundServer.router.get('/version', middleware.retrieveVersion);
    northboundServer.router.put('/admin/log', middleware.changeLogLevel);
    northboundServer.router.get('/admin/log', middleware.getLogLevel);

    northboundServer.app.use(baseRoot, northboundServer.router);
    protocols.loadContextRoutes(northboundServer.router);
    configurations.loadContextRoutes(northboundServer.router);
    iotaRedirector.loadContextRoutes(northboundServer.router);

    // Use a custom handleError instead of iotanode-lib for IOTAM cpp backward
    northboundServer.app.use(iotaRedirector.handleError);

    northboundServer.server = http.createServer(northboundServer.app);

    northboundServer.server.listen(northboundServer.app.get('port'), northboundServer.app.get('host'), callback);
}

/**
 * Starts the IoT Manager with the given configuration.
 *
 * @param {Object} newConfig        New configuration object.
 */
function start(newConfig, callback) {
    config.setConfig(newConfig);

    async.series([apply(startServer, newConfig), dbConn.configureDb], callback);
}

/**
 * Stops the current IoT Manager
 *
 */
function stop(callback) {
    logger.info('Stopping IoTA Manager');

    if (northboundServer) {
        northboundServer.server.close(callback);
    } else {
        callback();
    }
}

/**
 * Shuts down the IoT Manager in a graceful manner
 *
 */
function handleShutdown(signal) {
    logger.info('Received %s, starting shutdown processs', signal);
    stop((err) => {
        if (err) {
            logger.error(err);
            return process.exit(1);
        }
        return process.exit(0);
    });
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('SIGHUP', handleShutdown);

exports.start = start;
exports.stop = stop;
