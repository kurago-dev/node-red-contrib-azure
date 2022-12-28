import * as nodered from "node-red";
import {
  AnonymousCredential,
  BlockBlobClient,
  StoragePipelineOptions,
} from "@azure/storage-blob";

import {
  AzureBlobStorageNodeState,
  AzureBlobStorageConfig,
  MessageWithFilename,
  ProxyNode,
} from "./azure-blob-storage-def";

const getBlobUrl = async (
  storageAccount: string,
  containerName: string,
  fileName: string,
  sasQueryString: string
): Promise<string> => {
  return `https://${storageAccount}.blob.core.windows.net/${containerName}/${fileName}${sasQueryString}`;
};

const getProxyOptions = (
  config: AzureBlobStorageConfig,
  proxy?: ProxyNode
): StoragePipelineOptions | {} => {
  if (!config.useProxy) {
    return {};
  }
  const proxyUrl = new URL(proxy.url);
  if (proxy.noproxy.includes(proxyUrl.hostname)) {
    return {};
  }
  return {
    proxyOptions: proxyUrl,
  };
};

const setup = async function (this: AzureBlobStorageNodeState) {
  const { storageAccount, containerName, fileName, sasQueryString } =
    this.config;

  const clientOptions = getProxyOptions(this.config, this.proxy);
  var blobFileName = `${new Date().toISOString()}.json`;

  this.on("input", async (msg: MessageWithFilename, send, done) => {
    if (!!msg.filename) {
      blobFileName = msg.filename;
    } else if (!!fileName && fileName != "") {
      blobFileName = fileName;
    }
    if (!!msg.payload) {
      var blobUrl = await getBlobUrl(
        storageAccount,
        containerName,
        blobFileName,
        sasQueryString
      );
      await this.uploadJSON(
        blobUrl,
        JSON.stringify(msg.payload),
        clientOptions
      );
    }
    if (!!done) {
      done();
    }
  });
};

const uploadJSON = async function (
  this: AzureBlobStorageNodeState,
  blobUrl: string,
  payload: string,
  clientOptions: StoragePipelineOptions | {}
) {
  var client = new BlockBlobClient(
    blobUrl,
    new AnonymousCredential(),
    clientOptions
  );
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

    this.config = config;
    if (config.useProxy) {
      this.proxy = RED.nodes.getNode(config.proxy) as ProxyNode;
    }

    this.setup = setup;
    this.uploadJSON = uploadJSON;

    const { storageAccount, containerName, fileName, sasQueryString } = config;
    this.setup(storageAccount, containerName, fileName, sasQueryString);
  };
  RED.nodes.registerType("Azure Blob storage", AzureBlobStorage);
};
