import { BlockBlobClient, StoragePipelineOptions } from "@azure/storage-blob";
import { AzureNodeConfigWithProxy, AzureNodeStateWithProxy } from "./azure-common-defs";
import * as nodered from "node-red";

export interface AzureBlobStorageNodeState extends AzureNodeStateWithProxy {
  client: BlockBlobClient;
  config: AzureBlobStorageConfig;

  setup: (
    storageAccount: string,
    containerName: string,
    fileName: string,
    sasQueryString: string
  ) => Promise<void>;
  uploadJSON: (
    filename: string,
    payload: string,
    clientOptions: StoragePipelineOptions
  ) => Promise<void>;
}

export interface AzureBlobStorageConfig extends AzureNodeConfigWithProxy {
  storageAccount: string;
  containerName: string;
  fileName: string;
  sasQueryString: string;
}

export interface MessageWithFilename extends nodered.NodeMessageInFlow {
  filename?: string;
}
