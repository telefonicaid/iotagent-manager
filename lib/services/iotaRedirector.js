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

/*jshint camelcase:false */

var protocols = require('./protocolData'),
    request = require('request'),
    logger = require('logops'),
    errors = require('../errors'),
    _ = require('underscore'),
    async = require('async'),
    context = {
        op: 'IoTAManager.Redirector'
    };

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
    var collectionName = guessCollection(body),
        protocols;

    logger.debug(context, 'Extracting protocols from body for collection [%s]', collectionName);

    function extractProtocol(previous, item) {
        if (item.protocol) {
            if (Array.isArray(item.protocol)) {
                return _.union(previous, item.protocol);
            } else {
                previous.push(item.protocol);

                return _.uniq(previous);
            }
        } else {
            return previous;
        }
    }

    if (collectionName) {
        protocols = body[collectionName].reduce(extractProtocol, []);

        logger.debug(context, 'Protocols found: %j', protocols);

        return protocols;
    } else {
        return null;
    }
}

function queryParamExtractor(req, res, next) {
    if (req.query.protocol) {
        logger.debug(context, 'Protocol found in the query parameters [%s]', req.query.protocol);
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
        logger.debug(context, 'Finding objects for the following protocols: %j', req.protocolId);

        async.reduce(req.protocolId, {}, addProtocolAsync, function endReduction(error, result) {
            req.protocolObj = result;
            next(error);
        });
    } else {
        logger.debug(context, 'Finding objects for all the protocols');

        protocols.list(function(error, protocols) {
            if (error) {
                next(error);
            } else {
                req.protocolId = protocols.map(extractId);
                req.protocolObj = protocols.reduce(addProtocolSync, {});
                logger.debug(context, 'Finding objects for this protocol: %j', req.protocolId);
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
            collections[req.body[collectionName][i].protocol][collectionName] = [_.clone(req.body[collectionName][i])];
        }
    }

    return collections;
}

/**
 * Create the redirected request based on the protocol information and the original request. For backwards compatibility
 * the IoT Agent Manager removes the "/iot" prefix from the protocol address if found.
 *
 * @param {Object} req           Original request object to be forwarded.
 * @param {String} protocol      ID of the protocl where the request will be forwarded
 * @param {Object} body          JSON body of the original request.
 * @return {Object}             Request object prepared to be sent.
 */
function createRequest(req, protocol, body) {
    var options = {
            qs: _.clone(req.query),
            method: req.method,
            headers: req.headers
        },
        protocolObj = req.protocolObj[protocol],
        protocolAddress = protocolObj.iotagent;

    logger.debug(context, 'creating request using protocol:\n\n%j\n', protocolObj);
    delete options.qs.protocol;

    // Save original apikey before be overwrite by apikey from body (probably modified)
    if (req.query.apikey) {
        options.qs.apikeyReq = req.query.apikey;
    }
    if (protocolObj.resource) {
        options.qs.resource = protocolObj.resource;
    }
    if (protocolAddress.substr(-1) === '/') {
        protocolAddress = protocolAddress.slice(0, -1);
    }

    if (protocolAddress.substr(-4) === '/iot') {
        protocolAddress = protocolAddress.slice(0, -4);
    }

    options.uri = protocolAddress + req.path;

    if (body && body.services) {
        body.services = body.services.map(function cleanProtocol(item) {
            delete item.protocol;
            return item;
        });
        // Translate body.services

        if (req.method === 'PUT') {
            body = body.services[0];
        }
    }

    if (req.method === 'PUT' || req.method === 'POST') {
        options.body = JSON.stringify(body);
    }

    delete options.headers['content-length'];
    options.headers.connection = 'close';

    logger.debug(context, 'Forwarding request:\n\n%j\n', options);

    return options;
}


function createRequests(req, res, next) {
    function mapToBody(split, protocol) {
        return createRequest(req, protocol, split[protocol]);
    }

    if (req.splitAndRedirect) {
        var split = splitByProtocol(req);

        logger.debug(context, 'Creating request for multiple elements');

        req.requests = req.protocolId.map(mapToBody.bind(null, split));
    } else {
        logger.debug(context, 'Creating request for redirecting single requests');
        req.requests = [];
        for (var i = 0; i < req.protocolId.length; i++) {
            req.requests.push(createRequest(req, req.protocolId[i], req.body));
        }
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
        logger.debug(context, 'Sending redirection with following options: %j', options);
        // Use original apikey, not apikey from body
        if (options.qs.apikeyReq) {
            options.qs.apikey = options.qs.apikeyReq;
        }
        request(options, function(error, response, body) {
            if (error) {
                logger.error(context, 'Error found redirecting requests: %j', error);

                callback(new errors.TargetServerError(error));
            } else if (response.statusCode !== 200 &&
                       response.statusCode !== 201 &&
                       response.statusCode !== 204 &&
                       response.statusCode !== 409) {
                logger.error(context, 'Wrong status code detected [%s] and body response [%s] redirecting request',
                             response.statusCode,
                             response.body);
                callback(new errors.TargetServerError(
                    'Wrong status code detected [' + response.statusCode + '] and body response [' + response.body +
                        '] redirecting request'));
            } else if (body && body.length > 0) {
                var parsedBody,
                    parseError;

                try {
                    parsedBody = JSON.parse(body);
                    if (response.statusCode === 409) {
                        parseError = new errors.DuplicateGroup();
                    }
                    logger.debug(context, 'Response body from the redirected request parsed: %j', parsedBody);
                } catch (e) {
                    logger.error(context, 'Error parsing response body from the redirected request: %s', e);
                    parseError = new errors.TargetResponseError(e);
                }

                callback(parseError, [response, parsedBody]);
            } else {
                callback(null, [response, null]);
            }
        });
    }

    function combineResults(results) {
        /* jshint camelcase: false */

        var totalCount = 0,
            finalResult = [],
            collectionName,
            resultObj = {};

        if (results[0] && results[0][1]) {
            if (results[0][1].services || results[0][1].apikey) {
                collectionName = 'services';
            } else if (results[0][1].devices || results[0][1].device_id) {
                collectionName = 'devices';
            } else {
                return null;
            }
        } else {
            return null;
        }

        for (var i = 0; i < results.length; i++) {
            logger.debug(context, 'results[%s][1] %j ', i, results[i][1]);
            if (results[i][1].count && results[i][1].count > 0) {
                totalCount += results[i][1].count;
            } else if (results[i][1].devices && results[i][1].devices.length > 0) {
                totalCount += results[i][1].devices.length;
            } else {  // simple device
                totalCount++;
            }

            if (results[i][1][collectionName]) {
                finalResult = finalResult.concat(results[i][1][collectionName]);
            } else {
                finalResult = finalResult.concat(results[i][1]);
            }
        }
        resultObj.count = totalCount;
        resultObj[collectionName] = finalResult;

        return resultObj;
    }

    function requestHandler(error, results) {
        var combinedResult;

        if (error) {
            logger.error(context, 'The redirection ended up in error: ', error);
            next(error);
        } else {
            logger.debug(context, 'results %j', results);
            var statusCodes = _.uniq(results.map(extractStatusCode));

            if (statusCodes.length === 1) {
                if (req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT') {
                    res.status(statusCodes[0]).send();
                } else if (results.length >= 1) {
                    combinedResult = combineResults(results);

                    if (combinedResult) {
                        res.status(statusCodes[0]).json(combinedResult);
                    } else {
                        next(new errors.TargetServerError('No valid replies from any IoTAgent'));
                    }
                } else {
                    res.status(statusCodes[0]).json({});
                }
            } else {
                var errorMsg = 'Wrong status code obtained in some of the responses [' +
                    JSON.stringify(statusCodes) + '] redirecting request';

                logger.error(context, errorMsg);

                next(new errors.TargetServerError(errorMsg));
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
