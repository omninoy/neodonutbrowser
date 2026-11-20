"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { showErrorToast, showSuccessToast } from "@/lib/toast-utils";
import type {
  VpnSubscription,
  VpnSubscriptionNode,
} from "@/types/vpn-subscription";

export function useVpnSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<VpnSubscription[]>([]);
  const [nodes, setNodes] = useState<Record<string, VpnSubscriptionNode[]>>({});
  const [loading, setLoading] = useState(false);
  const [refreshingSubId, setRefreshingSubId] = useState<string | null>(null);
  const [pingingSubId, setPingingSubId] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const subs = await invoke<VpnSubscription[]>("get_vpn_subscriptions");
      setSubscriptions(subs);

      // Fetch nodes for each subscription
      const allNodes = await invoke<VpnSubscriptionNode[]>(
        "get_vpn_subscription_nodes",
        {
          subscriptionId: null,
        },
      );

      const grouped: Record<string, VpnSubscriptionNode[]> = {};
      for (const node of allNodes) {
        if (!grouped[node.subscription_id]) {
          grouped[node.subscription_id] = [];
        }
        grouped[node.subscription_id].push(node);
      }
      setNodes(grouped);
    } catch (error) {
      console.error("Failed to load VPN subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscriptions();

    const unlistenPromise = listen("vpn-subscriptions-changed", () => {
      void fetchSubscriptions();
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [fetchSubscriptions]);

  const addSubscription = useCallback(
    async (name: string, url: string, autoUpdate = true) => {
      try {
        const newSub = await invoke<VpnSubscription>("add_vpn_subscription", {
          name,
          url,
          autoUpdate,
        });
        showSuccessToast(
          `Подписка "${newSub.name}" успешно добавлена (${newSub.node_count} серверов)`,
        );
        await fetchSubscriptions();
        return newSub;
      } catch (error) {
        showErrorToast(String(error));
        throw error;
      }
    },
    [fetchSubscriptions],
  );

  const updateSubscription = useCallback(
    async (
      id: string,
      options?: {
        name?: string;
        url?: string;
        autoUpdate?: boolean;
        fetchNow?: boolean;
      },
    ) => {
      try {
        setRefreshingSubId(id);
        const updated = await invoke<VpnSubscription>(
          "update_vpn_subscription",
          {
            subscriptionId: id,
            name: options?.name ?? null,
            url: options?.url ?? null,
            autoUpdate: options?.autoUpdate ?? null,
            fetchNow: options?.fetchNow ?? true,
          },
        );
        showSuccessToast(
          `Подписка "${updated.name}" обновлена (${updated.node_count} серверов)`,
        );
        await fetchSubscriptions();
        return updated;
      } catch (error) {
        showErrorToast(String(error));
        throw error;
      } finally {
        setRefreshingSubId(null);
      }
    },
    [fetchSubscriptions],
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_vpn_subscription", { subscriptionId: id });
        showSuccessToast("Подписка удалена");
        await fetchSubscriptions();
      } catch (error) {
        showErrorToast(String(error));
        throw error;
      }
    },
    [fetchSubscriptions],
  );

  const pingSubscription = useCallback(async (id: string) => {
    try {
      setPingingSubId(id);
      const pingedNodes = await invoke<VpnSubscriptionNode[]>(
        "ping_vpn_subscription",
        {
          subscriptionId: id,
        },
      );
      setNodes((prev) => ({
        ...prev,
        [id]: pingedNodes,
      }));
      const available = pingedNodes.filter((n) => n.is_valid).length;
      toast.info(
        `Пинг завершён: ${available} из ${pingedNodes.length} узлов доступны`,
      );
      return pingedNodes;
    } catch (error) {
      showErrorToast(String(error));
      throw error;
    } finally {
      setPingingSubId(null);
    }
  }, []);

  const pingSingleNode = useCallback(async (nodeId: string, subId: string) => {
    try {
      const updatedNode = await invoke<VpnSubscriptionNode>(
        "ping_vpn_subscription_node",
        {
          nodeId,
        },
      );
      setNodes((prev) => ({
        ...prev,
        [subId]: (prev[subId] || []).map((n) =>
          n.id === nodeId ? updatedNode : n,
        ),
      }));
      return updatedNode;
    } catch (error) {
      console.error("Failed to ping node:", error);
      throw error;
    }
  }, []);

  return {
    subscriptions,
    nodes,
    loading,
    refreshingSubId,
    pingingSubId,
    fetchSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    pingSubscription,
    pingSingleNode,
  };
}
