// constants/colors.ts
export const Colors = {
  // Light Theme
  light: {
    background: '#ffffff',
    foreground: 'oklch(0.145 0 0)', // #252525 equivalent
    card: '#ffffff',
    cardForeground: 'oklch(0.145 0 0)',
    popover: 'oklch(1 0 0)', // #ffffff
    popoverForeground: 'oklch(0.145 0 0)',
    primary: '#030213',
    primaryForeground: 'oklch(1 0 0)', // #ffffff
    secondary: 'oklch(0.95 0.0058 264.53)', // #f2f2f8
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
    ring: 'oklch(0.708 0 0)', // #b4b4b4
    chart1: 'oklch(0.646 0.222 41.116)', // #d47716
    chart2: 'oklch(0.6 0.118 184.704)', // #0d9488
    chart3: 'oklch(0.398 0.07 227.392)', // #3b82f6
    chart4: 'oklch(0.828 0.189 84.429)', // #eab308
    chart5: 'oklch(0.769 0.188 70.08)', // #f59e0b
    sidebar: 'oklch(0.985 0 0)', // #fbfbfb
    sidebarForeground: 'oklch(0.145 0 0)',
    sidebarPrimary: '#030213',
    sidebarPrimaryForeground: 'oklch(0.985 0 0)',
    sidebarAccent: 'oklch(0.97 0 0)', // #f7f7f7
    sidebarAccentForeground: 'oklch(0.205 0 0)', // #343434
    sidebarBorder: 'oklch(0.922 0 0)', // #ebebeb
    sidebarRing: 'oklch(0.708 0 0)',
  },
  // Dark Theme
  dark: {
    background: 'oklch(0.145 0 0)', // #252525
    foreground: 'oklch(0.985 0 0)', // #fbfbfb
    card: 'oklch(0.145 0 0)',
    cardForeground: 'oklch(0.985 0 0)',
    popover: 'oklch(0.145 0 0)',
    popoverForeground: 'oklch(0.985 0 0)',
    primary: 'oklch(0.985 0 0)', // #fbfbfb
    primaryForeground: 'oklch(0.205 0 0)', // #343434
    secondary: 'oklch(0.269 0 0)', // #454545
    secondaryForeground: 'oklch(0.985 0 0)',
    muted: 'oklch(0.269 0 0)',
    mutedForeground: 'oklch(0.708 0 0)', // #b4b4b4
    accent: 'oklch(0.269 0 0)',
    accentForeground: 'oklch(0.985 0 0)',
    destructive: 'oklch(0.396 0.141 25.723)', // #dc2626
    destructiveForeground: 'oklch(0.637 0.237 25.331)', // #f87171
    border: 'oklch(0.269 0 0)', // #454545
    input: 'oklch(0.269 0 0)',
    ring: 'oklch(0.439 0 0)', // #707070
    chart1: 'oklch(0.488 0.243 264.376)', // #6366f1
    chart2: 'oklch(0.696 0.17 162.48)', // #10b981
    chart3: 'oklch(0.769 0.188 70.08)', // #f59e0b
    chart4: 'oklch(0.627 0.265 303.9)', // #8b5cf6
    chart5: 'oklch(0.645 0.246 16.439)', // #ef4444
    sidebar: 'oklch(0.205 0 0)', // #343434
    sidebarForeground: 'oklch(0.985 0 0)',
    sidebarPrimary: 'oklch(0.488 0.243 264.376)', // #6366f1
    sidebarPrimaryForeground: 'oklch(0.985 0 0)',
    sidebarAccent: 'oklch(0.269 0 0)', // #454545
    sidebarAccentForeground: 'oklch(0.985 0 0)',
    sidebarBorder: 'oklch(0.269 0 0)',
    sidebarRing: 'oklch(0.439 0 0)',
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