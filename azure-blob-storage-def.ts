import { BlockBlobClient, StoragePipelineOptions } from "@azure/storage-blob";
import { AzureNodeConfigWithProxy, AzureNodeStateWithProxy } from "./azure-common-defs";
import * as nodered from "node-red";

export interface AzureBlobStorageNodeState extends AzureNodeStateWithProxy {
  config: AzureBlobStorageConfig;
  isReconnecting: boolean;

  setup: (
    storageAccount: string,
    containerName: string,
    filename: string,
    sasQueryString: string
  ) => Promise<void>;
  uploadJSON: (filename: string, payload: string) => Promise<void>;
  reconnect: () => Promise<void>;
}

export interface AzureBlobStorageConfig extends AzureNodeConfigWithProxy {
  storageAccount: string;
  containerName: string;
  filename: string;
  sasQueryString: string;
}

export interface MessageWithFilename extends nodered.NodeMessageInFlow {
  filename?: string;
}
