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

var protocolTemplate = require('../templates/protocol.json'),
    Protocol = require('../model/Protocol'),
    protocols = require('./protocolData'),
    async = require('async'),
    logger = require('logops'),
    middleware = require('iotagent-node-lib').middlewares,
    context = {
        op: 'IoTAManager.ProtocolAPI'
    };

function readProtocolList(req, res, next) {
    var condition = {},
        query;

    logger.debug(context, 'List protocols request');

    query = Protocol.model.find(condition).sort();

    if (req.query && req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }

    if (req.query && req.query.offset) {
        query.skip(parseInt(req.query.offset, 10));
    }

    async.series([
        query.exec.bind(query),
        Protocol.model.count.bind(Protocol.model, condition)
    ], function(error, results) {
        req.protocolList = results[0];
        req.protocolCount = results[1];

        next();
    });
}

function saveProtocol(req, res, next) {
    logger.debug(context, 'Update/create protocol request: %j', req.body);

    protocols.save(req.body, next);
}

function handleProtocolList(req, res, next) {
    res.status(200).json({
        count: req.protocolCount,
        protocols: req.protocolList
    });
}

function returnProtocolCreationResponse(req, res, next) {
    res.status(200).json({});
}

function loadContextRoutes(router) {
    router.get('/iot/protocols', [
        readProtocolList,
        handleProtocolList
    ]);

    router.post('/iot/protocols', [
        middleware.validateJson(protocolTemplate),
        saveProtocol,
        returnProtocolCreationResponse
    ]);
}

exports.loadContextRoutes = loadContextRoutes;
