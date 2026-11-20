export interface ProxyChain {
  id: string;
  name: string;
  hop1_proxy_id: string;
  hop2_proxy_id: string;
  created_at?: number;
}
