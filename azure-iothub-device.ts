import { Message } from "azure-iot-common";
import { Client, DeviceClientOptions, MqttTransportOptions } from "azure-iot-device";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "hpagent";
import { URL } from "url";
import * as nodered from "node-red";

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

const getProxyOptions = (config: AzureIotHubDeviceConfig): HttpsProxyAgentOptions | {} => {
  if (!config.useProxy) {
    return {};
  }
  const proxy = new URL(config.proxy.url);
  if (config.proxy.noproxy.includes(proxy.hostname)) {
    return {};
  }
  return {
    proxy,
    maxFreeSockets: 256,
    maxSockets: 256,
    keepAlive: true,
  };
};

const getClientOptions = async function (
  this: AzureIotHubDeviceNodeState
): Promise<DeviceClientOptions> {
  const proxyConfig = getProxyOptions(this.config);
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
  this.client = Client.fromConnectionString(connectionString, Protocol);
  this.client.setOptions(await this.getClientOptions());
  this.on("input", async (msg, send, done) => {
    if (!!msg.payload) {
      try {
        await this.sendMessage(msg.payload! as string);
        this.log(`Message with content ${msg.payload!} was successfully sent`);
      } catch (e) {
        this.error(`Message with content ${msg.payload} could not be sent: ${e}`);
      }
    }
    if (!!done) {
      done();
    }
  });

  this.on("close", async (done: () => void) => {
    try {
      await this.client.close();
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

    this.getProtocolModule = getProtocolModule;
    this.getClientOptions = getClientOptions;
    this.sendMessage = sendMessage;

    this.setup = setup;

    this.setup();
  };
  RED.nodes.registerType("Azure IotHub device", AzureIotHubDevice);
};
