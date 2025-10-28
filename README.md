# iotagent-manager

[![Coverage Status](https://coveralls.io/repos/github/telefonicaid/iotagent-manager/badge.svg?branch=master)](https://coveralls.io/github/telefonicaid/iotagent-manager?branch=master)

## Index

-   [Overview](#overview)
-   [Configuration](#configuration)
-   [Installation](#installation)
-   [Usage](#usage)
-   [Subscription API](#subscriptionapi)
-   [Development Documentation](#development)

## <a name="overview"/> Overview

### Description

The IoT Agent Manager works as a proxy for scenarios where multiple IoT Agents offer different southbound protocols. The
IoTA Manager appears as a single administration endpoint for provisioning tasks, redirecting provisioning requests to
the appropriate IoTAgent based on the declared protocol.

The IoTAgent Manager also offers a cache of all the provided device Configurations, to fasten the retrieval of certain
information from the Agents.

Additional information about operating the component can be found in the [Operations: logs and
alarms](docs/operations.md) document.

## <a name="configuration"/> Configuration

The IoT Agent Manager main configuration point is the `config.js` file at the root of the project. The following section
explains each configuration parameter in detail.

### Configuration parameters

-   **server.port**: port where the server will be listening for connections.
-   **server.host**: address the server will bind to.
-   **mongodb.uri**: uri where the Mongo DB instance is listening.
-   **bodyParserLimit**: set bodyParser limit. Default is 5Mb.
-   **logLevel**: set the log level for the internal logger. Its allowed values are: FATAL, ERROR, WARNING, INFO and
    DEBUG.

### Environment variables

Some of the configuration parameters can also be modified using environment variables when starting the process. The
following table shows the correspondence between allowed environment variables and configuration parameters.

| Environment variable  | Configuration attribute |
| :-------------------- | :---------------------- |
| IOTA_SERVER_PORT      | server.port             |
| IOTA_SERVER_HOST      | server.host             |
| IOTA_MONGO_URI        | mongodb.uri             |
| IOTA_BODYPARSER_LIMIT | bodyParserLimit         |
| IOTA_LOG_LEVEL        | logLevel                |

## <a name="installation"/> Installation

There are two ways of installing the IoT Agent Manager: using Git or RPMs.

### Using GIT

In order to install the IoT Agent Manager, just clone the project and install the dependencies:

```console
git clone https://github.com/telefonicaid/iotagent-manager.git
npm install
```

In order to start the IoT Agent Manager, from the root folder of the project, type:

```console
bin/iota-manager
```

### Using RPM

The project contains a script for generating an RPM that can be installed in Red Hat 6.5 compatible Linux distributions.
The RPM depends on Node.js 0.10 version, so EPEL repositories are advisable.

In order to create the RPM, execute the following scritp, inside the `/rpm` folder:

```console
create-rpm.sh -v <versionNumber> -r <releaseNumber>
```

Once the RPM is generated, it can be installed using the followogin command:

```console
yum localinstall --nogpg <nameOfTheRPM>.rpm
```

The IoTA Manager will then be installed as a linux service, and can ve started with the `service` command as usual:

```console
service iotamanager start
```

### Docker installation

The Docker automatically starts listening in the API ports, so there is no need to execute any process in order to have
the application running. The Docker image will automatically start.

In order to run the docker image, first you must have a MongoDB instance running. You can achieve this by executing the
following command:

```console
   docker run -d -p 27017:27017 --hostname mongo --name mongo mongo:6.0.12
```

### Build your own Docker image

There is also the possibility to build your own local Docker image of the IOTagent-manager component.

To do it, follow the next steps once you have installed Docker in your machine:

1. Navigate to the path where the component repository was cloned.
2. Launch a Docker build
    - Using the default NodeJS version of the operating system used defined in FROM keyword of Dockerfile:
    ```bash
    sudo docker build -f Dockerfile .
    ```
    - Using an alternative NodeJS version:
    ```bash
    sudo docker build --build-arg NODEJS_VERSION=0.10.46 -f Dockerfile .
    ```

Once the MongoDB instance is running, you can execute the IoT Manager with the following command:

```console
docker run -d  --link mongodb:mongo -e "IOTA_LOG_LEVEL=DEBUG" -e "IOTA_MONGO_URI=mongodb://mongo:27017" -p 8082:8082 telefonicaiot/iotamanager
```

### Using PM2

The IoT Agent Manager within the Docker image can be run encapsulated within the [pm2](http://pm2.keymetrics.io/)
Process Manager by adding the `PM2_ENABLED` environment variable.

```console
docker run --name iotagent-manager -e PM2_ENABLED=true -d fiware/iotagent-manager
```

Use of pm2 is **disabled** by default. It is unnecessary and counterproductive to add an additional process manager if
your dockerized environment is already configured to restart Node.js processes whenever they exit (e.g. when using
[Kubernetes](https://kubernetes.io/))

## <a name="usage"/> Usage

In order to execute the IoT Agent Manager just execute the following command from the root folder:

```console
bin/iota-manager.js
```

This will start the IoT Agent Manager in the foreground. Use standard linux commands to start it in background.

When started with no arguments, the IoT Agent Manager will expect to find a `config.js` file with the configuration in
the root folder. An argument can be passed with the path to a new configuration file (relative to the application
folder) to be used instead of the default one.

## <a name="subscriptionapi"/> Subscription API

#### New Subscription (POST /iot/protocols)

Whenever a new IoT Agent wants to register itself into the IoTAgent Manager, it must send a subscription request to the
following path: ``, indicating the following information:

-   _protocol_: Name of the protocol served by the IoTAgent.
-   _description_: Textual description for its display in portals.
-   _iotagent_: URL address where requests for this IoT Agent will be redirected.
-   _resource_: Unique string used to identify different IoT Agents for the same protocol.
-   _groups_: List of device Configurations available in the IoT Agent. The IoTA Manager saves a cache for all the
    configurations, aimed to be used to fasten the operations agains the IoTA databases.

The following example shows a registration of an IoT Agent that already have some configuration groups registered in the
IoT Agent:

```json
{
    "protocol": "GENERIC_PROTOCOL",
    "description": "A generic protocol",
    "iotagent": "http://smartGondor.com/iot",
    "resource": "/iot/d",
    "groups": [
        {
            "apikey": "801230BJKL23Y9090DSFL123HJK09H324HV8732",
            "token": "8970A9078A803H3BL98PINEQRW8342HBAMS",
            "entity_type": "SensorMachine",
            "resource": "/deviceTest",
            "service": "theService",
            "service_path": "theSubService",
            "attributes": [
                {
                    "name": "status",
                    "type": "Boolean"
                }
            ]
        }
    ]
}
```

This operation can be used also to update the protocol subscriptions. If a protocol creation request arrives to the
IoTAgent Manager with the same protocol and resource of an already existing agent, it will override the record with the
new information.

#### List subscriptions (GET /iot/protocols)

Retrieve the list of all the available protocols, with their available endpoints. The following example shows a sample
response from the server:

```json
{
    "count": 1,
    "protocols": [
        {
            "protocol": "PDI-IoTA-UltraLight",
            "description": "UL2",
            "endpoints": [{ "endpoint": "http://127.0.0.1:8080/iot", "identifier": "idcl1:8080", "resource": "/iot/d" }]
        }
    ]
}
```

The list accepts to query parameters:

-   _limit_: limits the number of entries to return from the query.
-   _offset_: skips the given number of entries from the database before returning the list.

## <a name="development"/> Development documentation

### Project build

The project is managed using npm.

For a list of available task, type

```bash
npm run
```

The following sections show the available options in detail.

### Start

Runs a local version of the IoT Manager

```bash
npm start
```

### Testing

[Mocha](http://visionmedia.github.io/mocha/) Test Runner + [Should.js](https://shouldjs.github.io/) Assertion Library.

The test environment is preconfigured to run BDD testing style.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire)

To run tests, type

```bash
docker run -d -p 27017:27017 mongo:4.4

npm test
```

### Coding guidelines

jshint

Uses provided .jshintrc flag file. To check source code style, type

```bash
npm run lint
```

### Continuous testing

Support for continuous testing by modifying a src file or a test. For continuous testing, type

```bash
npm run test:watch
```

If you want to continuously check also source code style, use instead:

```bash
npm run watch
```

### Code Coverage

Istanbul

Analizes the code coverage of your tests.

To generate an HTML coverage report under `site/coverage/` and to print out a summary, type

```bash
# Use git-bash on Windows
npm run test:coverage
```

### Clean

Removes `node_modules` and `coverage` folders, and `package-lock.json` file so that a fresh copy of the project is
restored.

```bash
# Use git-bash on Windows
npm run clean
```
