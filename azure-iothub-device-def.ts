import { Client } from "azure-iot-device";
import * as nodered from "node-red";

export type Protocol = "mqtt" | "mqtt-ws" | "amqp" | "amqp-ws";

type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
type Mqtt = PropType<typeof import("azure-iot-device-mqtt"), "Mqtt">;
type Amqp = PropType<typeof import("azure-iot-device-amqp"), "Amqp">;
export type ProtocolModule = Mqtt | Amqp;

export interface AzureIotHubDeviceNodeState extends nodered.Node {
  client: Client;

  setup: (connectionString: string, Protocol: ProtocolModule) => Promise<void>;
  sendMessage: (payload: string) => Promise<void>;
}

export interface AzureIotHubDeviceConfig extends nodered.NodeDef {
  // deviceId: string;
  connectionString: string;
  protocol: Protocol;
}
