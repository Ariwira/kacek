import type { CSSProperties, ReactNode } from "react";

type IconProps = {
  size?: number;
  style?: CSSProperties;
  className?: string;
};

const make =
  (path: ReactNode, sw = 1.8) =>
  ({ size = 16, style, className }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
    >
      {path}
    </svg>
  );

export const HomeIcon = make(
  <>
    <path d="M3 12 12 4l9 8" />
    <path d="M5 10v10h14V10" />
  </>,
);

export const ListIcon = make(
  <>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </>,
);

export const WalletIcon = make(
  <>
    <path d="M3 8a2 2 0 0 1 2-2h12l4 4v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M16 14h2" />
  </>,
);

export const TargetIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </>,
);

export const TrashIcon = make(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </>,
);

export const EditIcon = make(
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
  </>,
);

export const FilterIcon = make(
  <>
    <path d="M3 5h18" />
    <path d="M6 12h12" />
    <path d="M10 19h4" />
  </>,
);

export const MenuIcon = make(
  <>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </>,
);

export const ArrowLeftIcon = make(
  <>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>,
);

export const CheckIcon = make(<path d="m5 12 5 5L20 7" />, 2.4);

export const CloseIcon = make(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>,
  2.2,
);

export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />, 2);

export const DownloadIcon = make(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </>,
);

export const AlertTriangleIcon = make(
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
);

export const ArrowRightIcon = make(
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>,
  2,
);

export const BankIcon = make(
  <>
    <path d="M4 10h16M5 10v7M19 10v7M2 21h20M12 3l8 5H4z" />
  </>
);

export const SmartphoneIcon = make(
  <>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </>
);

export const ScanIcon = make(
  <>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M3 17v2a2 2 0 0 1 2 2h2" />
    <path d="M7 12h10" />
    <path d="M12 7v10" />
  </>
);
