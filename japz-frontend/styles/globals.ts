import { StyleSheet } from 'react-native';

export const Colors = {
  black: '#000000',
  mustardYellow: '#FFCE1B',
  white: '#FFFFFF',
  explosiveGray: '#C3C3C3',
  background: '#FFFFFF',
  foreground: '#000000',
  primary: '#000000',
  primaryForeground: '#FFFFFF',
  destructive: '#DC2626',
  border: 'rgba(0, 0, 0, 0.1)',
  inputBackground: '#F3F4F6',
  mutedForeground: '#717182',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPrimary: {
    backgroundColor: Colors.mustardYellow,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonPrimaryText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 44,
    color: Colors.black,
  },
});