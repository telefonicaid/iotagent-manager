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

const protocols = require('./protocolData');
const request = require('iotagent-node-lib').request;
const logger = require('logops');
const errors = require('../errors');
const _ = require('underscore');
const async = require('async');
const domain = require('../utils/domain');
const fillService = domain.fillService;
var context = {
    op: 'IoTAManager.Redirector'
};

function guessCollection(body) {
    if (body.services) {
        return 'services';
    } else if (body.devices) {
        return 'devices';
    }
    return null;
}

function extractProtocols(body) {
    const collectionName = guessCollection(body);
    let protocols;

    logger.debug(context, 'Extracting protocols from body for collection [%s]', collectionName);

    function extractProtocol(previous, item) {
        if (item.protocol) {
            if (Array.isArray(item.protocol)) {
                return _.union(previous, item.protocol);
            }
            previous.push(item.protocol);

            return _.uniq(previous);
        }
        return previous;
    }

    if (collectionName) {
        protocols = body[collectionName].reduce(extractProtocol, []);

        logger.debug(context, 'Protocols found: %j', protocols);

        return protocols;
    }
    return null;
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
        protocols.get(item, function (error, protocol) {
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

        if (req.protocolId.length === 0) {
            next(new errors.ProtocolNotFound('', ''));
        }

        async.reduce(req.protocolId, {}, addProtocolAsync, function endReduction(error, result) {
            req.protocolObj = result;
            next(error);
        });
    } else {
        logger.debug(context, 'Finding objects for all the protocols');

        protocols.list(function (error, protocols) {
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
    const collectionName = guessCollection(req.body);
    const collections = {};
    let clonedObject;

    if (!collectionName) {
        return collections;
    }

    for (let i = 0; i < req.body[collectionName].length; i++) {
        if (Array.isArray(req.body[collectionName][i].protocol)) {
            for (let j = 0; j < req.body[collectionName][i].protocol.length; j++) {
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

            if (!collections[req.body[collectionName][i].protocol]) {
                collections[req.body[collectionName][i].protocol] = {};
            }

            if (!collections[req.body[collectionName][i].protocol][collectionName]) {
                collections[req.body[collectionName][i].protocol][collectionName] = [];
            }

            collections[req.body[collectionName][i].protocol][collectionName].push(
                _.clone(req.body[collectionName][i])
            );
        }
    }

    return collections;
}

/**
 * Create the redirected request based on the protocol information and the original request. For backwards compatibility
 * the IoT Agent Manager removes the "/iot" prefix from the protocol address if found.
 *
 * @param {Object} req           Original request object to be forwarded.
 * @param {String} protocol      ID of the protocol where the request will be forwarded
 * @param {Object} body          JSON body of the original request.
 * @return {Object}             Request object prepared to be sent.
 */
function createRequest(req, protocol, body) {
    const options = {
        qs: _.clone(req.query),
        method: req.method,
        headers: req.headers
    };
    const protocolObj = req.protocolObj[protocol];
    let protocolAddress = protocolObj.iotagent;

    logger.debug(context, 'creating request using protocol:\n\n%j\n', protocolObj);

    // Save original apikey before be overwrite by apikey from body (probably modified)
    if (req.query.apikey) {
        options.qs.apikeyReq = req.query.apikey;
    }
    if (protocolObj.resource) {
        options.qs.resource = protocolObj.resource;
    }
    if (protocolObj.protocol) {
        options.qs.protocol = protocolObj.protocol;
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

    context = fillService(context, {
        service: options.headers['fiware-service'],
        subservice: options.headers['fiware-servicepath']
    });
    logger.debug(context, 'Forwarding request:\n\n%j\n', options);

    return options;
}

function createRequests(req, res, next) {
    function mapToBody(split, protocol) {
        return createRequest(req, protocol, split[protocol]);
    }

    if (req.splitAndRedirect) {
        const split = splitByProtocol(req);

        logger.debug(context, 'Creating request for multiple elements');

        req.requests = req.protocolId.map(mapToBody.bind(null, split));
    } else {
        logger.debug(context, 'Creating request for redirecting single requests');
        req.requests = [];
        for (let i = 0; i < req.protocolId.length; i++) {
            req.requests.push(createRequest(req, req.protocolId[i], req.body));
        }
    }

    next();
}

function processRequests(req, res, next) {
    function extractStatusCode(result) {
        if (result && result.length === 2 && result[0].statusCode) {
            return result[0].statusCode;
        }
        return 0;
    }

    function sendRequest(options, callback) {
        logger.debug(context, 'Sending redirection with following options: %j', options);
        // Use original apikey, not apikey from body
        if (options.qs.apikeyReq) {
            options.qs.apikey = options.qs.apikeyReq;
        }

        request(options, function (error, response, body) {
            if (error) {
                // Parsing is done directly within the Got library.
                if (error.name === 'ParseError') {
                    logger.error(
                        context,
                        'REDIRECTION-003: Error parsing response body from the redirected request: %s to [%s]',
                        error,
                        options.uri
                    );
                    return callback(new errors.TargetResponseError({ msg: error.name }));
                }

                logger.error(
                    context,
                    'REDIRECTION-001: Error found redirecting requests to [%s]: %j',
                    options.uri,
                    error
                );

                return callback(new errors.TargetServerError(error));
            } else if (response.statusCode >= 500) {
                logger.error(
                    context,
                    'REDIRECTION-002: Wrong status code detected [%s] and body response [%s] redirecting request to [%s]',
                    response.statusCode,
                    response.body,
                    options.uri
                );
                return callback(
                    new errors.TargetServerError(
                        'Wrong status code detected [' +
                            response.statusCode +
                            '] and body response [' +
                            response.body +
                            '] redirecting request to [' +
                            options.uri +
                            ']'
                    )
                );
            } else if (body) {
                let parseError;
                if (response.statusCode === 409) {
                    parseError = new errors.DuplicateError(body);
                }
                logger.debug(context, 'Response body from the redirected request parsed: \n\n%j\n', body);
                return callback(parseError, [response, body]);
            } else {
                return callback(null, [response, null]);
            }
        });
    }

    function combineResults(results) {
        let totalCount = 0;
        let finalResult = [];
        let collectionName;
        const resultObj = {};

        if (results[0] && results[0][1]) {
            if (results[0][1].devices || results[0][1].device_id) {
                collectionName = 'devices';
            } else if (results[0][1].services) {
                collectionName = 'services';
            } else {
                return null;
            }
        } else {
            return null;
        }

        for (let i = 0; i < results.length; i++) {
            logger.debug(context, 'results[%s][1] %j ', i, results[i][1]);

            if (results[i][1].count) {
                totalCount += results[i][1].count;
            } else {
                // Check if really there are some results in response
                if (results[i][1][collectionName]) {
                    if (results[i][1][collectionName].length > 0) {
                        totalCount += results[i][1][collectionName].length;
                    }
                } else if (results[i][1].length > 0) {
                    totalCount += results[i][1].length;
                }
                // Detect single device response but not Repsol empty device response
                if ('attributes' in results[i][1]) {
                    totalCount++;
                }
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
        let combinedResult;
        if (error) {
            logger.error(context, 'The redirection ended up in error: ', error);
            next(error);
        } else {
            const statusCodes = _.uniq(results.map(extractStatusCode));
            if (statusCodes.length === 1) {
                if (req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT') {
                    res.status(statusCodes[0]).send();
                } else if (results.length >= 1) {
                    combinedResult = combineResults(results);

                    if (combinedResult) {
                        res.status(statusCodes[0]).json(combinedResult);
                    } else {
                        next(new errors.TargetServerError('No valid replies from any IoTAgent', statusCodes[0]));
                    }
                } else {
                    res.status(statusCodes[0]).json({});
                }
            } else {
                const errorMsg =
                    'Wrong status code obtained in some of the responses [' +
                    JSON.stringify(statusCodes) +
                    '] redirecting request';

                logger.error(context, errorMsg);

                next(new errors.TargetServerError(errorMsg));
            }
        }
    }

    async.map(req.requests, sendRequest, requestHandler);
}

function loadContextRoutes(router) {
    const middlewareList = [queryParamExtractor, getProtocols, createRequests, processRequests];

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

// Ccustom handleError for IOTAM CPP backward compability

/* eslint-disable-next-line no-unused-vars */
function handleError(error, req, res, next) {
    let code = 500;

    logger.info(context, 'Error [%s] handling request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    const response = {
        name: error.name,
        message: error.message
    };
    // Expect IOTAM CPP format: errors[{ endpoint, code, details { name, mesage} }]
    if (error.errors) {
        response.errors = error.errors;
    }
    // Expect BodyPaser error from Express
    if (error.name === 'SyntaxError') {
        code = 400;
    }
    res.status(code).json(response);
}

exports.handleError = handleError;
