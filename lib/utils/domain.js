/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-pep-steelskin
 *
 * fiware-pep-steelskin is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-pep-steelskin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-pep-steelskin.
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[iot_support@tid.es]
 */

'use strict';

var context = {
        op: 'IoTAgentNGSI.DomainControl'
    };


/**
 * Fills service and subservice information in a context object for logging matters.
 *
 * @param {Object} context      Context object that will be used to add the service and subservice information.
 * @param {Object} data         Data object (configuration or device) containing service information.
 * @return {Object}             New context containing service information.
 */
function fillService(context, data) {
    if (data.service) {
        context.srv = data.service;
    }

    if (data.subservice) {
        context.subsrv = data.subservice;
    }

    return context;
}

exports.fillService = fillService;
