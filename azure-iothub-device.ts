import { Message, NoRetry } from "azure-iot-common";
import { Client, DeviceClientOptions } from "azure-iot-device";
import { getProxyUrl, ProxyNode } from "./azure-common-defs";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "hpagent";
import { URL } from "url";
import * as nodered from "node-red";
import { Agent } from "https";

import {
  AzureIotHubDeviceNodeState,
  AzureIotHubDeviceConfig,
  ProtocolModule,
} from "./azure-iothub-device-def";

const getProtocolModule = async function (
  this: AzureIotHubDeviceNodeState
): Promise<ProtocolModule> {
  switch (this.config.protocol) {
    case "mqtt":
      const { Mqtt } = await import("azure-iot-device-mqtt");
      return Mqtt;
    case "mqtt-ws":
      const { MqttWs } = await import("azure-iot-device-mqtt");
      return MqttWs;
    case "amqp":
      const { Amqp } = await import("azure-iot-device-amqp");
      return Amqp;
    case "amqp-ws":
      const { AmqpWs } = await import("azure-iot-device-amqp");
      return AmqpWs;
    default:
      throw "Unknown protocol";
  }
};

const getProxyOptions = (proxyUrl: URL): HttpsProxyAgentOptions => {
  return {
    proxy: proxyUrl,
    maxFreeSockets: 256,
    maxSockets: 256,
    keepAlive: true,
  };
};

const getAgent = (config: AzureIotHubDeviceConfig, proxy?: ProxyNode): Agent => {
  const proxyUrl = getProxyUrl(config, proxy);
  if (proxyUrl instanceof URL) {
    const proxyConfig = getProxyOptions(proxyUrl);
    return new HttpsProxyAgent({
      ...proxyConfig,
    });
  } else {
    return new Agent();
  }
};

const getClientOptions = async function (
  this: AzureIotHubDeviceNodeState
): Promise<DeviceClientOptions> {
  const webSocketAgent = getAgent(this.config, this.proxy);
  const keepalive = 10;
  switch (this.config.protocol) {
    case "mqtt-ws":
      return {
        mqtt: {
          webSocketAgent,
        },
        keepalive,
      };
    case "amqp-ws":
      return {
        amqp: {
          webSocketAgent,
        },
        keepalive,
      };
    default:
      return {};
  }
};

const reconnect = async function (this: AzureIotHubDeviceNodeState) {
  this.isReconnecting = true;
  this.status({
    fill: "yellow",
    text: "Reconnecting",
  });
  this.client?.close(); // We don't wanna await this bc timeout also doesn't work on here
  while (this.isReconnecting) {
    try {
      this.client = await this.setupClient();
      this.isReconnecting = false;
    } catch (e) {
      this.log("Reconnection attempt failed. Attempting new reconnection in 5 seconds.");
      this.log(e);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      this.log("Attempting new reconnection.");
    }
  }
};

const setupClient = async function (this: AzureIotHubDeviceNodeState): Promise<Client> {
  const { connectionString } = this.config;
  const Protocol = await this.getProtocolModule();
  const client = Client.fromConnectionString(connectionString, Protocol);
  const clientOptions = await this.getClientOptions();
  client.setOptions(clientOptions);
  client.setRetryPolicy(new NoRetry());
  client.on("disconnect", () => {
    this.reconnect();
  });
  await client.open();
  this.isReconnecting = false;
  this.status({
    fill: "green",
    text: "Connected",
  });
  return client;
};

const setup = async function (this: AzureIotHubDeviceNodeState) {
  this.on("input", async (msg, send, done) => {
    const _send = send ?? this.send;
    if (this.client == null || this.isReconnecting) {
      _send(msg);
    } else if (msg.payload !== undefined) {
      try {
        this.status({
          fill: "green",
          shape: "ring",
          text: "Sending message...",
        });
        if (msg.payload! instanceof String) {
          await this.sendMessage(msg.payload! as string);
        } else if (msg.payload instanceof Number || msg.payload instanceof Boolean) {
          await this.sendMessage(`${msg.payload}`);
        } else {
          await this.sendMessage(JSON.stringify(msg.payload!));
        }
        this.status({
          fill: "green",
          text: "Connected",
        });
      } catch (e) {
        this.error(`Error when sending message.\nPayload: ${msg.payload!}\nError: ${e}`);
        if (!this.isReconnecting) {
          this.status({
            fill: "red",
            text: e,
          });
        }
        _send(msg);
      }
    }
    if (!!done) {
      done();
    }
  });

  this.on("close", async (done: () => void) => {
    try {
      await this.client?.close();
      this.log("The connection to the device was closed successfully");
    } catch (e) {
      this.error(`An error occurred when closing the connection to the device: ${e}`);
    } finally {
      done();
    }
  });

  this.setupClient()
    .then((client) => (this.client = client))
    .catch(() => this.reconnect());
};

const sendMessage = async function (this: AzureIotHubDeviceNodeState, payload: string) {
  const message = new Message(payload);
  await this.client.sendEvent(message);
  this.log(`Message sent successfully with payload: ${payload}`);
};

module.exports = (RED: nodered.NodeAPI): void => {
  const AzureIotHubDevice = function (
    this: AzureIotHubDeviceNodeState,
    config: AzureIotHubDeviceConfig
  ) {
    RED.nodes.createNode(this, config);
    this.config = config;
    if (config.useProxy) {
      this.proxy = RED.nodes.getNode(config.proxy) as ProxyNode;
    }
    this.isReconnecting = false;

    this.getProtocolModule = getProtocolModule;
    this.getClientOptions = getClientOptions;
    this.sendMessage = sendMessage;

    this.setup = setup;
    this.setupClient = setupClient;
    this.reconnect = reconnect;

    this.client = null;
    this.setup();
  };
  RED.nodes.registerType("Azure IotHub device", AzureIotHubDevice);
};
