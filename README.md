# Node-RED Azure node selection

This repository hosts the code for two brand-new Node-RED nodes that allow users to connect their flows with (for the moment, two) different Azure services.

## Nodes

### Azure IotHub device node

This node publishes messages to the IotHub as the specified device. It supports four different protocols and proxy utilization. Configuring a node was never this easy:

- Name (optional): The name this node instance will have. If left empty, and having provided a connection string, the device ID will be extracted from it and used as the node name. Otherwise, the boring label _Azure IotHub device_ will prevail.
- Connection string: The connection string of the device in question. It's usually shaped as a colon (`;`) separated list of settings, following the format `<name>=<value>`. If your connection string does not contain settings `HostName`, `DeviceId` and `SharedAccessKey`, _you've been provided the wrong string, doc!_
- Protocol: Choose one of the available options, whichever suits you best. The options are MQTT (default), MQTT over Websockets, AMQP and AMQP over Websockets.
- Proxy settings (optional): Configure the usage of a proxy through the usual means of Node-RED.

### Azure blob storage node

This node publishes the payload of the incoming messages as standalone files in the specified blob storage account. It can be configured as follows:

- Account: Name of the storage account.
- Blob: Path to the generated blob inside the account's container.
- Filename (optional): Name that the generated file will use. If none is specified, a name will be generated from the timestamp it is written in.
- SAS QString: Or, as its mother calls it when they get in an argument, _Shared Access Signature Query String_. It contains key information to configure the node. It should look like this: `?sv=<date>&st=<timestamp>&se=<timestamp>&sr=<key>`. Ask your local Microsoft Azure retailer where you can get hold of this string.
- Proxy settings (optional): Configure the usage of a proxy through the usual (booooring) means of Node-RED.

## Installing the nodes locally

For local development purposes, the nodes can be installed by following these easy steps:

- Clone this repository.
- Navigate into the clone of this repository.
- Install dependencies with `npm isntall`. The typo is not required but boy is it fun!
- Build the node by running `npm run build`. This extra step is brought to you by Microsoft, through their fantastic creation, TypeScript.
- Navigate into the Node-RED home directory (usually, `~/.node-red`) and run `npm i <clone>`, where `<clone>` is the path to the clone of this repository.
- Launch (or relaunch) Node-RED and enjoy using your new toys as if they were Christmas gift.
