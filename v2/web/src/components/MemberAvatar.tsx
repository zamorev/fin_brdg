import { useEffect, useState } from "react";
import type { FamilyMember } from "../domain/types";
import { fetchMemberAvatarUrl } from "../api/client";

type Props = {
  member: FamilyMember;
  size?: number;
};

export function MemberAvatar({ member, size = 40 }: Props) {
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

  const fallback = member.userType === "parent" ? "👤" : "🎒";

  if (src) {
    return (
      <img
        className="member-avatar"
        src={src}
        alt=""
        width={size}
        height={size}
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
