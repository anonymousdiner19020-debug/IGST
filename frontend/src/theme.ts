// Philadelphia sports color identity:
// Eagles Midnight Green, Flyers Orange, Phillies Red, Sixers Royal Blue, Kelly Green.
export const colors = {
  surface: "#F4F7F5",
  onSurface: "#0B1F22",
  surfaceSecondary: "#E4EDE9",
  surfaceTertiary: "#CBDDD5",
  surfaceInverse: "#004C54", // Eagles Midnight Green
  onSurfaceInverse: "#FFFFFF",
  brand: "#F74902", // Flyers Orange
  onBrand: "#FFFFFF",
  brandSecondary: "#E81828", // Phillies Red
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#006BB6", // Sixers Royal Blue
  onBrandTertiary: "#FFFFFF",
  success: "#1C7C3B", // Kelly Green
  onSuccess: "#FFFFFF",
  warning: "#F6A623",
  onWarning: "#0B1F22",
  error: "#E81828", // Phillies Red
  onError: "#FFFFFF",
  info: "#006BB6",
  onInfo: "#FFFFFF",
  border: "#CFE0D8",
  borderStrong: "#004C54",
  divider: "#DCE7E2",
  overlay: "rgba(0, 30, 34, 0.62)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const shadow = {
  tier1: {
    shadowColor: "#002A30",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  tier2: {
    shadowColor: "#002A30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  tier3: {
    shadowColor: "#002A30",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
};

export const font = {
  display: undefined as string | undefined,
  body: undefined as string | undefined,
};
