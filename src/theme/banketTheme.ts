// MinaDent Theme - Inspired by Banket (Bank Mellat)
// Premium Green Banking Theme for 2026

export const colors = {
  // Primary - Banket Green
  primary: {
    50: '#e6f7ed',
    100: '#b3e8c7',
    200: '#80d9a1',
    300: '#4dca7b',
    400: '#26ba5e',
    500: '#00a651', // Main Banket Green
    600: '#008f45',
    700: '#006d35',
    800: '#004b24',
    900: '#002914',
  },

  // Secondary - Teal Accent
  secondary: {
    50: '#e6f7f8',
    100: '#b3e9ed',
    200: '#80dbe2',
    300: '#4dcdd7',
    400: '#26bfcc',
    500: '#00b1c1',
    600: '#0096a3',
    700: '#007481',
    800: '#00525c',
    900: '#002f36',
  },

  // Accent - Gold
  accent: {
    50: '#fff9e6',
    100: '#fff0b3',
    200: '#ffe680',
    300: '#ffdc4d',
    400: '#ffd226',
    500: '#ffc700',
    600: '#d9a800',
    700: '#a68200',
    800: '#735c00',
    900: '#403600',
  },

  // Success
  success: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },

  // Warning - Orange
  warning: {
    50: '#fff3e0',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800',
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100',
  },

  // Error - Red
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },

  // Neutral - Gray Scale
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Backgrounds
  background: {
    primary: '#fafafa',
    secondary: '#f0f4f0',
    card: '#ffffff',
    modal: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Glass Effect Colors
  glass: {
    light: 'rgba(255, 255, 255, 0.8)',
    medium: 'rgba(255, 255, 255, 0.6)',
    dark: 'rgba(0, 0, 0, 0.4)',
  },

  // Gradient Definitions
  gradients: {
    primary: ['#00a651', '#008f45'],
    secondary: ['#00b1c1', '#0096a3'],
    accent: ['#ffc700', '#d9a800'],
    success: ['#4caf50', '#388e3c'],
    danger: ['#f44336', '#c62828'],
    glass: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
    header: ['#00a651', '#008f45'],
    card: ['#ffffff', '#f5f9f5'],
  },

  // Shadows
  shadows: {
    none: {},
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
  },
};

export const typography = {
  fontFamily: {
    light: 'Vazirmatn-Light',
    regular: 'Vazirmatn-Regular',
    medium: 'Vazirmatn-Medium',
    bold: 'Vazirmatn-Bold',
    black: 'Vazirmatn-Black',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Motion System for Premium Animations
export const motion = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  slideUp: {
    from: { transform: [{ translateY: 100 }] },
    to: { transform: [{ translateY: 0 }] },
  },
  slideDown: {
    from: { transform: [{ translateY: -100 }] },
    to: { transform: [{ translateY: 0 }] },
  },
  scale: {
    from: { transform: [{ scale: 0.9 }] },
    to: { transform: [{ scale: 1 }] },
  },
};

// Glass Effect Styles
export const glassEffect = {
  light: {
    backgroundColor: colors.glass.light,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  medium: {
    backgroundColor: colors.glass.medium,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
};

// Card Styles
export const cardStyles = {
  default: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...colors.shadows.md,
  },
  elevated: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...colors.shadows.lg,
  },
  glass: {
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gradient: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...colors.shadows.md,
  },
};

// Dock Navigation Styles
export const dockStyles = {
  container: {
    flexDirection: 'row',
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius.xxl,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...colors.shadows.lg,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 56,
    minHeight: 56,
  },
  itemActive: {
    backgroundColor: colors.primary[500],
  },
};

// Chip Styles
export const chipStyles = {
  default: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[100],
  },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success[100],
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning[100],
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error[100],
  },
};

// Export theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
  motion,
  glassEffect,
  cardStyles,
  dockStyles,
  chipStyles,
};

export default theme;
