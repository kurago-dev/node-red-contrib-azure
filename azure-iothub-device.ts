import * as nodered from "node-red";
import { Client } from "azure-iot-device";
import { Message } from "azure-iot-common";

import {
  AzureIotHubDeviceNodeState,
  AzureIotHubDeviceConfig,
  Protocol,
  ProtocolModule,
} from "./azure-iothub-device-def";

const getProtocolModule = async (protocol: Protocol): Promise<ProtocolModule> => {
  switch (protocol) {
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

const setup = async function (
  this: AzureIotHubDeviceNodeState,
  connectionString: string,
  Protocol: ProtocolModule
) {
  this.client = Client.fromConnectionString(connectionString, Protocol);
  this.on("input", async (msg, send, done) => {
    if (!!msg.payload) {
      await this.sendMessage(msg.payload! as string);
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
      this.error("An error occurred when closing the connection to the device");
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
    this.setup = setup;
    this.sendMessage = sendMessage;

    const { connectionString, protocol } = config;
    getProtocolModule(protocol).then((Protocol) => this.setup(connectionString, Protocol));
  };
  RED.nodes.registerType("Azure IotHub device", AzureIotHubDevice);
};
