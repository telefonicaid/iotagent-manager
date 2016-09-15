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

var errors = require('../errors'),
    configurationData = require('./configurationData'),
    _ = require('underscore'),
    provisioningAPITranslation = {
        /* jshint camelcase:false */

        name: 'id',
        service_path: 'subservice',
        entity_name: 'name',
        entity_type: 'type',
        internal_attributes: 'internalAttributes',
        static_attributes: 'staticAttributes'
        },
    internalTranslation = {
        /* jshint camelcase:false */

        id: 'name',
        subservice: 'service_path',
        name: 'entity_name',
        type: 'entity_type',
        internalAttributes: 'internal_attributes',
        staticAttributes: 'static_attributes'
    };

function applyMap(translationMap, configuration) {
    var result = _.clone(configuration);

    for (var i in configuration) {
        if (result.hasOwnProperty(i) && translationMap[i]) {
            result[translationMap[i]] = result[i];
            delete result[i];
        }
    }

    return result;
}

function isInvalidParameter(param) {
    var value = parseInt(param);

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

function handleListRequest(req, res, next) {

    function clean(item) {
        return applyMap(internalTranslation, item.toObject());
    }

    configurationData.list(
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        req.query.limit,
        req.query.offset,
        function(error, configurations) {
            if (error) {
                next(error);
            } else {
                var cleanedConfigurations = _.clone(configurations);

                cleanedConfigurations.services =
                    cleanedConfigurations.services.map(clean);

                res.status(200).json(cleanedConfigurations);
            }
        });
}

function loadContextRoutes(router) {
    router.get('/iot/services', [
        validateListParameters,
        handleListRequest
    ]);
}

function save(protocol, description, iotagent, resource, configuration, oldConfiguration, callback) {
    configurationData.save(
        protocol,
        description,
        iotagent,
        resource,
        applyMap(provisioningAPITranslation, configuration),
        oldConfiguration,
        callback
    );
}

exports.loadContextRoutes = loadContextRoutes;
exports.save = save;
exports.get = configurationData.get;
