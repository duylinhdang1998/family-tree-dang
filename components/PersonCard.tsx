"use client";

import { Person } from "@/types";
import { getAvatarBg } from "@/utils/styleHelprs";
import Image from "next/image";
import { useMemberListView } from "@/context/MemberListContext";
import DefaultAvatar from "./DefaultAvatar";
import { FemaleIcon, MaleIcon } from "./GenderIcons";

interface PersonCardProps {
  person: Person;
}

export default function PersonCard({ person }: PersonCardProps) {
  const { setMemberModalId } = useMemberListView();

  const isDeceased = person.is_deceased;

  const getGenderStyle = (gender: string) => {
    if (gender === "male") return "bg-sky-100 text-sky-600";
    if (gender === "female") return "bg-rose-100 text-rose-600";
    return "bg-stone-100 text-stone-600";
  };

  return (
    <button
      onClick={() => setMemberModalId(person.id)}
      className={`group block relative bg-card p-3 sm:p-4 rounded-md border border-border hover:border-foreground/40 transition-colors duration-150 overflow-hidden
        ${isDeceased ? "opacity-80" : ""}`}
    >
      <div className="flex items-center space-x-4 relative z-10">
        <div className="relative">
          <div
            className={`size-14 sm:size-16 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 ring-1 ring-border
            ${getAvatarBg(person.gender)}`}
          >
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              <DefaultAvatar gender={person.gender} size={32} />
            )}
          </div>
          {/* Gender Indicator Icon */}
          <div
            className={`absolute bottom-0 right-0 size-5 rounded-full ring-2 ring-card flex items-center justify-center ${getGenderStyle(person.gender)}`}
          >
            {person.gender === "male" ? (
              <MaleIcon className="size-5" />
            ) : person.gender === "female" ? (
              <FemaleIcon className="size-5" />
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base text-left sm:text-lg font-display font-semibold text-foreground tracking-tight truncate mb-1.5">
            {person.full_name}
          </h3>
          <p className="font-mono text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <svg
              className="size-3.5 shrink-0 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">
              {person.birth_year || "..."}
              {isDeceased &&
                ` → ${person.death_lunar_year || person.death_year || "..."}`}
            </span>
          </p>
          {(isDeceased ||
            person.is_in_law ||
            person.birth_order != null ||
            person.generation != null) && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 mt-2">
              {person.is_in_law && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-widest border border-border bg-muted text-muted-foreground">
                  {person.gender === "male"
                    ? "Rể"
                    : person.gender === "female"
                      ? "Dâu"
                      : "Khách"}
                </span>
              )}
              {person.birth_order != null && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-widest border border-border bg-muted text-muted-foreground">
                  {person.birth_order === 1
                    ? "Con trưởng"
                    : `Con thứ ${person.birth_order}`}
                </span>
              )}
              {person.generation != null && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-widest border border-border bg-muted text-muted-foreground">
                  Đời thứ {person.generation}
                </span>
              )}
              {isDeceased && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-widest border border-border bg-muted text-muted-foreground">
                  Đã mất
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
