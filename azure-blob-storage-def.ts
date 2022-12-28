import { BlockBlobClient, StoragePipelineOptions } from "@azure/storage-blob";
import * as nodered from "node-red";

export interface AzureBlobStorageNodeState extends nodered.Node {
  client: BlockBlobClient;
  config: AzureBlobStorageConfig;
  proxy?: ProxyNode;

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

export interface ProxyNode extends nodered.Node {
  url: string;
  noproxy: string[];
  credentials:
    | {
        username?: string;
        password?: string;
      }
    | undefined;
}

export interface AzureBlobStorageConfig extends nodered.NodeDef {
  storageAccount: string;
  containerName: string;
  fileName: string;
  sasQueryString: string;
  useProxy: boolean;
  proxy: string;
}

export interface MessageWithFilename extends nodered.NodeMessageInFlow {
  filename?: string;
}
