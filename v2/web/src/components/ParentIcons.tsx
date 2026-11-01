// Обводные иконки экранов родителя (T20): currentColor, без эмодзи.
type IconProps = { size?: number };

function Svg({ size = 24, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function InboxIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 13h4l1.5 2.5h5L16 13h4" />
      <path d="M5.5 6.5 4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5l-1.5-6.5a1 1 0 0 0-1-.8h-11a1 1 0 0 0-1 .8z" />
    </Svg>
  );
}

export function FamilyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 13.6c2.6.2 4.5 2.1 4.5 4.9" />
    </Svg>
  );
}

export function ChevronRight(p: IconProps) {
  return (
    <span className="pv-chevron">
      <Svg size={p.size ?? 16}>
        <path d="m9 6 6 6-6 6" />
      </Svg>
    </span>
  );
}

export function ChevronLeft(p: IconProps) {
  return (
    <Svg size={p.size ?? 20}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  );
}

export function InfoIcon(p: IconProps) {
  return (
    <Svg size={p.size ?? 18}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5v.01" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg size={p.size ?? 16}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function AlertIcon(p: IconProps) {
  return (
    <Svg size={p.size ?? 16}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16v.01" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg size={p.size ?? 28}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function ArrowRight(p: IconProps) {
  return (
    <Svg size={p.size ?? 20}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}
