// styles/kitchenStyles.ts
import { StyleSheet } from 'react-native';
import { Colors, Sizes } from '../constants/colors';
import { GlobalStyles } from './globalStyles';

export const kitchenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Sizes.spacing.lg,
    paddingTop: Sizes.spacing.lg + 40,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    ...GlobalStyles.h1,
  },
  subtitle: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
  },
  logoutButton: {
    padding: Sizes.spacing.sm,
    borderRadius: Sizes.radius.sm,
    backgroundColor: Colors.light.muted,
  },

  // Orders List
  ordersList: {
    flex: 1,
    padding: Sizes.spacing.lg,
  },
  orderCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.lg,
    padding: Sizes.spacing.lg,
    marginBottom: Sizes.spacing.md,
    ...GlobalStyles.shadowSm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Sizes.spacing.md,
  },
  orderNumber: {
    ...GlobalStyles.h4,
    fontWeight: Sizes.fontWeight.bold,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Sizes.spacing.xs,
  },
  statusText: {
    ...GlobalStyles.body,
    fontSize: Sizes.typography.sm,
    fontWeight: Sizes.fontWeight.medium,
  },
  orderItems: {
    marginBottom: Sizes.spacing.md,
  },
  orderItem: {
    ...GlobalStyles.body,
    marginBottom: Sizes.spacing.xs,
    color: Colors.light.foreground,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTime: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    fontSize: Sizes.typography.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Sizes.spacing.xs,
  },
  orderActions: {
    flexDirection: 'row',
    gap: Sizes.spacing.sm,
  },

  // Status Buttons
  statusButton: {
    borderRadius: Sizes.radius.md,
    paddingHorizontal: Sizes.spacing.lg,
    paddingVertical: Sizes.spacing.sm,
    ...GlobalStyles.shadowSm,
  },
  startButton: {
    backgroundColor: '#FF6B35',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: Sizes.fontWeight.medium,
    fontSize: Sizes.typography.sm,
  },
  readyButton: {
    backgroundColor: Colors.brand.primary,
  },
  readyButtonText: {
    color: Colors.brand.primaryDark,
    fontWeight: Sizes.fontWeight.medium,
    fontSize: Sizes.typography.sm,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: Sizes.fontWeight.medium,
    fontSize: Sizes.typography.sm,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Sizes.spacing.xl,
  },
  emptyStateText: {
    ...GlobalStyles.h3,
    marginBottom: Sizes.spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...GlobalStyles.body,
    color: Colors.light.mutedForeground,
    textAlign: 'center',
  },
});