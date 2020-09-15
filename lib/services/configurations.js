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
const logger = require('logops');
const domain = require('../utils/domain');
const fillService = domain.fillService;
var context = {
    op: 'IoTAManager.Configurations'
};
const retrievingAPITranslation = {
    subservice: 'service_path',
    type: 'entity_type',
    internalAttributes: 'internal_attributes',
    staticAttributes: 'static_attributes',
    timestamp: 'timestamp',
    expressionLanguage: 'expressionLanguage',
    explicitAttrs: 'explicitAttrs'
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

function translateToApi(configurations) {
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
        'expressionLanguage',
        'explicitAttrs'
    ];

    for (let j = 0; j < configurations.services.length; j++) {
        const service = {};

        for (let i = 0; i < attributeList.length; i++) {
            service[retrievingAPITranslation[attributeList[i]] || attributeList[i]] =
                configurations.services[j][attributeList[i]];
        }
        logger.debug(context, 'configurations %j translated to %j', configurations, service);
        services.push(service);
    }

    return {
        services,
        count: configurations.count
    };
}

function handleListRequest(req, res, next) {
    context = fillService(context, { service: req.headers['fiware-service'],
                                     subservice: req.headers['fiware-servicepath']});
    configurationData.list(
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        req.query.protocol,
        req.query.apikey,
        req.query.type,
        req.query.limit,
        req.query.offset,
        function(error, configurations) {
            if (error) {
                next(error);
            } else {
                res.status(200).json(translateToApi(configurations));
            }
        }
    );
}

function loadContextRoutes(router) {
    router.get('/iot/services', [validateListParameters, handleListRequest]);
}

exports.loadContextRoutes = loadContextRoutes;
