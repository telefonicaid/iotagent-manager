# Telefónica IoT Agent Manager

[![FIWARE IoT Agents](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/iot-agents.svg)](https://www.fiware.org/developers/catalogue/)
[![](https://nexus.lab.fiware.org/repository/raw/public/badges/stackoverflow/iot-agents.svg)](https://stackoverflow.com/questions/tagged/fiware+iot)

The IoT Agent Manager works as a proxy for scenarios where multiple IoT Agents offer different southbound protocols.
The IoTA Manager appears as a single administration endpoint for provisioning tasks, redirecting provisioning requests
to the appropriate IoTAgent based on the declared protocol.

The IoTAgent Manager also offers a cache of all the provided device Configurations, to fasten the retrieval of certain
information from the Agents.


## How to build an image

The [Dockerfile](https://github.com/telefonicaid/iotagent-manager/blob/master/docker/Dockerfile) associated with this image
can be used to build an image in several ways:

-   By default, the `Dockerfile` retrieves the **latest** version of the codebase direct from GitHub (the `build-arg` is
    optional):

```console
docker build -t iotagent-manager . --build-arg DOWNLOAD=latest
```

-   You can alter this to obtain the last **stable** release run this `Dockerfile` with the build argument
    `DOWNLOAD=stable`

```console
docker build -t iot-agent-manager . --build-arg DOWNLOAD=stable
```

-   You can also download a specific release by running this `Dockerfile` with the build argument `DOWNLOAD=<version>`

```console
docker build -t iotagent-manager . --build-arg DOWNLOAD=1.7.0
```

## Building from your own fork

To download code from your own fork of the GitHub repository add the `GITHUB_ACCOUNT`, `GITHUB_REPOSITORY` and
`SOURCE_BRANCH` arguments (default `master`) to the `docker build` command.

```console
docker build -t iotagent-manager . \
    --build-arg GITHUB_ACCOUNT=<your account> \
    --build-arg GITHUB_REPOSITORY=<your repo> \
    --build-arg SOURCE_BRANCH=<your branch>
    --target=distroless|slim
```

## Building from your own source files

Alternatively, if you want to build directly from your own sources, please copy the existing `Dockerfile` into file the
root of the repository and amend it to copy over your local source using :

```Dockerfile
COPY . /opt/iotaManager/
```

Full instructions can be found within the `Dockerfile` itself.

### Using Distroless

The IoT Agent within the Docker image can be run from a distroless container Manager by using the associated
`distroless` Image.

```console
docker run --name iotagent -d fiware/iotagent-manager-distroless
```
