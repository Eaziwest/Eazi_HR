// Lightweight inline stroke-icon set (no external icon library required)
function Svg({ children, ...props }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>
);
export const IconClock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const IconMegaphone = (p) => (
  <Svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6l-4 4H4a1 1 0 0 0-1 1Z" /><path d="M14 8a4 4 0 0 1 0 8" /><path d="M17 5a8 8 0 0 1 0 14" /></Svg>
);
export const IconUsers = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" /><circle cx="17.5" cy="8.5" r="2.4" /><path d="M15.8 13.6c2.7.4 4.7 2.6 4.7 5.7" /></Svg>
);
export const IconChecklist = (p) => (
  <Svg {...p}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="m3.5 6 1 1 2-2" /><path d="m3.5 12 1 1 2-2" /><path d="m3.5 18 1 1 2-2" /></Svg>
);
export const IconCalendarOff = (p) => (
  <Svg {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /><path d="M7 2.5v4M17 2.5v4" /><path d="m9 14 6 6M15 14l-6 6" /></Svg>
);
export const IconThermometer = (p) => (
  <Svg {...p}><path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z" /></Svg>
);
export const IconStar = (p) => (
  <Svg {...p}><path d="m12 3 2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6Z" /></Svg>
);
export const IconBriefcase = (p) => (
  <Svg {...p}><rect x="3" y="7.5" width="18" height="12" rx="2" /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" /><path d="M3 12.5h18" /></Svg>
);
export const IconAddressBook = (p) => (
  <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="2.3" /><path d="M8.5 16.5c.5-2 2-3 3.5-3s3 1 3.5 3" /><path d="M3 8h1M3 13h1" /></Svg>
);
export const IconUser = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" /></Svg>
);
export const IconBuilding = (p) => (
  <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" /></Svg>
);
export const IconLogout = (p) => (
  <Svg {...p}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Svg>
);
export const IconSearch = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
);
export const IconBell = (p) => (
  <Svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></Svg>
);
export const IconMail = (p) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6.5 8 6 8-6" /></Svg>
);
export const IconChevronDown = (p) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
);
export const IconChevronsLeft = (p) => (
  <Svg {...p}><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></Svg>
);
export const IconTrendUp = (p) => (
  <Svg {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></Svg>
);
export const IconTrendDown = (p) => (
  <Svg {...p}><path d="m3 7 6 6 4-4 8 8" /><path d="M15 17h6v-6" /></Svg>
);
export const IconDots = (p) => (
  <Svg {...p}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></Svg>
);
export const IconBarChart = (p) => (
  <Svg {...p}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M20 20v-3" /></Svg>
);
export const IconCheck = (p) => (
  <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>
);
export const IconX = (p) => (
  <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
);
