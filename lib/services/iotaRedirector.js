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

var protocols = require('./protocolData'),
    request = require('request'),
    logger = require('logops'),
    errors = require('../errors');

function queryParamExtractor(req, res, next) {
    if (req.query.protocol) {
        req.protocolId = req.query.protocol;
        next();
    } else {
        next(new errors.MissingParameters('protocol'));
    }
}

function redirector(req, res, next) {
    protocols.get(req.protocolId, function(error, protocol) {
        if (error) {
            next(error);
        } else {
            req.protocolObj = protocol;
            next();
        }
    });
}

function sendRequest(req, res, next) {
    var options = {
        qs: req.query,
        method: req.method,
        headers: req.headers
    };

    delete options.qs.protocol;

    if (req.protocolObj.iotagent.substr(-1) === '/') {
        options.uri = req.protocolObj.iotagent.slice(0, -1) + req.path;
    } else {
        options.uri = req.protocolObj.iotagent + req.path;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
        options.body = JSON.stringify(req.body);
    }

    delete options.headers['content-length'];
    options.headers.connection = 'close';

    res.oldWriteHead = res.writeHead;
    res.writeHead = function(statusCode, reasonPhrase, headers) {
        if (res._headers['transfer-encoding']) {
            delete res._headers['transfer-encoding'];
        }

        res.oldWriteHead(statusCode, reasonPhrase, headers);
    };

    logger.debug('Forwarding request:\n\n%j\n', options);

    request(options).on('error', function handleConnectionError(e) {
        logger.error('Error forwarding the request to target proxy: %s', e.message);

        next(new errors.TargetServerError(e.message));
    }).pipe(res);
}

function loadContextRoutes(router) {
    router.post('/iot/services', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

    router.post('/iot/devices', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

    router.put('/iot/services', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

    router.delete('/iot/services', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

    router.get('/iot/devices', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

    router.get('/iot/devices/:id', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

    router.put('/iot/devices/:id', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

    router.delete('/iot/devices/:id', [
        queryParamExtractor,
        redirector,
        sendRequest
    ]);

}

exports.loadContextRoutes = loadContextRoutes;