import * as nodered from "node-red";
import fetch from "node-fetch";
import { AnonymousCredential, BlockBlobClient, StoragePipelineOptions } from "@azure/storage-blob";

import { getProxyUrl, ProxyNode } from "./azure-common-defs";

import {
  AzureBlobStorageNodeState,
  AzureBlobStorageConfig,
  MessageWithFilename,
} from "./azure-blob-storage-def";

const getBlobUrl = (
  storageAccount: string,
  containerName: string,
  filename: string,
  sasQueryString: string
): string => {
  return `https://${storageAccount}.blob.core.windows.net/${containerName}/${filename}${sasQueryString}`;
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

const reconnect = async function (this: AzureBlobStorageNodeState) {
  this.isReconnecting = true;
  this.status({
    fill: "yellow",
    text: "Reconnecting",
  });
  while (this.isReconnecting) {
    try {
      await fetch(`https://${this.config.storageAccount}.blob.core.windows.net`);
      this.isReconnecting = false;
    } catch (e) {
      this.log(
        `Reconnection attempt failed (${e.name}). Attempting new reconnection in 5 seconds.`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      this.log("Attempting new reconnection.");
    }
  }
  this.status({
    fill: "green",
    text: "Connected",
  });
};

const setup = async function (this: AzureBlobStorageNodeState) {
  const { storageAccount, containerName, filename, sasQueryString } = this.config;

  this.on("input", async (msg: MessageWithFilename, send, done) => {
    const _send = send ?? this.send;
    try {
      if (this.isReconnecting) {
        _send(msg);
      } else if (!!msg.payload) {
        let blobFileName: string;
        if (!!msg.filename) {
          blobFileName = msg.filename;
        } else if (!!filename && filename != "") {
          blobFileName = filename;
        } else {
          blobFileName = `${new Date().toISOString()}.json`;
        }
        var blobUrl = getBlobUrl(storageAccount, containerName, blobFileName, sasQueryString);
        this.status({
          fill: "green",
          shape: "ring",
          text: "Uploading...",
        });
        await this.uploadJSON(blobUrl, JSON.stringify(msg.payload));
        this.status({
          fill: "green",
          text: "Connected",
        });
      }
    } catch (e) {
      this.error(`An error occurred while uploading to Blob Storage: ${e.name}`);
      if (e.name === "FetchError") {
        this.reconnect();
        _send(msg);
      } else {
        this.status({
          fill: "red",
          text: e.name,
        });
      }
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
  const clientOptions = getProxyOptions(this.config, this.proxy);
  const client = new BlockBlobClient(blobUrl, new AnonymousCredential(), {
    ...clientOptions,
    keepAliveOptions: {
      enable: false,
    },
  });
  await client.upload(payload, payload.length);
  this.log(`JSON sent successfully with payload size: ${payload.length}`);
};

module.exports = (RED: nodered.NodeAPI): void => {
  const AzureBlobStorage = function (
    this: AzureBlobStorageNodeState,
    config: AzureBlobStorageConfig
  ) {
    RED.nodes.createNode(this, config);

    this.status({
      text: "Connected",
      fill: "green",
    });
    this.isReconnecting = false;

    this.config = config;
    if (config.useProxy) {
      this.proxy = RED.nodes.getNode(config.proxy) as ProxyNode;
    }

    this.setup = setup;
    this.uploadJSON = uploadJSON;
    this.reconnect = reconnect;

    const { storageAccount, containerName, filename, sasQueryString } = config;
    this.setup(storageAccount, containerName, filename, sasQueryString);
  };
  RED.nodes.registerType("Azure Blob storage", AzureBlobStorage);
};
