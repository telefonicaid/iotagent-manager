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

var logger = require('logops'),
    revalidator = require('revalidator'),
    iotaInformation,
    context = {
        op: 'IoTAManager.GenericMiddlewares'
    };

function handleError(error, req, res, next) {
    var code = 500;

    logger.debug('Error [%s] handing request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        name: error.name,
        message: error.message
    });
}

function traceRequest(req, res, next) {
    logger.debug('Request for path [%s] from [%s]', req.path, req.get('host'));

    if (req.is('json')) {
        logger.debug('Body:\n\n%s\n\n', JSON.stringify(req.body, null, 4));
    } else if (req.is('xml')) {
        logger.debug('Body:\n\n%s\n\n', req.rawBody);
    } else {
        logger.debug('Unrecognized body type', req.headers['content-type']);
    }

    next();
}

function retrieveVersion(req, res, next) {
    res.status(200).json(iotaInformation);
}

function changeLogLevel(req, res, next) {
    var levels = ['INFO', 'ERROR', 'FATAL', 'DEBUG', 'WARNING'];

    if (!req.query.level) {
        res.status(400).json({
            error: 'log level missing'
        });
    } else if (levels.indexOf(req.query.level.toUpperCase()) < 0) {
        res.status(400).json({
            error: 'invalid log level'
        });
    } else {
        logger.setLevel(req.query.level.toUpperCase());
        res.status(200).send('');
    }
}

function setIotaInformation(newIoTAInfo) {
    iotaInformation = newIoTAInfo;
}

function validateJson(template) {
    return function validate(req, res, next) {
        if (req.is('json')) {
            var errorList = revalidator.validate(req.body, template);

            if (errorList.valid) {
                next();
            } else {
                logger.debug('Errors found validating request: %j', errorList);
                next(new errors.BadRequest('Errors found validating request.'));
            }
        } else {
            next();
        }
    };
}

exports.handleError = handleError;
exports.traceRequest = traceRequest;
exports.retrieveVersion = retrieveVersion;
exports.changeLogLevel = changeLogLevel;
exports.setIotaInformation = setIotaInformation;
exports.validateJson = validateJson;