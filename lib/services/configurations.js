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

const errors = require('../errors');
const configurationData = require('./configurationData');
const retrievingAPITranslation = {
    subservice: 'service_path',
    type: 'entity_type',
    internalAttributes: 'internal_attributes',
    staticAttributes: 'static_attributes',
    timestamp: 'timestamp',
    autoprovision: 'autoprovision',
    description: 'description',
    explicitAttrs: 'explicitAttrs',
    entityNameExp: 'entityNameExp',
    payloadType: 'payloadType',
    transport: 'transport',
    endpoint: 'endpoint'
};

function isInvalidParameter(param) {
    const value = parseInt(param);

    return isNaN(value) || value < 1;
}

function validateListParameters(req, res, next) {
    if (req.query.limit && isInvalidParameter(req.query.limit)) {
        next(new errors.WrongParameterValue(req.query.limit));
    } else if (req.query.offset && isInvalidParameter(req.query.offset)) {
        next(new errors.WrongParameterValue(req.query.offset));
    } else {
        next();
    }
}

function translateToApi(logger, configurations) {
    const services = [];
    const attributeList = [
        '_id',
        '__v',
        'url',
        'iotagent',
        'token',
        'apikey',
        'type',
        'subservice',
        'service',
        'resource',
        'iotagent',
        'description',
        'protocol',
        'internalAttributes',
        'attributes',
        'lazy',
        'staticAttributes',
        'commands',
        'cbHost',
        'timezone',
        'timestamp',
        'autoprovision',
        'explicitAttrs',
        'entityNameExp',
        'payloadType',
        'endpoint',
        'transport'
    ];

    logger.debug('configurations %j', configurations);
    for (let j = 0; j < configurations.services.length; j++) {
        const service = {};

        for (let i = 0; i < attributeList.length; i++) {
            service[retrievingAPITranslation[attributeList[i]] || attributeList[i]] =
                configurations.services[j][attributeList[i]];
        }
        logger.debug('translated to %j', service);
        services.push(service);
    }

    return {
        services,
        count: configurations.count
    };
}

function handleListRequest(req, res, next) {
    const logger = req.logger;
    configurationData.list(
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        req.query.protocol,
        req.query.apikey,
        req.query.type,
        req.query.limit,
        req.query.offset,
        function (error, configurations) {
            if (error) {
                next(error);
            } else {
                res.status(200).json(modifyPayload(req, translateToApi(logger, configurations))); // #FIXME341 - Remove modifyPayload() usage when dropping /iot/services endpoint
            }
        }
    );
}
// #FIXME341 - Remove this function when dropping /iot/services endpoint
function modifyPayload(req, payload) {
    if (req._parsedUrl.pathname === '/iot/groups') {
        if (payload.services) {
            payload.groups = payload.services;
            delete payload.services;
        }
    }
    return payload;
}

function loadContextRoutes(router) {
    router.get('/iot/services', [validateListParameters, handleListRequest]); // #FIXME341 - Remove this function when dropping /iot/services endpoint
    router.get('/iot/groups', [validateListParameters, handleListRequest]);
}

exports.loadContextRoutes = loadContextRoutes;
