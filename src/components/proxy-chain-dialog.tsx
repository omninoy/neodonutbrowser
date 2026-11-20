"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuArrowRight, LuGlobe, LuLink, LuLoaderCircle } from "react-icons/lu";
import { FlagIcon } from "@/components/flag-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProxyChains } from "@/hooks/use-proxy-chains";
import { useProxyEvents } from "@/hooks/use-proxy-events";
import { useVpnSubscriptions } from "@/hooks/use-vpn-subscriptions";
import { extractCountryCode } from "@/lib/flag-utils";
import { getCachedProxyResult } from "@/lib/proxy-check-store";
import type { ProxyChain } from "@/types/proxy-chain";

interface ProxyChainDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chain?: ProxyChain | null;
  onSuccess?: (chain: ProxyChain) => void;
}

interface SelectableProxyOption {
  id: string;
  name: string;
  countryCode?: string;
  type: "proxy" | "subscription_node";
  subtitle: string;
}

export function ProxyChainDialog({
  isOpen,
  onClose,
  chain,
  onSuccess,
}: ProxyChainDialogProps) {
  const { t } = useTranslation();
  const { addChain, updateChain } = useProxyChains();
  const { storedProxies } = useProxyEvents();
  const { nodes: subscriptionNodes } = useVpnSubscriptions();

  const [name, setName] = useState("");
  const [hop1Id, setHop1Id] = useState("");
  const [hop2Id, setHop2Id] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(chain);

  // Flatten all available proxies and subscription nodes into selectable options
  const options = useMemo<SelectableProxyOption[]>(() => {
    const list: SelectableProxyOption[] = [];

    // Standalone proxies
    for (const p of storedProxies) {
      if (p.is_cloud_managed || p.is_cloud_derived) continue;
      const res = getCachedProxyResult(p.id);
      const cc = res?.country_code ?? extractCountryCode(p.geo_country, p.name);
      list.push({
        id: p.id,
        name: p.name,
        countryCode: cc ?? undefined,
        type: "proxy",
        subtitle: `${p.proxy_settings.proxy_type.toUpperCase()} · ${p.proxy_settings.host}:${p.proxy_settings.port}`,
      });
    }

    // Nodes from all subscriptions
    for (const subNodes of Object.values(subscriptionNodes)) {
      for (const n of subNodes) {
        list.push({
          id: n.id,
          name: n.name,
          countryCode: n.country_code,
          type: "subscription_node",
          subtitle: `${n.protocol.toUpperCase()} · ${n.server}:${n.port}`,
        });
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [storedProxies, subscriptionNodes]);

  useEffect(() => {
    if (!isOpen) return;
    if (chain) {
      setName(chain.name);
      setHop1Id(chain.hop1_proxy_id);
      setHop2Id(chain.hop2_proxy_id);
    } else {
      setName("");
      setHop1Id("");
      setHop2Id("");
    }
    setError(null);
  }, [isOpen, chain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(
        t("proxyChains.dialog.errors.nameRequired", "Укажите название цепочки"),
      );
      return;
    }
    if (!hop1Id) {
      setError(
        t(
          "proxyChains.dialog.errors.hop1Required",
          "Выберите входной прокси (Хоп 1 / Relay)",
        ),
      );
      return;
    }
    if (!hop2Id) {
      setError(
        t(
          "proxyChains.dialog.errors.hop2Required",
          "Выберите выходной прокси (Хоп 2 / Exit)",
        ),
      );
      return;
    }
    if (hop1Id === hop2Id) {
      setError(
        t(
          "proxyChains.dialog.errors.sameHop",
          "Входной и выходной прокси должны различаться",
        ),
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      let result: ProxyChain;
      if (isEdit && chain) {
        result = await updateChain(chain.id, {
          name,
          hop1_proxy_id: hop1Id,
          hop2_proxy_id: hop2Id,
        });
      } else {
        result = await addChain(name, hop1Id, hop2Id);
      }
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedHop1 = options.find((o) => o.id === hop1Id);
  const selectedHop2 = options.find((o) => o.id === hop2Id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LuLink className="size-5 text-primary" />
            {isEdit
              ? t("proxyChains.dialog.titleEdit", "Редактировать цепочку")
              : t("proxyChains.dialog.titleAdd", "Создать цепочку прокси")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "proxyChains.dialog.description",
              "Трафик сначала отправляется на промежуточный прокси (Relay), а затем выходит в интернет через конечный узел (Exit).",
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="chain-name">
              {t("proxyChains.dialog.nameLabel", "Название цепочки")}
            </Label>
            <Input
              id="chain-name"
              placeholder="Chain: UK -> NL / Private Tunnel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chain-hop1">
              {t(
                "proxyChains.dialog.hop1Label",
                "Хоп 1: Входной узел (Entry / Relay)",
              )}
            </Label>
            <select
              id="chain-hop1"
              value={hop1Id}
              onChange={(e) => setHop1Id(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">
                {t(
                  "proxyChains.dialog.selectHop1Placeholder",
                  "— Выберите промежуточный прокси —",
                )}
              </option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.countryCode ? `[${opt.countryCode}] ` : ""}
                  {opt.name} ({opt.subtitle})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center items-center py-0.5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-xs font-mono text-muted-foreground border">
              <span>Хоп 1</span>
              <LuArrowRight className="size-3.5 text-primary" />
              <span>Хоп 2 (Выход)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chain-hop2">
              {t(
                "proxyChains.dialog.hop2Label",
                "Хоп 2: Конечный узел (Exit Node)",
              )}
            </Label>
            <select
              id="chain-hop2"
              value={hop2Id}
              onChange={(e) => setHop2Id(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">
                {t(
                  "proxyChains.dialog.selectHop2Placeholder",
                  "— Выберите выходной прокси —",
                )}
              </option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.countryCode ? `[${opt.countryCode}] ` : ""}
                  {opt.name} ({opt.subtitle})
                </option>
              ))}
            </select>
          </div>

          {selectedHop1 && selectedHop2 && (
            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                {selectedHop1.countryCode ? (
                  <FlagIcon
                    countryCode={selectedHop1.countryCode}
                    squared
                    className="size-3.5 rounded-[2px]"
                  />
                ) : (
                  <LuGlobe className="size-3.5 text-muted-foreground" />
                )}
                <span className="font-medium truncate max-w-[120px]">
                  {selectedHop1.name}
                </span>
              </div>
              <LuArrowRight className="size-4 shrink-0 text-primary mx-2" />
              <div className="flex items-center gap-1.5 min-w-0">
                {selectedHop2.countryCode ? (
                  <FlagIcon
                    countryCode={selectedHop2.countryCode}
                    squared
                    className="size-3.5 rounded-[2px]"
                  />
                ) : (
                  <LuGlobe className="size-3.5 text-muted-foreground" />
                )}
                <span className="font-medium truncate max-w-[120px]">
                  {selectedHop2.name}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("common.buttons.cancel", "Отмена")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <LuLoaderCircle className="size-4 animate-spin mr-2" />
              )}
              {isEdit
                ? t("common.buttons.save", "Сохранить")
                : t("common.buttons.create", "Создать")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
