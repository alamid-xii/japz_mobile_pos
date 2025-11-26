// styles/cashierStyles.ts
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Colors, Sizes } from '../constants/colors';
import { GlobalStyles } from './globalStyles';

type CombinedStyle = ViewStyle & TextStyle;

export const cashierStyles = StyleSheet.create<Record<string, CombinedStyle>>({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  } as CombinedStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Sizes.spacing.lg,
    paddingTop: Sizes.spacing.lg + 40,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  } as CombinedStyle,
  title: {
    ...GlobalStyles.h1,
  } as CombinedStyle,
  subtitle: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
  } as CombinedStyle,
  logoutButton: {
    padding: Sizes.spacing.sm,
    borderRadius: Sizes.radius.sm,
    backgroundColor: Colors.light.muted,
  } as CombinedStyle,

  // Main Content
  mainContent: {
    flex: 1,
  } as CombinedStyle,

  // Categories
  categoriesScroll: {
    paddingHorizontal: Sizes.spacing.lg,
    paddingVertical: Sizes.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  } as CombinedStyle,
  categoryButton: {
    backgroundColor: Colors.light.muted,
    borderRadius: Sizes.radius.lg,
    paddingHorizontal: Sizes.spacing.lg,
    paddingVertical: Sizes.spacing.md,
    marginRight: Sizes.spacing.sm,
  } as CombinedStyle,
  categoryButtonActive: {
    backgroundColor: Colors.brand.primary,
  } as CombinedStyle,
  categoryButtonText: {
    ...GlobalStyles.body,
    color: Colors.light.foreground,
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,
  categoryButtonTextActive: {
    color: Colors.brand.primaryDark,
  } as CombinedStyle,

  // Menu Grid
  menuGrid: {
    flex: 1,
    padding: Sizes.spacing.lg,
  } as CombinedStyle,
  menuItem: {
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    margin: Sizes.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 100,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  menuItemName: {
    ...GlobalStyles.body,
    textAlign: 'center',
    marginBottom: Sizes.spacing.xs,
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,
  menuItemPrice: {
    ...GlobalStyles.body,
    color: Colors.brand.primary,
    fontWeight: Sizes.fontWeight.bold as any,
  } as CombinedStyle,

  // Cart
  cartSummary: {
    backgroundColor: Colors.light.card,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    padding: Sizes.spacing.lg,
    ...GlobalStyles.shadowLg,
  } as CombinedStyle,
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Sizes.spacing.md,
    gap: Sizes.spacing.sm,
  } as CombinedStyle,
  cartTitle: {
    ...GlobalStyles.h4,
    flex: 1,
  } as CombinedStyle,
  cartCount: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
  } as CombinedStyle,
  cartItems: {
    maxHeight: 200,
    marginBottom: Sizes.spacing.md,
  } as CombinedStyle,
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Sizes.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  } as CombinedStyle,
  cartItemInfo: {
    flex: 1,
  } as CombinedStyle,
  cartItemName: {
    ...GlobalStyles.body,
    marginBottom: 2,
  } as CombinedStyle,
  cartItemPrice: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    fontSize: Sizes.typography.sm,
  } as CombinedStyle,
  cartItemTotal: {
    ...GlobalStyles.body,
    fontWeight: Sizes.fontWeight.medium as any,
    marginRight: Sizes.spacing.sm,
  } as CombinedStyle,
  removeButton: {
    backgroundColor: Colors.light.destructive,
    borderRadius: Sizes.radius.sm,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  } as CombinedStyle,
  removeButtonText: {
    color: Colors.light.destructiveForeground,
    fontWeight: Sizes.fontWeight.bold as any,
    fontSize: Sizes.typography.sm,
  } as CombinedStyle,
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Sizes.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  } as CombinedStyle,
  totalLabel: {
    ...GlobalStyles.h4,
  } as CombinedStyle,
  totalAmount: {
    ...GlobalStyles.h3,
    color: Colors.brand.primary,
  } as CombinedStyle,
  checkoutButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    alignItems: 'center',
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  checkoutButtonText: {
    ...GlobalStyles.buttonText,
    color: Colors.brand.primaryDark,
    fontWeight: Sizes.fontWeight.bold as any,
  } as CombinedStyle,

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    padding: Sizes.spacing.md,
    ...GlobalStyles.shadowLg,
  } as CombinedStyle,
  navButton: {
    flex: 1,
    alignItems: 'center',
    padding: Sizes.spacing.sm,
  } as CombinedStyle,
  navButtonText: {
    ...GlobalStyles.body,
    marginTop: Sizes.spacing.xs,
    color: Colors.light.foreground,
  } as CombinedStyle,
});