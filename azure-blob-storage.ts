import * as nodered from "node-red";
import { AnonymousCredential, BlockBlobClient } from "@azure/storage-blob";

import {
  AzureBlobStorageNodeState,
  AzureBlobStorageConfig,
  MessageWithFilename,
} from "./azure-blob-storage-def";

const getBlobUrl = async (
  storageAccount: string,
  containerName: string,
  fileName: string,
  sasQueryString: string
): Promise<string> => {
  return `https://${storageAccount}.blob.core.windows.net/${containerName}/${fileName}${sasQueryString}`;
};

const setup = async function (
  this: AzureBlobStorageNodeState,
  storageAccount: string,
  containerName: string,
  configFileName: string,
  sasQueryString: string
) {
  var blobFileName = `${new Date().toISOString()}.json`;
  this.on("input", async (msg: MessageWithFilename, send, done) => {
    if (!!msg.filename) {
      blobFileName = msg.filename;
    } else if (!!configFileName && configFileName != "") {
      blobFileName = configFileName;
    }
    if (!!msg.payload) {
      var blobUrl = await getBlobUrl(
        storageAccount,
        containerName,
        blobFileName,
        sasQueryString
      );
      await this.uploadJSON(blobUrl, JSON.stringify(msg.payload));
    }
    if (!!done) {
      done();
    }
  });
};

const uploadJSON = async function (
  this: AzureBlobStorageNodeState,
  blobUrl: string,
  payload: string
) {
  var client = new BlockBlobClient(blobUrl, new AnonymousCredential(), {
    proxyOptions: { host: "", port: 123 },
  });
  try {
    await client.upload(payload, payload.length);
    this.log(`JSON sent successfully with payload size: ${payload.length}`);
  } catch (e) {
    this.error(`An error occurred while uploading to Blob Storage: ${e}`);
  }
};

module.exports = (RED: nodered.NodeAPI): void => {
  const AzureBlobStorage = function (
    this: AzureBlobStorageNodeState,
    config: AzureBlobStorageConfig
  ) {
    RED.nodes.createNode(this, config);
    this.setup = setup;
    this.uploadJSON = uploadJSON;

    const { storageAccount, containerName, fileName, sasQueryString } = config;
    this.setup(storageAccount, containerName, fileName, sasQueryString);
  };
  RED.nodes.registerType("Azure Blob storage", AzureBlobStorage);
};
