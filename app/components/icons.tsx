import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { CategoryKey } from "./theme";

type IconProps = {
  size?: number;
  style?: CSSProperties;
  className?: string;
  "aria-hidden"?: boolean;
};

const makeIcon =
  (path: ReactNode, opts: { fill?: boolean; sw?: number } = {}) =>
  ({ size = 16, style, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={opts.fill ? "currentColor" : "none"}
      stroke={opts.fill ? "none" : "currentColor"}
      strokeWidth={opts.sw ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...rest}
    >
      {path}
    </svg>
  );

export const SunIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </>,
);

export const MoonIcon = makeIcon(
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
);

export const BankIcon = makeIcon(<path d="M4 10h16M5 10v7M19 10v7M2 21h20M12 3l8 5H4z" />);

export const PlusIcon = makeIcon(<path d="M12 5v14M5 12h14" />, { sw: 2.4 });

export const ArrowUpRight = makeIcon(
  <>
    <path d="M7 17 17 7" />
    <path d="M9 7h8v8" />
  </>,
  { sw: 2.2 },
);

export const ArrowDownRight = makeIcon(
  <>
    <path d="M7 7l10 10" />
    <path d="M17 8v9H8" />
  </>,
  { sw: 2.2 },
);

export const SearchIcon = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

export const BellIcon = makeIcon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </>,
);

export const ChevronIcon = makeIcon(<path d="m6 9 6 6 6-6" />, { sw: 2 });

export const CalendarIcon = makeIcon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
);

export const LogoutIcon = makeIcon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>,
);

export const PaperclipIcon = makeIcon(
  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
);

export const ImageIcon = makeIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </>,
);

// Category icons
export const FoodIcon = makeIcon(
  <>
    <path d="M6 2v8a3 3 0 0 0 6 0V2" />
    <path d="M9 2v20" />
    <path d="M16 2c-1.5 2-2 4-2 6s.5 4 2 5v9" />
  </>,
);

export const TransportIcon = makeIcon(
  <>
    <rect x="3" y="6" width="18" height="11" rx="2" />
    <path d="M5 17v2M19 17v2" />
    <circle cx="8" cy="13" r="1.2" />
    <circle cx="16" cy="13" r="1.2" />
    <path d="M3 10h18" />
  </>,
);

export const BillsIcon = makeIcon(
  <>
    <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </>,
);

export const EntertainIcon = makeIcon(
  <>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="m10 10 5 2-5 2z" />
  </>,
);

export const ShoppingIcon = makeIcon(
  <>
    <path d="M5 8h14l-1.5 12h-11z" />
    <path d="M9 8V5a3 3 0 0 1 6 0v3" />
  </>,
);

export const IncomeIcon = makeIcon(
  <>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </>,
);

export const HealthIcon = makeIcon(
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
);

export const EducationIcon = makeIcon(
  <>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </>
);

export const GiftIcon = makeIcon(
  <>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8V21M7 8V3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" />
    <path d="M5 12v9h14v-9" />
  </>
);

export const InvestIcon = makeIcon(
  <>
    <path d="M12 20v-6M6 20V10M18 20V4" />
    <path d="m3 3 18 18" />
  </>
);

export const OtherIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </>
);

