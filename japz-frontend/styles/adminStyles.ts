// styles/adminStyles.ts
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Colors, Sizes } from '../constants/colors';
import { GlobalStyles } from './globalStyles';

type CombinedStyle = ViewStyle & TextStyle;

export const adminStyles = StyleSheet.create<Record<string, CombinedStyle>>({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  } as CombinedStyle,
  header: {
    padding: Sizes.spacing.xl,
    paddingTop: Sizes.spacing.xl + 40, // Account for status bar
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  } as CombinedStyle,
  title: {
    ...GlobalStyles.h1,
    marginBottom: Sizes.spacing.xs,
  } as CombinedStyle,
  subtitle: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
  } as CombinedStyle,
  content: {
    flex: 1,
    padding: Sizes.spacing.lg,
  } as CombinedStyle,
  contentScrollView: {
    paddingBottom: Sizes.spacing.xl,
  } as CombinedStyle,

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Sizes.spacing.xl,
  } as CombinedStyle,
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    alignItems: 'center',
    marginHorizontal: Sizes.spacing.xs,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  statNumber: {
    ...GlobalStyles.h2,
    marginVertical: Sizes.spacing.sm,
  } as CombinedStyle,
  statLabel: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    textAlign: 'center',
  } as CombinedStyle,

  // Menu Grid
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  } as CombinedStyle,
  menuItem: {
    width: '48%',
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    alignItems: 'center',
    marginBottom: Sizes.spacing.md,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  menuItemText: {
    ...GlobalStyles.body,
    marginTop: Sizes.spacing.sm,
    textAlign: 'center',
    color: Colors.light.foreground,
  } as CombinedStyle,

  // List Styles
  list: {
    flex: 1,
    paddingHorizontal: Sizes.spacing.lg,
  } as CombinedStyle,
  listContainer: {
    paddingVertical: Sizes.spacing.lg,
    paddingHorizontal: Sizes.spacing.lg,
  } as CombinedStyle,
  listItem: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    marginBottom: Sizes.spacing.md,
    alignItems: 'center',
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  listItemIcon: {
    marginRight: Sizes.spacing.md,
  } as CombinedStyle,
  listItemContent: {
    flex: 1,
  } as CombinedStyle,
  listItemTitle: {
    ...GlobalStyles.h4,
    marginBottom: Sizes.spacing.xs,
  } as CombinedStyle,
  listItemSubtitle: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    marginBottom: Sizes.spacing.xs,
  } as CombinedStyle,
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Sizes.spacing.sm,
  } as CombinedStyle,
  listItemActions: {
    flexDirection: 'row',
    gap: Sizes.spacing.sm,
  } as CombinedStyle,

  // Badges
  roleBadge: {
    backgroundColor: Colors.light.accent,
    color: Colors.light.accentForeground,
    paddingHorizontal: Sizes.spacing.sm,
    paddingVertical: Sizes.spacing.xs,
    borderRadius: Sizes.radius.sm,
    fontSize: Sizes.typography.xs,
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,
  statusBadge: {
    paddingHorizontal: Sizes.spacing.sm,
    paddingVertical: Sizes.spacing.xs,
    borderRadius: Sizes.radius.sm,
    fontSize: Sizes.typography.xs,
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,
  statusActive: {
    backgroundColor: '#10b98120',
    color: '#10b981',
  } as CombinedStyle,
  statusInactive: {
    backgroundColor: '#6b728020',
    color: '#6b7280',
  } as CombinedStyle,

  // Buttons
  addButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Sizes.radius.lg,
    paddingHorizontal: Sizes.spacing.lg,
    paddingVertical: Sizes.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Sizes.spacing.sm,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  addButtonText: {
    ...GlobalStyles.buttonText,
    color: Colors.brand.primaryDark,
    fontWeight: Sizes.fontWeight.medium as any,
  } as CombinedStyle,
  actionButton: {
    padding: Sizes.spacing.sm,
    borderRadius: Sizes.radius.sm,
    backgroundColor: Colors.light.muted,
  } as CombinedStyle,
  logoutButton: {
    backgroundColor: Colors.light.muted,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Sizes.spacing.sm,
    margin: Sizes.spacing.lg,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  logoutButtonText: {
    ...GlobalStyles.buttonText,
    color: Colors.light.foreground,
  } as CombinedStyle,

  // Cards
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    marginBottom: Sizes.spacing.lg,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  cardTitle: {
    ...GlobalStyles.h3,
    marginBottom: Sizes.spacing.lg,
  } as CombinedStyle,

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as CombinedStyle,
  statItem: {
    alignItems: 'center',
    flex: 1,
  } as CombinedStyle,
  statValue: {
    ...GlobalStyles.h2,
    marginBottom: Sizes.spacing.xs,
  } as CombinedStyle,

  // Rank Items
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Sizes.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  } as CombinedStyle,
  rank: {
    ...GlobalStyles.h4,
    width: 30,
    color: Colors.brand.primary,
  } as CombinedStyle,
  itemName: {
    ...GlobalStyles.body,
    flex: 1,
  } as CombinedStyle,
  itemSales: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
  } as CombinedStyle,

  // Feedback
  feedbackCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    marginBottom: Sizes.spacing.md,
    ...GlobalStyles.shadowSm,
  } as CombinedStyle,
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Sizes.spacing.sm,
  } as CombinedStyle,
  feedbackCustomer: {
    ...GlobalStyles.h4,
  } as CombinedStyle,
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  } as CombinedStyle,
  feedbackComment: {
    ...GlobalStyles.body,
    marginBottom: Sizes.spacing.sm,
    color: Colors.light.foreground,
  } as CombinedStyle,
  feedbackDate: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    fontSize: Sizes.typography.sm,
  } as CombinedStyle,

  // Settings
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Sizes.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  } as CombinedStyle,
  settingInfo: {
    flex: 1,
  } as CombinedStyle,
  settingLabel: {
    ...GlobalStyles.h4,
    marginBottom: Sizes.spacing.xs,
  } as CombinedStyle,
  settingDescription: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
  } as CombinedStyle,
  settingButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    alignItems: 'center',
    marginBottom: Sizes.spacing.md,
  } as CombinedStyle,
  settingButtonDanger: {
    backgroundColor: '#fee2e2',
  } as CombinedStyle,
  settingButtonText: {
    ...GlobalStyles.buttonText,
    color: Colors.light.accentForeground,
  } as CombinedStyle,
  settingButtonTextDanger: {
    color: Colors.light.destructive,
  } as CombinedStyle,

  // Stock Text
  stockText: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
  } as CombinedStyle,
});