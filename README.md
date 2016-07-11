# iotagent-manager

## Index

* [Overview](#overview)
* [Subscription API](#subscriptionapi)
* [Development Documentation](#development)

## <a name="overview"/> Overview
### Description
The IoT Agent manager works as a proxy for multiple IoT Agents

## <a name="subscriptionapi"/> Subscription API
### Description

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