export const CameraIcon = makeIcon(<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />);
export const GlobeIcon = makeIcon(<>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20" />
  <path d="M12 2a14.5 14.5 0 0 1 0 20" />
</>);
export const MusicIcon = makeIcon(<>
  <path d="M9 18V5l12-2v13" />
  <circle cx="6" cy="18" r="3" />
  <circle cx="18" cy="16" r="3" />
</>);
export const BookIcon = makeIcon(<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z" />);
export const PawIcon = makeIcon(<path d="M11 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0z M17 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0z M7 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0z M21 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0z M12 11c-3.3 0-6 2.7-6 6a3 3 0 0 0 3 3 2 2 0 0 1 2 2 1 1 0 0 0 2 0 2 2 0 0 1 2-2 3 3 0 0 0 3-3c0-3.3-2.7-6-6-6z" />);
export const PlaneIcon = makeIcon(<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-1-3-.5-4.5 1L13 7.5l-8.2-1.8c-1-.2-1.8.2-2.3.7l-.5.5 8.4 4.6-3.3 3.3-3.1-1c-.7-.2-1.6.1-2 .7l-.3.3 4.5 2.1 2.1 4.5.3-.3c.6-.4.9-1.3.7-2l-1-3.1 3.3-3.3 4.6 8.4.5-.5c.5-.5.9-1.3.7-2.3z" />);
export const FlashIcon = makeIcon(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />);
export const ShieldIcon = makeIcon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);
export const StarIcon = makeIcon(<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />);
export const CloudIcon = makeIcon(<path d="M17.5 19c3.037 0 5.5-2.463 5.5-5.5 0-2.813-2.115-5.132-4.885-5.447C17.65 4.75 14.1 2 10 2 6.34 2 3.32 4.195 2.215 7.375 0.94 8.243 0 9.768 0 11.5 0 14.537 2.463 17 5.5 17h12z" />);

export const CartIcon = makeIcon(<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z M3 6h18 M16 10a4 4 0 0 1-8 0" />);
export const ToolIcon = makeIcon(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77Z" />);
export const CoffeeIcon = makeIcon(<path d="M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3" />);
export const SmileIcon = makeIcon(<>
  <circle cx="12" cy="12" r="10" />
  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
  <line x1="9" y1="9" x2="9.01" y2="9" />
  <line x1="15" y1="9" x2="15.01" y2="9" />
</>);
export const UserIcon = makeIcon(<>
  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
  <circle cx="12" cy="7" r="4" />
</>);
export const HouseIcon = makeIcon(<>
  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  <polyline points="9 22 9 12 15 12 15 22" />
</>);
export const BriefIcon = makeIcon(<>
  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
</>);
export const HeartIcon = makeIcon(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />);
export const SmartIcon = makeIcon(<>
  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
  <path d="M12 18h.01" />
</>);

const CAT_ICON_MAP: Record<string, (p: IconProps) => ReactElement> = {
  food: FoodIcon,
  transport: TransportIcon,
  bills: BillsIcon,
  entertainment: EntertainIcon,
  shopping: ShoppingIcon,
  income: IncomeIcon,
  health: HealthIcon,
  education: EducationIcon,
  gift: GiftIcon,
  investment: InvestIcon,
  other: OtherIcon,
  // Custom friendly
  coffee: CoffeeIcon,
  cart: CartIcon,
  tool: ToolIcon,
  smile: SmileIcon,
  user: UserIcon,
  house: HouseIcon,
  briefcase: BriefIcon,
  heart: HeartIcon,
  smartphone: SmartIcon,
  camera: CameraIcon,
  globe: GlobeIcon,
  music: MusicIcon,
  book: BookIcon,
  paw: PawIcon,
  plane: PlaneIcon,
  flash: FlashIcon,
  shield: ShieldIcon,
  star: StarIcon,
  cloud: CloudIcon,
  moon: MoonIcon,
  bank: BankIcon,
};

export const CUSTOM_ICONS = [
  { key: "coffee", Icon: CoffeeIcon },
  { key: "cart", Icon: CartIcon },
  { key: "tool", Icon: ToolIcon },
  { key: "smile", Icon: SmileIcon },
  { key: "user", Icon: UserIcon },
  { key: "house", Icon: HouseIcon },
  { key: "briefcase", Icon: BriefIcon },
  { key: "flash", Icon: FlashIcon },
  { key: "smartphone", Icon: SmartIcon },
  { key: "camera", Icon: CameraIcon },
  { key: "globe", Icon: GlobeIcon },
  { key: "music", Icon: MusicIcon },
  { key: "book", Icon: BookIcon },
  { key: "shield", Icon: ShieldIcon },
  { key: "plane", Icon: PlaneIcon },
  { key: "star", Icon: StarIcon },
  { key: "investment", Icon: InvestIcon },
  { key: "bank", Icon: BankIcon },
  { key: "food", Icon: FoodIcon },
  { key: "transport", Icon: TransportIcon },
];

export function CatIcon({
  cat,
  size = 16,
  style,
}: {
  cat: string;
  size?: number;
  style?: CSSProperties;
}) {
  const C = CAT_ICON_MAP[cat] ?? OtherIcon;
  return <C size={size} style={style} />;
}
