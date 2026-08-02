"use client";

import { Circle, List, ListTree, Network } from "lucide-react";
import { useMemberListView } from "@/context/MemberListContext";

export type ViewMode = "list" | "tree" | "mindmap" | "bubble";

export default function ViewToggle({ tabs: visibleIds }: { tabs?: ViewMode[] }) {
  const { view: currentView, setView } = useMemberListView();

  const allTabs = [
    { id: "list", label: "Danh sách", icon: List },
    { id: "tree", label: "Sơ đồ cây", icon: Network },
    { id: "mindmap", label: "Mindmap", icon: ListTree },
    { id: "bubble", label: "Bong bóng", icon: Circle },
  ] as const;

  const tabs = visibleIds
    ? allTabs.filter((t) => visibleIds.includes(t.id as ViewMode))
    : allTabs;

  return (
    <div className="mx-auto mt-4 mb-2 flex w-fit items-stretch border border-border bg-card">
      {tabs.map((tab, i) => {
        const isActive = currentView === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as ViewMode)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors duration-150 ${
              i > 0 ? "border-l border-border" : ""
            } ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
