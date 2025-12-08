// styles/cashierStyles.ts
import { StyleSheet, TextStyle, ViewStyle, Dimensions } from 'react-native';
import { Colors, Sizes } from '../constants/colors';
import { GlobalStyles } from './globalStyles';

// Responsive scaling helper
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;
const SCALE = Math.max(0.8, Math.min(1.3, SCREEN_WIDTH / BASE_WIDTH));
const scaled = (value: number) => Math.round(value * SCALE);

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
    paddingHorizontal: Sizes.spacing.md,
    paddingVertical: Sizes.spacing.sm,
    paddingTop: Sizes.spacing.sm + 30,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.light.border,
    fontWeight:'700',
    color:'#FFD700',
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
    paddingHorizontal: scaled(Sizes.spacing.lg),
    paddingVertical: scaled(Sizes.spacing.md),
    minHeight: scaled(48),
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  } as CombinedStyle,
  categoryButton: {
    backgroundColor: Colors.light.muted,
    borderRadius: Sizes.radius.lg,
    paddingHorizontal: scaled(Sizes.spacing.md + 4),
    paddingVertical: scaled(Sizes.spacing.sm),
    marginRight: scaled(Sizes.spacing.sm),
    minWidth: scaled(88),
    maxWidth: scaled(180),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    height: scaled(36),
  } as CombinedStyle,
  categoryButtonActive: {
    backgroundColor: Colors.brand.primary,
  } as CombinedStyle,
  categoryButtonText: {
    ...GlobalStyles.body,
    color: Colors.light.foreground,
    fontWeight: Sizes.fontWeight.medium as any,
    textAlign: 'center',
    fontSize: scaled(Sizes.typography.sm),
    lineHeight: scaled(Sizes.typography.sm * 1.5),
  } as CombinedStyle,
  categoryButtonTextActive: {
    color: Colors.brand.primaryDark,
  } as CombinedStyle,

  // Menu Grid
  menuGrid: {
    flex: 1,
    padding: scaled(Sizes.spacing.lg),
  } as CombinedStyle,
  productCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    paddingVertical: scaled(Sizes.spacing.lg),
    paddingHorizontal: scaled(Sizes.spacing.lg),
    marginVertical: scaled(Sizes.spacing.xs),
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '47%',
    minHeight: scaled(80),
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  productImage: {
    width: '100%',
    height: scaled(80),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaled(Sizes.spacing.sm),
  } as CombinedStyle,
  productBody: {
    paddingVertical: scaled(Sizes.spacing.sm),
    alignItems: 'center',
    justifyContent: 'center',
  } as CombinedStyle,
  productFooter: {
    paddingTop: scaled(Sizes.spacing.sm),
    alignItems: 'center',
    justifyContent: 'center',
  } as CombinedStyle,
  productName: {
    ...GlobalStyles.body,
    textAlign: 'center',
    marginBottom: scaled(Sizes.spacing.xs),
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,
  productPrice: {
    ...GlobalStyles.body,
    color: Colors.brand.primary,
    fontWeight: Sizes.fontWeight.bold as any,
  } as CombinedStyle,
  addToCartButton: {
    flexDirection: 'row',
    gap: scaled(Sizes.spacing.sm),
    alignItems: 'center',
    paddingHorizontal: scaled(Sizes.spacing.md),
    paddingVertical: scaled(Sizes.spacing.sm),
    borderRadius: Sizes.radius.md,
    backgroundColor: '#FFFFCC',
  } as CombinedStyle,
  addToCartButtonText: {
    ...GlobalStyles.body,
    color: Colors.light.foreground,
    fontWeight: Sizes.fontWeight.medium as any,
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
    paddingVertical: Sizes.spacing.md,
    paddingHorizontal: Sizes.spacing.md,
    marginBottom: Sizes.spacing.md,
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand.primary,
    gap: Sizes.spacing.md,
  } as CombinedStyle,
  cartItemInfo: {
    flex: 1,
  } as CombinedStyle,
  cartItemName: {
    ...GlobalStyles.body,
    marginBottom: Sizes.spacing.xs,
    fontWeight: Sizes.fontWeight.bold as any,
    fontSize: Sizes.typography.base,
  } as CombinedStyle,
  cartItemPrice: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    fontSize: Sizes.typography.sm,
    marginBottom: Sizes.spacing.xs,
  } as CombinedStyle,
  cartItemTotal: {
    ...GlobalStyles.body,
    fontWeight: Sizes.fontWeight.bold as any,
    fontSize: Sizes.typography.base,
    color: Colors.brand.primary,
    marginRight: Sizes.spacing.md,
  } as CombinedStyle,
  removeButton: {
    backgroundColor: Colors.light.destructive,
    borderRadius: Sizes.radius.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  } as CombinedStyle,
  removeButtonText: {
    color: Colors.light.destructiveForeground,
    fontWeight: Sizes.fontWeight.bold as any,
    fontSize: Sizes.typography.sm,
  } as CombinedStyle,
  cartButton: {
    padding: scaled(Sizes.spacing.sm),
    borderRadius: scaled(Sizes.radius.md),
    alignItems: 'center',
    justifyContent: 'center',
  } as CombinedStyle,
  cartBadge: {
    position: 'absolute',
    top: -scaled(6),
    right: -scaled(6),
    backgroundColor: Colors.brand.primary,
    width: scaled(20),
    height: scaled(20),
    borderRadius: scaled(10),
    alignItems: 'center',
    justifyContent: 'center',
  } as CombinedStyle,
  cartBadgeText: {
    color: '#fff',
    fontSize: scaled(12),
    fontWeight: Sizes.fontWeight.bold as any,
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
    paddingVertical: Sizes.spacing.md,
    paddingHorizontal: Sizes.spacing.xl,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: Sizes.spacing.md,
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