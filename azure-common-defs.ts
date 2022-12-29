import * as nodered from "node-red";

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

export interface AzureNodeStateWithProxy extends nodered.Node {
  proxy?: ProxyNode;
}

export interface AzureNodeConfigWithProxy extends nodered.NodeDef {
  useProxy: boolean;
  proxy: string;
}

export const getProxyUrl = (
  config: AzureNodeConfigWithProxy,
  proxy?: ProxyNode
): URL | {} => {
  if (!config.useProxy) {
    return {};
  }
  const proxyUrl = new URL(proxy.url);
  if (proxy.noproxy.includes(proxyUrl.hostname)) {
    return {};
  }
  return proxyUrl;
};
