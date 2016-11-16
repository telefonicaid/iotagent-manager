# Operations Manual: logs and alarms
## Index

* [Overview](#overview)
* [Logs](#logs)
* [Alarms](#alarms)
* [Error naming code](#errorcode)

## <a name="overview"/>  Overview
The following document shows all the errors that can appear in the IoTAgent Manager log file, and gives a brief
idea of the severity and how to react to those errors.

## <a name="logs"/>  Logs
The following section contains the error log entries that can appear in the IoTA Manager logs, grouped by category.

### Database errors

#### MONGODB-001: Error trying to connect to MongoDB: %s

Implies there has been an error connecting with the DB. The component will automatically retry from this error, but it
may be a sign of connectivity problems between the DB and the component. If the connection cannot be restablished from
this error, a MONGODB-002 error will be raised.

#### MONGODB-002: Error found after [%d] attempts: %s

Indicates that it was impossible to establish a connection to the MongoDB cluster, even after retrying N times. This
could be caused by a connectivity problem with the MongoDB machine, a problem in the MongoDB cluster, or a misconfiguration
of the IoTA Manager. Check the conectivity, the state of the MongoDB cluster and the Mongo configuration data.

#### MONGODB-003: Internal MongoDB Error removing services from protocol: %s

The MongoDB cluster raised an error that prevented the IoTAM to get the desired results. This may indicate a transient error,
or a connectivity problem. The diagnosis of the erorr will depend on the received message.

#### MONGODB-004: Unexpected state cleaning previous services from Protocol [%s][%s][%s]

The removal of services for the protocol ended up without error, but no state was retrieved. This error should never
happen. If it does, it will most probably indicate an error in the MongoDB driver or library. Contact the development team.

### Redirection errors

#### REDIRECTION-001: Error found redirecting requests to [%s]: %j

A request arriving to the IoTManager could not be redirected to one of the IoTAgents. This will most probably indicate
that, either the IoTAgent is down or there is no connectivity from the IoTAM machine to the IoTA's one. Check that the
indicated IoTA is up and running and the connectivity between both machines.

#### REDIRECTION-002: Wrong status code detected [%s] and body response [%s] redirecting request

The redirected request received an internal error as a response from the IoTAgent. Usually, this would mean there is
some internal problem with the IoTAgent (check the logs for details). If the IoTAgent is beneath a load balancer, it
may be caused by an error in the load balancer (check load balancer status and logs).

#### REDIRECTION-003: Error parsing response body from the redirected request: %s

IoTAgents should always return a valid response. If a response is returned with a parse error, it may be caused:

- By an uncaught internal error in the IoTA or in a intermediate proxy (or load balancer). Check the IoTAgent's logs and
status as well as the load balancer status.

- By a bug in the IoTA code. In this case, contact the development team.

## <a name="alarms"/> Alarms

The following table shows the alarms that can be raised in the IoTAgent library. All the alarms are signaled by a
error log starting with the prefix "Raising [%s]:" (where %s is the alarm name). All the alarms are released by an info
log with the prefix "Releasing [%s]". These texts appear in the `msg=` field of the generic log record format.

| Alarm name            | Severity     | Description            |
|:--------------------- |:-------------|:---------------------- |
| MONGO-ALARM           | **Critical** | Indicates an error in the MongoDB connectivity |

while the 'Severity' criterium is as follows:

* **Critical** - The system is not working
* **Major** - The system has a problem that degrades the service and must be addressed
* **Warning** - It is happening something that must be notified


## <a name="errorcode"/> Error naming code
Every error has a code composed of a prefix and an ID, codified with the following table:

| Prefix           | Type of operation             |
|:---------------- |:----------------------------- |
| MONGODB          | Errors related with the MongoDB connection |
| REDIRECTION      | Errors raised during request redirection |

