import { useEffect, useState } from "react";
import type { FamilyMember } from "../domain/types";
import { fetchMemberAvatarUrl } from "../api/client";

type Props = {
  member: FamilyMember;
  size?: number;
  /** Без фото — инициал в цвете, закреплённом за участником (экраны родителя, T20). */
  initials?: boolean;
};

// Пары фон/текст, читаются и в светлой, и в тёмной теме Telegram.
const AVATAR_TONES = ["#4c8df6", "#d19a1a", "#2fa866", "#b05cc8", "#e0664f"];

function avatarTone(telegramId: number): string {
  return AVATAR_TONES[Math.abs(telegramId) % AVATAR_TONES.length];
}

function initialOf(name: string): string {
  const clean = name.trim().replace(/^@/, "");
  return (clean[0] ?? "?").toUpperCase();
}

export function MemberAvatar({ member, size = 40, initials = false }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (member.photoUrl?.startsWith("https://")) {
      setSrc(member.photoUrl);
      return;
    }

    setSrc(null);
    void fetchMemberAvatarUrl(member.telegramId)
      .then((url) => {
        objectUrl = url;
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [member.telegramId, member.photoUrl]);

  if (initials) {
    const tone = avatarTone(member.telegramId);
    return (
      <span
        className="member-avatar member-avatar--fallback"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          fontWeight: 600,
          color: tone,
          background: `color-mix(in srgb, ${tone} 18%, transparent)`,
        }}
        aria-hidden
      >
        {initialOf(member.displayName)}
      </span>
    );
  }

  const fallback = member.userType === "parent" ? "👤" : "🎒";

  if (src) {
    return (
      <img
        className="member-avatar"
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className="member-avatar member-avatar--fallback"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {fallback}
    </span>
  );
}
