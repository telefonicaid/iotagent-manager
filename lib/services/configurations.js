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
    configurationData = require('./configurationData');

function isValidParameter(param) {
    return typeof param !== 'number' || param < 1;
}

function validateListParameters(req, res, next) {
    if (req.query.limit && !isValidParameter(req.query.limit)) {
        next(new errors.WrongParameterValue(req.query.limit));
    } else if (req.query.offset && !isValidParameter(req.query.offset)) {
        next(new errors.WrongParameterValue(req.query.offset));
    } else {
        next();
    }
}

function handleListRequest(req, res, next) {
    configurationData.list(
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        req.limit,
        req.offset,
        function(error, configurations) {
            if (error) {
                next(error);
            } else {
                res.status(200).json(configurations);
            }
        });
}

function loadContextRoutes(router) {
    router.get('/iot/services', [
        validateListParameters,
        handleListRequest
    ]);
}

exports.loadContextRoutes = loadContextRoutes;
