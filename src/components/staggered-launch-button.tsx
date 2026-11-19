"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { LuTimer } from "react-icons/lu";
import { ACTION_BAR_BUTTON_CLASS } from "@/components/data-table-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { translateBackendError } from "@/lib/backend-errors";
import { showErrorToast, showSuccessToast } from "@/lib/toast-utils";
import { cn } from "@/lib/utils";

/** The pause between launches, in seconds. */
const DEFAULT_DELAY_SECS = 3;
const MIN_DELAY_SECS = 1;
const MAX_DELAY_SECS = 600;

interface StaggeredProgress {
  done: number;
  total: number;
  launched: number;
  failed: number;
  cancelled: boolean;
}

/**
 * Launches the selected profiles one at a time with a pause between launches,
 * so the machine and the network never take the whole batch at once. The
 * popover takes the pause in seconds; while the queue runs it shows its
 * progress and a cancel, and the launch itself continues in the backend.
 */
export function StaggeredLaunchButton({
  profileIds,
  disabled,
}: {
  profileIds: string[];
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [delaySecs, setDelaySecs] = React.useState(String(DEFAULT_DELAY_SECS));
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [progress, setProgress] = React.useState<StaggeredProgress | null>(
    null,
  );

  // The queue outlives the popover and this table: the listener follows the
  // run from start to finish, and the popover reopens onto its progress.
  React.useEffect(() => {
    if (!isLaunching) return;
    const stop = listen<StaggeredProgress>(
      "profiles-staggered-launch-progress",
      (event) => setProgress(event.payload),
    );
    return () => {
      void stop.then((unlisten) => unlisten());
    };
  }, [isLaunching]);

  const start = async () => {
    const parsed = Number.parseInt(delaySecs, 10);
    const delayMs =
      Math.max(
        MIN_DELAY_SECS,
        Math.min(
          MAX_DELAY_SECS,
          Number.isNaN(parsed) ? DEFAULT_DELAY_SECS : parsed,
        ),
      ) * 1000;
    setIsLaunching(true);
    setProgress({
      done: 0,
      total: profileIds.length,
      launched: 0,
      failed: 0,
      cancelled: false,
    });
    try {
      await invoke("staggered_launch_profiles", {
        profileIds,
        delayMs,
      });
      showSuccessToast(t("profiles.staggered.finishedTitle"), {
        description: t("profiles.staggered.finishedBody", {
          count: profileIds.length,
        }),
      });
    } catch (error) {
      showErrorToast(
        t("profiles.staggered.launchFailed", {
          error: translateBackendError(t, error),
        }),
      );
    } finally {
      setIsLaunching(false);
      setProgress(null);
    }
  };

  const cancel = () => {
    void invoke("cancel_staggered_launch");
  };

  const done = progress?.done ?? 0;
  const total = progress?.total ?? profileIds.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className="relative inline-flex">
        <PopoverTrigger asChild>
          <Button
            data-bulk-action="staggered-launch"
            variant="subtle"
            size="sm"
            className={cn(
              "gap-1.5 rounded-lg text-xs [&>svg]:size-3.5 h-7",
              ACTION_BAR_BUTTON_CLASS,
            )}
            aria-label={t("profiles.actionBar.staggeredLaunch")}
            disabled={disabled}
          >
            <LuTimer />
            <span>{t("profiles.actionBar.staggeredLaunch")}</span>
          </Button>
        </PopoverTrigger>
      </span>
      <PopoverContent align="center" className="w-64 p-3">
        {isLaunching ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {t("profiles.staggered.progress", { done, total })}
            </p>
            <Progress value={percent} />
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("profiles.staggered.counts", {
                launched: progress?.launched ?? 0,
                failed: progress?.failed ?? 0,
              })}
            </p>
            <Button variant="outline" size="sm" onClick={cancel}>
              {t("profiles.staggered.cancel")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="staggered-delay"
              className="text-xs text-muted-foreground"
            >
              {t("profiles.staggered.delayLabel")}
            </label>
            <Input
              id="staggered-delay"
              type="number"
              min={MIN_DELAY_SECS}
              max={MAX_DELAY_SECS}
              value={delaySecs}
              onChange={(event) => setDelaySecs(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void start();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("profiles.staggered.delayHint")}
            </p>
            <Button
              size="sm"
              onClick={() => void start()}
              disabled={profileIds.length === 0}
            >
              {t("profiles.staggered.start", { count: profileIds.length })}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
