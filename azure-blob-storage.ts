import * as nodered from "node-red";
import { AnonymousCredential, BlockBlobClient, StoragePipelineOptions } from "@azure/storage-blob";

import { getProxyUrl, ProxyNode } from "./azure-common-defs";

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

const getProxyOptions = (
  config: AzureBlobStorageConfig,
  proxy?: ProxyNode
): StoragePipelineOptions | {} => {
  const proxyUrl = getProxyUrl(config, proxy);
  return proxyUrl instanceof URL
    ? {
        proxyOptions: proxyUrl,
      }
    : {};
};

const setup = async function (this: AzureBlobStorageNodeState) {
  const { storageAccount, containerName, fileName, sasQueryString } = this.config;

  const clientOptions = getProxyOptions(this.config, this.proxy);

  this.on("input", async (msg: MessageWithFilename, send, done) => {
    const _send = send ?? this.send;
    try {
      let blobFileName: string;
      if (!!msg.filename) {
        blobFileName = msg.filename;
      } else if (!!fileName && fileName != "") {
        blobFileName = fileName;
      } else {
        blobFileName = `${new Date().toISOString()}.json`;
      }
      if (!!msg.payload) {
        var blobUrl = await getBlobUrl(storageAccount, containerName, blobFileName, sasQueryString);
        await this.uploadJSON(blobUrl, JSON.stringify(msg.payload), clientOptions);
        this.status({
          fill: "green",
          text: "OK",
        });
      }
    } catch (e) {
      _send(msg);
      this.status({
        fill: "red",
        text: `Error: ${e}`,
      });
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
  var client = new BlockBlobClient(blobUrl, new AnonymousCredential(), clientOptions);
  try {
    await client.upload(payload, payload.length);
    this.log(`JSON sent successfully with payload size: ${payload.length}`);
  } catch (e) {
    this.error(`An error occurred while uploading to Blob Storage: ${e}`);
    throw e;
  }
};

module.exports = (RED: nodered.NodeAPI): void => {
  const AzureBlobStorage = function (
    this: AzureBlobStorageNodeState,
    config: AzureBlobStorageConfig
  ) {
    RED.nodes.createNode(this, config);

    this.status({
      text: "Ready",
    });

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
