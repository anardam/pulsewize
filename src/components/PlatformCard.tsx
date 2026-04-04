"use client";

interface Props {
  id: string;
  name: string;
  color: string;
  status: "ok" | "degraded" | "down" | "loading";
  isSelected: boolean;
  onClick: () => void;
}

export default function PlatformCard({ name, color, status, isSelected, onClick }: Props) {
  const badgeClass =
    status === "ok"
      ? "w-2.5 h-2.5 rounded-full bg-green-500"
      : status === "degraded"
      ? "w-2.5 h-2.5 rounded-full bg-yellow-500"
      : status === "down"
      ? "w-2.5 h-2.5 rounded-full bg-red-500"
      : "w-2.5 h-2.5 rounded-full bg-gray-600 animate-pulse";

  const cardClass = [
    "relative bg-gray-800/50 border border-gray-700 rounded-xl p-4 cursor-pointer transition-all hover:border-gray-500 flex flex-col items-center",
    isSelected ? "border-purple-500 ring-1 ring-purple-500 bg-gray-800" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={cardClass} onClick={onClick}>
      <span className="absolute top-2 right-2">
        <span className={badgeClass} />
      </span>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
        style={{ backgroundColor: color }}
      >
        {name.charAt(0)}
      </div>
      <span className="text-sm font-medium text-gray-200 mt-2 text-center leading-tight">
        {name}
      </span>
    </button>
  );
}
