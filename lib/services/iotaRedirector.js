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
    errors = require('../errors'),
    _ = require('underscore'),
    async = require('async');

function guessCollection(body) {
    if (body.services) {
        return 'services';
    } else if (body.devices) {
        return 'devices';
    } else {
        return null;
    }
}

function extractProtocols(body) {
    var collectionName = guessCollection(body);

    function extractProtocol(previous, item) {
        if (item.protocol) {
            if (Array.isArray(item.protocol)) {
                return _.union(previous, item.protocol);
            } else {
                previous.push(item);

                return _.uniq(previous);
            }
        } else {
            return previous;
        }
    }

    if (collectionName) {
        return body[collectionName].reduce(extractProtocol, []);
    } else {
        return null;
    }
}

function queryParamExtractor(req, res, next) {
    if (req.query.protocol) {
        req.protocolId = [req.query.protocol];
    } else if (req.method !== 'GET') {
        req.splitAndRedirect = true;
        req.protocolId = extractProtocols(req.body);
    }

    next();
}

function getProtocols(req, res, next) {
    function addProtocolAsync(previous, item, callback) {
        protocols.get(item, function(error, protocol) {
            if (error) {
                callback(error);
            } else {
                previous[item] = protocol;
                callback(null, previous);
            }
        });
    }

    function addProtocolSync(previous, item) {
        previous[item.protocol] = item;
        return previous;
    }

    function extractId(protocol) {
        return protocol.protocol;
    }

    if (req.protocolId) {
        async.reduce(req.protocolId, {}, addProtocolAsync, function endReduction(error, result) {
            req.protocolObj = result;
            next(error);
        });
    } else {
        protocols.list(function(error, protocols) {
            if (error) {
                next(error);
            } else {
                req.protocolId = protocols.map(extractId);
                req.protocolObj = protocols.reduce(addProtocolSync, {});
                next();
            }
        });
    }
}

function splitByProtocol(req) {
    var collectionName = guessCollection(req.body),
        collections = {},
        clonedObject;

    for (var i = 0; i < req.body[collectionName].length; i++) {
        if (Array.isArray(req.body[collectionName][i].protocol)) {
            for (var j = 0; j < req.body[collectionName][i].protocol.length; j++) {
                clonedObject = _.clone(req.body[collectionName][i]);

                clonedObject.protocol = req.body[collectionName][i].protocol[j];
                clonedObject.resource = req.protocolObj[clonedObject.protocol].resource;

                if (collections[req.body[collectionName][i].protocol[j]]) {
                    collections[req.body[collectionName][i].protocol[j]][collectionName].push(clonedObject);
                } else {
                    collections[req.body[collectionName][i].protocol[j]] = {};
                    collections[req.body[collectionName][i].protocol[j]][collectionName] = [clonedObject];
                }
            }
        } else {
            clonedObject = _.clone(req.body[collectionName][i]);

            clonedObject.protocol = req.body[collectionName][i].protocol;
            clonedObject.resource = req.protocolObj[clonedObject.protocol].resource;

            collections[req.body[collectionName][i].protocol] = {};
            collections[req.body[collectionName][i].protocol][collectionName] = _.clone(req.body[collectionName][i]);
        }
    }

    return collections;
}

function createRequest(req, protocol, body) {
    var options = {
            qs: req.query,
            method: req.method,
            headers: req.headers
        },
        protocolObj = req.protocolObj[protocol];

    delete options.qs.protocol;

    if (protocolObj.iotagent.substr(-1) === '/') {
        options.uri = protocolObj.iotagent.slice(0, -1) + req.path;
    } else {
        options.uri = protocolObj.iotagent + req.path;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
        options.body = JSON.stringify(body);
    }

    delete options.headers['content-length'];
    options.headers.connection = 'close';

    logger.debug('Forwarding request:\n\n%j\n', options);

    return options;
}

function createRequests(req, res, next) {
    function mapToBody(split, protocol) {
        return createRequest(req, protocol, split[protocol]);
    }

    if (req.splitAndRedirect) {
        var split = splitByProtocol(req);

        req.requests = req.protocolId.map(mapToBody.bind(null, split));
    } else {
        req.requests = [createRequest(req, req.protocolId[0], req.body)];
    }

    next();
}

function processRequests(req, res, next) {

    function extractStatusCode(result) {
        if (result && result.length === 2 && result[0].statusCode) {
            return result[0].statusCode;
        } else {
            return 0;
        }
    }

    function sendRequest(options, callback) {
        request(options, function(error, response, body) {
            if (error) {
                callback(new errors.TargetServerError(error));
            } else if (response.statusCode !== 200 && response.statusCode !== 201 && response.statusCode !== 204) {
                callback(new errors.TargetServerError(
                        'Wrong status code detected [' + response.statusCode + '] redirecting request'));
            } else {
                var parsedBody;

                try {
                    parsedBody = JSON.parse(body);
                    callback(null, [response, parsedBody]);
                } catch (e) {
                    callback(new errors.TargetResponseError(e));
                }
            }
    });
    }

    function combineResults(results) {
        var totalCount = 0,
            finalResult = [],
            collectionName,
            resultObj = {};

        if (results[0] && results[0][1] && results[0][1].services) {
            collectionName = 'services';
        } else {
            collectionName = 'devices';
        }

        for (var i = 0; i < results.length; i++) {
            totalCount += results[i][1].count;

            finalResult = finalResult.concat(results[i][1][collectionName]);
        }

        resultObj.count = totalCount;
        resultObj[collectionName] = finalResult;

        return resultObj;
    }

    function requestHandler(error, results) {
        if (error) {
            next(error);
        } else {
            var statusCodes = _.uniq(results.map(extractStatusCode));

            if (statusCodes.length === 1) {
                if (results.length >= 1 && results[0][1].count) {
                    res.status(statusCodes[0]).json(combineResults(results));
                } if (results.length === 1) {
                    res.status(statusCodes[0]).json(results[0][1]);
                } else {
                    res.status(statusCodes[0]).json({});
                }
            } else {
                next(new errors.TargetServerError('Wrong status code obtained in some of the responses [' +
                    JSON.stringify(statusCodes) + '] redirecting request'));
            }
        }
    }

    async.map(req.requests, sendRequest, requestHandler);
}

function loadContextRoutes(router) {
    var middlewareList = [
        queryParamExtractor,
        getProtocols,
        createRequests,
        processRequests
    ];

    router.post('/iot/services', middlewareList);
    router.post('/iot/devices', middlewareList);
    router.put('/iot/services', middlewareList);
    router.delete('/iot/services', middlewareList);
    router.get('/iot/devices', middlewareList);
    router.get('/iot/devices/:id', middlewareList);
    router.put('/iot/devices/:id', middlewareList);
    router.delete('/iot/devices/:id', middlewareList);

}

exports.loadContextRoutes = loadContextRoutes;
