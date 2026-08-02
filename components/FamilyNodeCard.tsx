"use client";

import { Person } from "@/types";
import { getAvatarBg } from "@/utils/styleHelprs";
import Image from "next/image";
import { useMemberListView } from "@/context/MemberListContext";
import DefaultAvatar from "./DefaultAvatar";

interface FamilyNodeCardProps {
  person: Person;
  role?: string; // e.g., "Chồng", "Vợ"
  note?: string | null;
  onClickCard?: () => void;
  onClickName?: (e: React.MouseEvent) => void;
  isRingVisible?: boolean;
  isPlusVisible?: boolean;
  level: number;
}

export default function FamilyNodeCard({
  person,
  onClickCard,
  onClickName,
  isRingVisible = false,
  isPlusVisible = false,
}: FamilyNodeCardProps) {
  const { showAvatar, setMemberModalId } = useMemberListView();

  const isDeceased = person.is_deceased;

  const content = (
    <div
      onClick={onClickCard}
      className={`
        group py-2 px-1 flex flex-col items-center justify-start transition-colors duration-150 rounded-md relative h-full
        ${isDeceased ? "grayscale-[0.4] opacity-80" : ""}
        ${showAvatar ? "w-20 sm:w-24 md:w-28 bg-card border border-border hover:border-foreground/40" : "px-3"}
      `}
    >
      {isRingVisible && (
        <div
          className={`
            absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-100 flex items-center justify-center text-[10px] sm:text-sm font-medium text-stone-500
            ${showAvatar ? "shadow-sm bg-white" : ""}
          `}
        >
          <span className="leading-none">💍</span>
        </div>
      )}
      {isPlusVisible && (
        <div
          className={`
            absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-100 flex items-center justify-center text-[10px] sm:text-sm font-medium text-stone-500
            ${showAvatar ? "shadow-sm bg-white" : ""}
          `}
        >
          <span className="leading-none">+</span>
        </div>
      )}

      {/* 1. Avatar */}
      {showAvatar && (
        <div className="relative z-10 mb-1.5 sm:mb-2">
          <div
            className={`
              h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm text-white overflow-hidden shrink-0 ring-1 ring-border
              ${getAvatarBg(person.gender)}
            `}
          >
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                className="w-full h-full object-cover"
                width={64}
                height={64}
              />
            ) : (
              <DefaultAvatar gender={person.gender} size={64} />
            )}
          </div>
        </div>
      )}

      {/* 2. Gender Icon + Name */}
      <div className="flex flex-col items-center justify-center gap-1 w-full px-0.5 sm:px-1 relative z-10">
        <div
          className={`
            text-[10px] sm:text-[11px] md:text-xs font-semibold text-center leading-tight transition-colors cursor-pointer
            ${onClickName ? "text-foreground group-hover:underline" : "text-foreground"}
          `}
          title={person.full_name}
          onClick={(e) => {
            if (onClickName) {
              e.stopPropagation();
              e.preventDefault();
              onClickName(e);
            }
          }}
        >
          {showAvatar
            ? person.full_name
            : person.full_name.split(" ").map((word, i) => (
                <span key={i} className="block">
                  {word}
                </span>
              ))}
        </div>
      </div>
    </div>
  );

  if (onClickCard || onClickName) {
    return content;
  }

  return (
    <button onClick={() => setMemberModalId(person.id)} className="block w-fit">
      {content}
    </button>
  );
}
