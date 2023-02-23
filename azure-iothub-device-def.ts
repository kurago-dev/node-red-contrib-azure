import { Client, DeviceClientOptions } from "azure-iot-device";
import { AzureNodeConfigWithProxy, AzureNodeStateWithProxy } from "./azure-common-defs";

export type Protocol = "mqtt" | "mqtt-ws" | "amqp" | "amqp-ws";

type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
type Mqtt = PropType<typeof import("azure-iot-device-mqtt"), "Mqtt">;
type Amqp = PropType<typeof import("azure-iot-device-amqp"), "Amqp">;
export type ProtocolModule = Mqtt | Amqp;

export interface AzureIotHubDeviceNodeState extends AzureNodeStateWithProxy {
  client: Client;
  config: AzureIotHubDeviceConfig;
  isReconnecting: boolean;

  setup: () => Promise<void>;
  setupClient: () => Promise<Client>;
  reconnect: () => Promise<void>;
  getProtocolModule: () => Promise<ProtocolModule>;
  getClientOptions: () => Promise<DeviceClientOptions>;
  sendMessage: (payload: string) => Promise<void>;
}

export interface AzureIotHubDeviceConfig extends AzureNodeConfigWithProxy {
  connectionString: string;
  protocol: Protocol;
}
