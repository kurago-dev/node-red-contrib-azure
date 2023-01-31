import { Message } from "azure-iot-common";
import { Client, DeviceClientOptions } from "azure-iot-device";
import { getProxyUrl, ProxyNode } from "./azure-common-defs";
import { HttpProxyAgent, HttpsProxyAgent, HttpsProxyAgentOptions } from "hpagent";
import { URL } from "url";
import * as nodered from "node-red";

import {
  AzureIotHubDeviceNodeState,
  AzureIotHubDeviceConfig,
  ProtocolModule,
} from "./azure-iothub-device-def";
import { type } from "os";

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

const getProxyOptions = (
  config: AzureIotHubDeviceConfig,
  proxy?: ProxyNode
): HttpsProxyAgentOptions | {} => {
  const proxyUrl = getProxyUrl(config, proxy);
  return proxyUrl instanceof URL
    ? {
        proxy: proxyUrl,
        maxFreeSockets: 256,
        maxSockets: 256,
        keepAlive: true,
      }
    : {};
};

const getClientOptions = async function (
  this: AzureIotHubDeviceNodeState
): Promise<DeviceClientOptions> {
  const proxyConfig = getProxyOptions(this.config, this.proxy);
  switch (this.config.protocol) {
    case "mqtt-ws":
      return {
        mqtt: {
          ...(Object.keys(proxyConfig).length > 0 && {
            webSocketAgent: new HttpsProxyAgent(proxyConfig as HttpsProxyAgentOptions),
          }),
        },
      };
    case "amqp-ws":
      return {
        amqp: {
          ...(Object.keys(proxyConfig).length > 0 && {
            webSocketAgent: new HttpsProxyAgent(proxyConfig as HttpsProxyAgentOptions),
          }),
        },
      };
    default:
      return {};
  }
};

const setup = async function (this: AzureIotHubDeviceNodeState) {
  const { connectionString } = this.config;
  const Protocol = await this.getProtocolModule();
  this.client = null;
  try {
    this.client = Client.fromConnectionString(connectionString, Protocol);
    this.client.setOptions(await this.getClientOptions());
    this.status({
      fill: "green",
      text: "Connected",
    });
  } catch (e) {
    this.status({
      fill: "red",
      text: `Connection failed: ${e}`,
    });
  }
  this.on("input", async (msg, send, done) => {
    const _send = send ?? this.send;
    if (this.client == null) {
      _send(msg);
    } else if (msg.payload !== undefined) {
      try {
        if (msg.payload! instanceof String) {
          await this.sendMessage(msg.payload! as string);
        } else if (msg.payload instanceof Number || msg.payload instanceof Boolean) {
          await this.sendMessage(`${msg.payload}`);
        } else {
          await this.sendMessage(JSON.stringify(msg.payload!));
        }
      } catch (e) {
        this.error(`Error when sending message.\nPayload: ${msg.payload!}\nError: ${e}`);
        _send(msg);
      }
    }
    if (!!done) {
      done();
    }
  });

  this.on("close", async (done: () => void) => {
    try {
      if (!!this.client) {
        await this.client.close();
      }
      this.log("The connection to the device was closed successfully");
    } catch (e) {
      this.error(`An error occurred when closing the connection to the device: ${e}`);
    } finally {
      done();
    }
  });
};

const sendMessage = async function (this: AzureIotHubDeviceNodeState, payload: string) {
  const message = new Message(payload);
  try {
    await this.client.sendEvent(message);
    this.log(`Message sent successfully with payload: ${payload}`);
  } catch (e) {
    this.error(`An error occurred when sending a message: ${e}`);
  }
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

    this.getProtocolModule = getProtocolModule;
    this.getClientOptions = getClientOptions;
    this.sendMessage = sendMessage;

    this.setup = setup;

    this.setup();
  };
  RED.nodes.registerType("Azure IotHub device", AzureIotHubDevice);
};
