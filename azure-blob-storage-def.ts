import { BlockBlobClient } from "@azure/storage-blob";
import * as nodered from "node-red";

export interface AzureBlobStorageNodeState extends nodered.Node {
  client: BlockBlobClient;

  setup: (
    storageAccount: string,
    containerName: string,
    fileName: string,
    sasQueryString: string
  ) => Promise<void>;
  uploadJSON: (filename: string, payload: string) => Promise<void>;
}

export interface AzureBlobStorageConfig extends nodered.NodeDef {
  storageAccount: string;
  containerName: string;
  fileName: string;
  sasQueryString: string;
}

export interface MessageWithFilename extends nodered.NodeMessageInFlow {
  filename?: string;
}
