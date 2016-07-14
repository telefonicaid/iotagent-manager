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

var protocolTemplate = require('../templates/protocol.json'),
    Protocol = require('../model/Protocol'),
    Configuration = require('../model/Configuration'),
    async = require('async'),
    apply = async.apply,
    middleware = require('iotagent-node-lib').middlewares,
    provisioningAPITranslation = {
        /* jshint camelcase:false */

        name: 'id',
        service: 'service',
        service_path: 'subservice',
        entity_name: 'name',
        entity_type: 'type',
        internal_attributes: 'internalAttributes'
    };

function readProtocolList(req, res, next) {
    var condition = {},
        query;

    query = Protocol.model.find(condition).sort();

    if (req.query && req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }

    if (req.query && req.query.offset) {
        query.skip(parseInt(req.query.offset, 10));
    }

    async.series([
        query.exec.bind(query),
        Protocol.model.count.bind(Protocol.model, condition)
    ], function(error, results) {
        req.protocolList = results[0];
        req.protocolCount = results[1];

        next();
    });
}

function getProtocol(req, res, next) {
    var condition = {
            resource: req.body.resource,
            protocol: req.body.protocol
        },
        query;

    query = Protocol.model.find(condition).sort();

    query.exec(function(error, protocol) {
        if (!error && protocol && protocol.length === 1) {
            req.protocolObj = protocol[0];
        }

        next();
    });
}

function saveConfiguration(protocol, iotagent, resource, configuration, callback) {
    var configurationObj = new Configuration.model(),
        attributeList = [
            'name',
            'apikey',
            'token',
            'service',
            'service_path',
            'entity_name',
            'entity_type',
            'timezone',
            'transport',
            'endpoint',
            'attributes',
            'commands',
            'lazy',
            'internal_attributes'
        ];

    configurationObj.protocol = protocol;
    configurationObj.iotagent = iotagent;
    configurationObj.resource = resource;

    for (var i = 0; i < attributeList.length; i++) {
        configurationObj[provisioningAPITranslation[attributeList[i]] || attributeList[i]] =
            configuration[attributeList[i]];
    }

    configurationObj.save(callback);
}

function saveProtocol(req, res, next) {
    var protocolObj = req.protocolObj || new Protocol.model(),
        attributeList = ['iotagent', 'resource', 'protocol', 'description'],
        actions = [];

    for (var i = 0; i < attributeList.length; i++) {
        protocolObj[attributeList[i]] = req.body[attributeList[i]];
    }

    if (req.body.services) {
        actions.push(apply(async.map,
            req.body.services,
            apply(saveConfiguration, protocolObj.protocol, protocolObj.iotagent, protocolObj.resource)));
    }

    actions.push(protocolObj.save.bind(protocolObj));

    async.series(actions, next);
}

function handleProtocolList(req, res, next) {
    res.status(200).json({
        count: req.protocolCount,
        protocols: req.protocolList
    });
}

function returnProtocolCreationResponse(req, res, next) {
    res.status(200).json({});
}

function loadContextRoutes(router) {
    router.get('/iot/protocols', [
        readProtocolList,
        handleProtocolList
    ]);

    router.post('/iot/protocols', [
        middleware.validateJson(protocolTemplate),
        getProtocol,
        saveProtocol,
        returnProtocolCreationResponse
    ]);
}

exports.loadContextRoutes = loadContextRoutes;
