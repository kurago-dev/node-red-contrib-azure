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
