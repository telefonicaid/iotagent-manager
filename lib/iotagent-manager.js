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

var http = require('http'),
    express = require('express'),
    config = require('./utils/commonConfig'),
    bodyParser = require('body-parser'),
    middleware = require('./utils/genericMiddlewares'),
    packageInformation = require('../package.json'),
    subscriptions = require('./services/subscriptions'),
    iotaLib = require('iotagent-node-lib'),
    iotamInformation,
    northboundServer,
    logger = require('logops'),
    context = {
        op: 'IoTAManager.NorthboundServer'
    };

function start(newConfig, callback) {
    var baseRoot = '/';

    logger.format = logger.formatters.pipe;

    config.setConfig(newConfig);

    northboundServer = {
        server: null,
        app: express(),
        router: express.Router()
    };

    logger.info('Starting IoT Agent Manager listening on port [%s]', newConfig.server.port);
    logger.debug('Using config:\n\n%s\n', JSON.stringify(newConfig, null, 4));

    northboundServer.app.set('port', newConfig.server.port);
    northboundServer.app.set('host', newConfig.server.host || '0.0.0.0');
    northboundServer.app.use(iotaLib.requestDomain);
    northboundServer.app.use(bodyParser.json());

    if (newConfig.logLevel && newConfig.logLevel === 'DEBUG') {
        northboundServer.app.use(middleware.traceRequest);
    }

    if (newConfig.server.baseRoot) {
        baseRoot = newConfig.server.baseRoot;
    }

    middleware.setIotaInformation({
        libVersion: packageInformation.version,
        port: newConfig.server.port,
        baseRoot: baseRoot
    });

    if (newConfig.iotaVersion) {
        iotaInformation.version = newConfig.iotaVersion;
    }

    northboundServer.router.get('/iot/about', middleware.retrieveVersion);
    northboundServer.router.get('/version', middleware.retrieveVersion);
    northboundServer.router.put('/admin/log', middleware.changeLogLevel);

    northboundServer.app.use(baseRoot, northboundServer.router);
    subscriptions.loadContextRoutes(northboundServer.router);

    northboundServer.app.use(middleware.handleError);

    northboundServer.server = http.createServer(northboundServer.app);

    northboundServer.server.listen(northboundServer.app.get('port'), northboundServer.app.get('host'), callback);
}

function stop(callback) {
    logger.info('Stopping IoT Agent');

    if (northboundServer) {
        northboundServer.server.close(callback);
    } else {
        callback();
    }
}

exports.start = start;
exports.stop = stop;
