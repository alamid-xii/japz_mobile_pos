// styles/authStyles.ts
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Colors, Sizes } from '../constants/colors';
import { GlobalStyles } from './globalStyles';

type CombinedStyle = ViewStyle & TextStyle;

export const authStyles = StyleSheet.create<Record<string, CombinedStyle | ImageStyle>>({
  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Sizes.spacing.xl,
  } as CombinedStyle,
  logo: {
    width: 192,
    height: 192,
    marginBottom: Sizes.spacing.xl,
    borderRadius: Sizes.radius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  } as CombinedStyle,
  logoImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  title: {
    ...GlobalStyles.h1,
    textAlign: 'center',
    marginBottom: Sizes.spacing.sm,
  } as CombinedStyle,
  subtitle: {
    ...GlobalStyles.body,
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    marginBottom: Sizes.spacing.xxl,
  } as CombinedStyle,
  primaryButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Sizes.radius.lg,
    paddingVertical: Sizes.spacing.md,
    paddingHorizontal: Sizes.spacing.xl,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: Sizes.spacing.md,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  primaryButtonText: {
    ...GlobalStyles.buttonText,
    color: Colors.brand.primaryDark,
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,
  secondaryButton: {
    paddingVertical: Sizes.spacing.md,
  } as CombinedStyle,
  secondaryButtonText: {
    ...GlobalStyles.body,
    textAlign: 'center',
    color: Colors.light.foreground,
  } as CombinedStyle,
  linkText: {
    color: Colors.brand.primary,
    textDecorationLine: 'underline',
  } as CombinedStyle,

  // Login & Registration Common
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  } as CombinedStyle,
  content: {
    padding: Sizes.spacing.xl,
    paddingTop: Sizes.spacing.xl,
  } as CombinedStyle,
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Sizes.spacing.lg,
  } as CombinedStyle,
  backButtonText: {
    ...GlobalStyles.body,
    marginLeft: Sizes.spacing.xs,
    color: Colors.light.foreground,
  } as CombinedStyle,
  form: {
    marginBottom: Sizes.spacing.xl,
  } as CombinedStyle,
  inputGroup: {
    marginBottom: Sizes.spacing.lg,
  } as CombinedStyle,
  label: {
    ...GlobalStyles.label,
    marginBottom: Sizes.spacing.sm,
    color: Colors.light.foreground,
  } as CombinedStyle,
  input: {
    backgroundColor: Colors.light.inputBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Sizes.radius.lg,
    paddingHorizontal: Sizes.spacing.md,
    paddingVertical: Sizes.spacing.md,
    fontSize: Sizes.typography.base,
    color: Colors.light.foreground,
  } as CombinedStyle,
  inputError: {
    borderColor: Colors.light.destructive,
  } as CombinedStyle,
  errorText: {
    color: Colors.light.destructive,
    fontSize: Sizes.typography.sm,
    marginTop: Sizes.spacing.xs,
  } as CombinedStyle,
  buttonDisabled: {
    opacity: 0.6,
  } as CombinedStyle,
  linkButton: {
    alignItems: 'center',
  } as CombinedStyle,
  linkHighlight: {
    color: '#BA8e23',
    textDecorationLine: 'underline',
  } as CombinedStyle,

  // Login Specific
  demoBox: {
    backgroundColor: Colors.light.muted,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    marginBottom: Sizes.spacing.xl,
  } as CombinedStyle,
  demoTitle: {
    ...GlobalStyles.label,
    marginBottom: Sizes.spacing.sm,
    color: Colors.light.foreground,
  } as CombinedStyle,
  demoText: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    marginBottom: Sizes.spacing.xs,
  } as CombinedStyle,
  demoHint: {
    marginTop: Sizes.spacing.sm,
    fontStyle: 'italic',
  } as CombinedStyle,

  // Registration Specific
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Sizes.spacing.md,
  } as CombinedStyle,
  roleButton: {
    flex: 1,
    backgroundColor: Colors.light.muted,
    borderRadius: Sizes.radius.md,
    paddingVertical: Sizes.spacing.md,
    paddingHorizontal: Sizes.spacing.sm,
    alignItems: 'center',
    marginHorizontal: Sizes.spacing.xs,
  } as CombinedStyle,
  roleButtonSelected: {
    backgroundColor: Colors.brand.primary,
  } as CombinedStyle,
  roleButtonText: {
    ...GlobalStyles.body,
    color: Colors.light.foreground,
    textAlign: 'center',
  } as CombinedStyle,
  roleButtonTextSelected: {
    color: Colors.brand.primaryDark,
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,

  // Role Selection
  roleSelectionContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Sizes.spacing.xl,
  } as CombinedStyle,
  roleButtons: {
    width: '100%',
    gap: Sizes.spacing.md,
  } as CombinedStyle,
});

// Export named exports for backward compatibility
export const welcomeStyles = authStyles;
export const loginStyles = authStyles;
export const registrationStyles = authStyles;
export const roleSelectionStyles = authStyles;