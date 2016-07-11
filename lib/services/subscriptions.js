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

var subscriptionTemplate = require('../templates/subscription.json'),
    Subscription = require('../model/Subscription'),
    async = require('async'),
    middleware = require('iotagent-node-lib').middlewares;

function readSubscriptionList(req, res, next) {
    var condition = {},
        query;

    query = Subscription.model.find(condition).sort();

    if (req.query && req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }

    if (req.query && req.query.offset) {
        query.skip(parseInt(req.query.offset, 10));
    }

    async.series([
        query.exec.bind(query),
        Subscription.model.count.bind(Subscription.model, condition)
    ], function(error, results) {
        req.subscriptionList = results[0];
        req.subscriptionCount = results[1];

        next();
    });
}

function saveSubscription(req, res, next) {
    var subscriptionObj = new Subscription.model(),
        attributeList = ['iotagent', 'resource', 'protocol', 'description'];

    for (var i = 0; i < attributeList.length; i++) {
        subscriptionObj[attributeList[i]] = req.body[attributeList[i]];
    }

    subscriptionObj.save(function saveHandler(error, subscriptionDAO) {
        if (error) {
            next(error);
        } else {
            next(null, subscriptionDAO.toObject());
        }
    });
}

function handleSubscriptionList(req, res, next) {
    res.status(200).json({
        count: req.subscriptionCount,
        protocols: req.subscriptionList
    });
}

function returnSubscriptionCreationResponse(req, res, next) {
    res.status(200).json({});
}

function loadContextRoutes(router) {
    router.get('/iot/protocols', [
        readSubscriptionList,
        handleSubscriptionList
    ]);

    router.post('/iot/protocols', [
        middleware.validateJson(subscriptionTemplate),
        saveSubscription,
        returnSubscriptionCreationResponse
    ]);
}

exports.loadContextRoutes = loadContextRoutes;
