/*
 * Copyright 2014 Telefonica Investigaci�n y Desarrollo, S.A.U
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
 * please contact with::[iot_support@tid.es]
 */

'use strict';

var uuid = require('uuid'),
    constants = require('./constants');

var logger = require('logops');

/**
 * Express middleWare that creates a domain per request
 * It also generates a unique request id that can be used to track requests in logs.
 *
 * @return {Function} Express middleWare.
 */

function requestLogger(componentName) {
    return function (req, res, next) {
        let contextSrv;
        if (req.headers && req.headers[constants.ORGANIZATION_HEADER]) {
            contextSrv = req.headers[constants.ORGANIZATION_HEADER];
        }
        let contextSubsrv;
        if (req.headers && req.headers[constants.PATH_HEADER]) {
            contextSubsrv = req.headers[constants.PATH_HEADER];
        }
        let contextFrom;
        // x-forwarded-for/forwarded overwrites x-real-ip
        if (req.headers[constants.X_REAL_IP_HEADER]) {
            contextFrom = req.headers[constants.X_REAL_IP_HEADER];
        }
        if (req.headers[constants.X_FORWARDED_FOR_HEADER]) {
            contextFrom = req.headers[constants.X_FORWARDED_FOR_HEADER];
        }
        if (req.headers[constants.FORWARDED_HEADER]) {
            contextFrom = req.headers[constants.FORWARDED_HEADER];
        }
        let contextTrans = (req.requestId = uuid.v4());
        let contextCorr = req.get(constants.CORRELATOR_HEADER);
        if (!contextCorr) {
            contextCorr = contextTrans;
        }
        req.corr = contextCorr; // for propagate in FWD request
        res.set(constants.CORRELATOR_HEADER, contextCorr); // for response
        const contextStart = Date.now();
        req.logger = logger.child({
            corr: contextCorr,
            trans: contextTrans,
            op: req.url,
            from: contextFrom,
            srv: contextSrv,
            subsrv: contextSubsrv,
            comp: componentName
        });
        res.once('finish', function () {
            const responseTime = Date.now() - contextStart;
            req.logger.debug('response-time: ' + responseTime + ' statusCode: ' + res.statusCode);
        });
        next();
    };
}

exports.requestLogger = requestLogger;
