// constants/colors.ts
export const Colors = {
  // Light Theme
  light: {
    background: '#ffffff',
    foreground: '#252525', // oklch(0.145 0 0) equivalent
    card: '#ffffff',
    cardForeground: '#252525',
    popover: '#ffffff', // oklch(1 0 0)
    popoverForeground: '#252525',
    primary: '#030213',
    primaryForeground: '#ffffff', // oklch(1 0 0)
    secondary: '#f2f2f8', // oklch(0.95 0.0058 264.53)
    secondaryForeground: '#030213',
    muted: '#ececf0',
    mutedForeground: '#717182',
    accent: '#e9ebef',
    accentForeground: '#030213',
    destructive: '#d4183d',
    destructiveForeground: '#ffffff',
    border: 'rgba(0, 0, 0, 0.1)',
    input: 'transparent',
    inputBackground: '#f3f3f5',
    switchBackground: '#cbced4',
    ring: '#b4b4b4', // oklch(0.708 0 0)
    chart1: '#d47716', // oklch(0.646 0.222 41.116)
    chart2: '#0d9488', // oklch(0.6 0.118 184.704)
    chart3: '#3b82f6', // oklch(0.398 0.07 227.392)
    chart4: '#eab308', // oklch(0.828 0.189 84.429)
    chart5: '#f59e0b', // oklch(0.769 0.188 70.08)
    sidebar: '#fbfbfb', // oklch(0.985 0 0)
    sidebarForeground: '#252525',
    sidebarPrimary: '#030213',
    sidebarPrimaryForeground: '#fbfbfb',
    sidebarAccent: '#f7f7f7', // oklch(0.97 0 0)
    sidebarAccentForeground: '#343434', // oklch(0.205 0 0)
    sidebarBorder: '#ebebeb', // oklch(0.922 0 0)
    sidebarRing: '#b4b4b4',
  },
  // Dark Theme
  dark: {
    background: '#252525', // oklch(0.145 0 0)
    foreground: '#fbfbfb', // oklch(0.985 0 0)
    card: '#252525',
    cardForeground: '#fbfbfb',
    popover: '#252525',
    popoverForeground: '#fbfbfb',
    primary: '#fbfbfb', // oklch(0.985 0 0)
    primaryForeground: '#343434', // oklch(0.205 0 0)
    secondary: '#454545', // oklch(0.269 0 0)
    secondaryForeground: '#fbfbfb',
    muted: '#454545', // oklch(0.269 0 0)
    mutedForeground: '#b4b4b4', // oklch(0.708 0 0)
    accent: '#454545', // oklch(0.269 0 0)
    accentForeground: '#fbfbfb',
    destructive: '#dc2626', // oklch(0.396 0.141 25.723)
    destructiveForeground: '#f87171', // oklch(0.637 0.237 25.331)
    border: '#454545', // oklch(0.269 0 0)
    input: '#454545',
    ring: '#707070', // oklch(0.439 0 0)
    chart1: '#6366f1', // oklch(0.488 0.243 264.376)
    chart2: '#10b981', // oklch(0.696 0.17 162.48)
    chart3: '#f59e0b', // oklch(0.769 0.188 70.08)
    chart4: '#8b5cf6', // oklch(0.627 0.265 303.9)
    chart5: '#ef4444', // oklch(0.645 0.246 16.439)
    sidebar: '#343434', // oklch(0.205 0 0)
    sidebarForeground: '#fbfbfb',
    sidebarPrimary: '#6366f1', // oklch(0.488 0.243 264.376)
    sidebarPrimaryForeground: '#fbfbfb',
    sidebarAccent: '#454545', // oklch(0.269 0 0)
    sidebarAccentForeground: '#fbfbfb',
    sidebarBorder: '#454545',
    sidebarRing: '#707070',
  },
  // Brand Colors
  brand: {
    primary: '#FFCE1B', // Your yellow brand color
    primaryDark: '#030213', // Your dark brand color
  },
};

export const Sizes = {
  radius: {
    sm: 6,  // calc(0.625rem - 4px) = 6px
    md: 8,  // calc(0.625rem - 2px) = 8px  
    lg: 10, // 0.625rem = 10px
    xl: 14, // calc(0.625rem + 4px) = 14px
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};