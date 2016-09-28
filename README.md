# iotagent-manager

## Index

* [Overview](#overview)
* [Configuration] (#configuration)
* [Installation](#installation)
* [Usage](#usage)
* [Subscription API](#subscriptionapi)
* [Development Documentation](#development)

## <a name="overview"/> Overview
### Description
The IoT Agent Manager works as a proxy for scenarios where multiple IoT Agents offer different southbound protocols.
The IoTA Manager appears as a single administration endpoint for provisioning tasks, redirecting provisioning requests
to the appropriate IoTAgent based on the declared protocol.

The IoTAgent Manager also offers a cache of all the provided device Configurations, to fasten the retrieval of certain
information from the Agents.

## <a name="configuration"/> Configuration
The IoT Agent Manager main configuration point is the `config.js` file at the root of the project. The following section
explains each configuration parameter in detail.

### Configuration parameters
* **server.port**: port where the server will be listening for connections.
* **server.host**: address the server will bind to.
* **mongodb.host**: host where the Mongo DB instance is listening.
* **mongodb.port**: port where the Mongo DB instance is listening.
* **mongodb.db**: name of the Mongo DB database to use.
* **mongodb.replicaSet**: name of the Mongo DB replicaSet to use when using multiple Mongo instances.
* **logLevel**: set the log level for the internal logger. Its allowed values are: FATAL, ERROR, WARNING, INFO and DEBUG.

### Environment variables
Some of the configuration parameters can also be modified using environment variables when starting the process. The
following table shows the correspondence between allowed environment variables and configuration parameters.

| Environment variable      | Configuration attribute             |
|:------------------------- |:----------------------------------- |
| IOTA_SERVER_PORT          | server.port                         |
| IOTA_SERVER_HOST          | server.host                         |
| IOTA_MONGO_HOST           | mongodb.host                        |
| IOTA_MONGO_PORT           | mongodb.port                        |
| IOTA_MONGO_DB             | mongodb.db                          |
| IOTA_MONGO_REPLICASET     | mongodb.replicaSet                  |
| IOTA_LOG_LEVEL            | logLevel                            |

## <a name="installation"/> Installation
There are two ways of installing the IoT Agent Manager: using Git or RPMs.

### Using GIT
In order to install the IoT Agent Manager, just clone the project and install the dependencies:
```
git clone https://github.com/telefonicaid/iotagent-manager.git
npm install
```
In order to start the IoT Agent Manager, from the root folder of the project, type:
```
bin/iota-manager
```

### Using RPM
The project contains a script for generating an RPM that can be installed in Red Hat 6.5 compatible Linux distributions.
The RPM depends on Node.js 0.10 version, so EPEL repositories are advisable.

In order to create the RPM, execute the following scritp, inside the `/rpm` folder:
```
create-rpm.sh -v <versionNumber> -r <releaseNumber>
```

Once the RPM is generated, it can be installed using the followogin command:
```
yum localinstall --nogpg <nameOfTheRPM>.rpm
```

The IoTA Manager will then be installed as a linux service, and can ve started with the `service` command as usual:
```
service iotamanager start
```

### Docker installation
The Docker automatically starts listening in the API ports, so there is no need to execute any process in order to
have the application running. The Docker image will automatically start.

In order to run the docker image, first you must have a MongoDB instance running. You can achieve this by executing
the followin command:
```
docker run --name mongodb -d mongo
```

Once the MongoDB instance is running, you can execute the IoT Manager with the following command:
```
docker run -d  --link mongodb:mongo -e "IOTA_LOG_LEVEL=DEBUG" -e "IOTA_MONGO_HOST=mongo" -p 8082:8082 telefonicaiot/iotamanager
```

## <a name="usage"/> Usage
In order to execute the IoT Agent Manager just execute the following command from the root folder:
```
bin/iota-manager.js
```
This will start the IoT Agent Manager in the foreground. Use standard linux commands to start it in background.

When started with no arguments, the IoT Agent Manager will expect to find a `config.js` file with the configuration in
the root folder. An argument can be passed with the path to a new configuration file (relative to the application folder)
to be used instead of the default one.

## <a name="subscriptionapi"/> Subscription API

#### New Subscription (POST /iot/protocols)
Whenever a new IoT Agent wants to register itself into the IoTAgent Manager, it must send a subscription request to
the following path: ``, indicating the following information:
* *protocol*: Name of the protocol served by the IoTAgent.
* *description*: Textual description for its display in portals.
* *iotagent*: URL address where requests for this IoT Agent will be redirected.
* *resource*: Unique string used to identify different IoT Agents for the same protocol.
* *services*: List of device Configurations available in the IoT Agent. The IoTA Manager saves a cache for all the
configurations, aimed to be used to fasten the operations agains the IoTA databases.

The following example shows a registration of an IoT Agent that already have some configuration groups registered in the
IoT Agent:
```
{
  "protocol": "GENERIC_PROTOCOL",
  "description": "A generic protocol",
  "iotagent": "http://smartGondor.com/iot",
  "resource": "/iot/d",
  "services": [
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
```
{
   "count": 1,
   "protocols": [
     {
       "protocol" : "PDI-IoTA-UltraLight",
       "description" : "UL2",
       "endpoints" : [
          { "endpoint" : "http://127.0.0.1:8080/iot",
            "identifier" : "idcl1:8080",
            "resource" : "/iot/d"
          }
        ]
     }
    ]
 }
```

The list accepts to query parameters:
* *limit*: limits the number of entries to return from the query.
* *offset*: skips the given number of entries from the database before returning the list.


## <a name="development"/> Development documentation
### Project build
The project is managed using Grunt Task Runner.

For a list of available task, type
```bash
grunt --help
```

The following sections show the available options in detail.


### Testing
[Mocha](http://visionmedia.github.io/mocha/) Test Runner + [Chai](http://chaijs.com/) Assertion Library + [Sinon](http://sinonjs.org/) Spies, stubs.

The test environment is preconfigured to run [BDD](http://chaijs.com/api/bdd/) testing style with
`chai.expect` and `chai.should()` available globally while executing tests, as well as the [Sinon-Chai](http://chaijs.com/plugins/sinon-chai) plugin.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire)

To run tests, type
```bash
grunt test
```

Tests reports can be used together with Jenkins to monitor project quality metrics by means of TAP or XUnit plugins.
To generate TAP report in `report/test/unit_tests.tap`, type
```bash
grunt test-report
```


### Coding guidelines
jshint, gjslint

Uses provided .jshintrc and .gjslintrc flag files. The latter requires Python and its use can be disabled
while creating the project skeleton with grunt-init.
To check source code style, type
```bash
grunt lint
```

Checkstyle reports can be used together with Jenkins to monitor project quality metrics by means of Checkstyle
and Violations plugins.
To generate Checkstyle and JSLint reports under `report/lint/`, type
```bash
grunt lint-report
```


### Continuous testing

Support for continuous testing by modifying a src file or a test.
For continuous testing, type
```bash
grunt watch
```


### Source Code documentation
dox-foundation

Generates HTML documentation under `site/doc/`. It can be used together with jenkins by means of DocLinks plugin.
For compiling source code documentation, type
```bash
grunt doc
```


### Code Coverage
Istanbul

Analizes the code coverage of your tests.

To generate an HTML coverage report under `site/coverage/` and to print out a summary, type
```bash
# Use git-bash on Windows
grunt coverage
```

To generate a Cobertura report in `report/coverage/cobertura-coverage.xml` that can be used together with Jenkins to
monitor project quality metrics by means of Cobertura plugin, type
```bash
# Use git-bash on Windows
grunt coverage-report
```


### Code complexity
Plato

Analizes code complexity using Plato and stores the report under `site/report/`. It can be used together with jenkins
by means of DocLinks plugin.
For complexity report, type
```bash
grunt complexity
```

### PLC

Update the contributors for the project
```bash
grunt contributors
```


### Development environment

Initialize your environment with git hooks.
```bash
grunt init-dev-env 
```

We strongly suggest you to make an automatic execution of this task for every developer simply by adding the following
lines to your `package.json`
```
{
  "scripts": {
     "postinstall": "grunt init-dev-env"
  }
}
``` 


### Site generation

There is a grunt task to generate the GitHub pages of the project, publishing also coverage, complexity and JSDocs pages.
In order to initialize the GitHub pages, use:

```bash
grunt init-pages
```

This will also create a site folder under the root of your repository. This site folder is detached from your repository's
history, and associated to the gh-pages branch, created for publishing. This initialization action should be done only
once in the project history. Once the site has been initialized, publish with the following command:

```bash
grunt site
```

This command will only work after the developer has executed init-dev-env (that's the goal that will create the detached site).

This command will also launch the coverage, doc and complexity task (see in the above sections).

