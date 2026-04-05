"use client";

import { useEffect, useState } from "react";
import PlatformCard from "@/components/PlatformCard";

interface Props {
  selectedPlatform: string;
  onSelect: (platform: string) => void;
}

type HealthStatus = "ok" | "degraded" | "down" | "loading";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", color: "#E1306C" },
  { id: "youtube",   name: "YouTube",   color: "#FF0000" },
  { id: "facebook",  name: "Facebook",  color: "#1877F2" },
] as const;

const defaultHealth: Record<string, HealthStatus> = {
  instagram: "ok",
  youtube: "ok",
  facebook: "ok",
};

const loadingHealth: Record<string, HealthStatus> = {
  instagram: "loading",
  youtube: "loading",
  facebook: "loading",
};

export default function PlatformGrid({ selectedPlatform, onSelect }: Props) {
  const [healthMap, setHealthMap] = useState<Record<string, HealthStatus>>(loadingHealth);

  useEffect(() => {
    fetch("/api/platform-health")
      .then((r) => r.json())
      .then((body) => {
        if (body.success && body.data) {
          setHealthMap(body.data);
        } else {
          setHealthMap(defaultHealth);
        }
      })
      .catch(() => {
        setHealthMap(defaultHealth);
      });
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {PLATFORMS.map((p) => (
        <PlatformCard
          key={p.id}
          id={p.id}
          name={p.name}
          color={p.color}
          status={healthMap[p.id] ?? "loading"}
          isSelected={selectedPlatform === p.id}
          onClick={() => onSelect(p.id)}
        />
      ))}
    </div>
  );
}
