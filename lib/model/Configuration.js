/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Configuration = new Schema({
    url: String,
    resource: String,
    iotagent: String,
    token: String,
    apikey: String,
    entity_type: String,
    service: String,
    protocol: String,
    description: String,
    service_path: String,
    cbHost: String,
    timezone: String,
    commands: Array,
    staticAttributes: Array,
    lazy: Array,
    attributes: Array,
    internalAttributes: Array
});

function load(db) {
    Configuration.index({ apikey: 1, resource: 1, protocol: 1}, { unique: true });
    module.exports.model = db.model('Configuration', Configuration);
    module.exports.internalSchema = Configuration;
}

module.exports.load = load;
