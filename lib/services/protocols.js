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

const protocolTemplate = require('../templates/protocol.json');
const Protocol = require('../model/Protocol');
const protocols = require('./protocolData');
const async = require('async');
//const logger = require('logops');
const middleware = require('iotagent-node-lib').middlewares;
// const context = {
//     op: 'IoTAManager.ProtocolAPI'
// };

function readProtocolList(req, res, next) {
    const logger = req.logger;
    const condition = {};

    logger.debug('List protocols request with args %j', JSON.stringify(req.query));

    const query = Protocol.model.find(condition).sort();

    if (req.query && req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }

    if (req.query && req.query.offset) {
        query.skip(parseInt(req.query.offset, 10));
    }

    async.series([query.exec.bind(query), Protocol.model.countDocuments.bind(Protocol.model, condition)], function (
        error,
        results
    ) {
        if (error) {
            logger.error('error: %j', error);
            next(error);
        } else {
            logger.debug('results of query: %j', results);
            req.protocolList = results[0];
            req.protocolCount = results[1];
            next();
        }
    });
}

function saveProtocol(req, res, next) {
    const logger = req.logger;
    logger.debug('Update/create protocol request: %j', req.body);

    protocols.save(logger, req.body, next);
}
/* eslint-disable-next-line no-unused-vars */
function handleProtocolList(req, res, next) {
    res.status(200).json({
        count: req.protocolCount,
        protocols: req.protocolList
    });
}
/* eslint-disable-next-line no-unused-vars */
function returnProtocolCreationResponse(req, res, next) {
    res.status(200).json({});
}
/* eslint-disable-next-line no-unused-vars */
function deleteProtocol(req, res, next) {
    const logger = req.logger;
    protocols.remove(logger, req.params.id, function (error) {
        if (error) {
            res.status(error.code).json(error);
        } else {
            res.status(200).json({});
        }
    });
}

function loadContextRoutes(router) {
    router.get('/iot/protocols', [readProtocolList, handleProtocolList]);

    router.post('/iot/protocols', [
        middleware.validateJson(protocolTemplate),
        saveProtocol,
        returnProtocolCreationResponse
    ]);

    router.delete('/iot/protocols/:id', [deleteProtocol]);
}

exports.loadContextRoutes = loadContextRoutes;
