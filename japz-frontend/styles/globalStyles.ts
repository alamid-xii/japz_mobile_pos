// styles/globalStyles.ts
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Colors, Sizes } from '../constants/colors';

type CombinedStyle = ViewStyle & TextStyle;

export const GlobalStyles = StyleSheet.create<Record<string, CombinedStyle>>({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  } as CombinedStyle,
  containerDark: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  } as CombinedStyle,
  
  // Typography
  h1: {
    fontSize: Sizes.typography['2xl'],
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography['2xl'] * 1.5,
    color: Colors.light.foreground,
  } as CombinedStyle,
  h1Dark: {
    fontSize: Sizes.typography['2xl'],
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography['2xl'] * 1.5,
    color: Colors.dark.foreground,
  } as CombinedStyle,
  
  h2: {
    fontSize: Sizes.typography.xl,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.xl * 1.5,
    color: Colors.light.foreground,
  } as CombinedStyle,
  h2Dark: {
    fontSize: Sizes.typography.xl,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.xl * 1.5,
    color: Colors.dark.foreground,
  } as CombinedStyle,
  
  h3: {
    fontSize: Sizes.typography.lg,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.lg * 1.5,
    color: Colors.light.foreground,
  } as CombinedStyle,
  h3Dark: {
    fontSize: Sizes.typography.lg,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.lg * 1.5,
    color: Colors.dark.foreground,
  } as CombinedStyle,
  
  h4: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.light.foreground,
  } as CombinedStyle,
  h4Dark: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.dark.foreground,
  } as CombinedStyle,
  
  body: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.normal as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.light.foreground,
  } as CombinedStyle,
  bodyDark: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.normal as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.dark.foreground,
  } as CombinedStyle,
  
  label: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.light.foreground,
  } as CombinedStyle,
  labelDark: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.dark.foreground,
  } as CombinedStyle,
  
  buttonText: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.light.primaryForeground,
  } as CombinedStyle,
  buttonTextDark: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.medium as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.dark.primaryForeground,
  } as CombinedStyle,
  
  inputText: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.normal as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.light.foreground,
  } as CombinedStyle,
  inputTextDark: {
    fontSize: Sizes.typography.base,
    fontWeight: Sizes.fontWeight.normal as any,
    lineHeight: Sizes.typography.base * 1.5,
    color: Colors.dark.foreground,
  } as CombinedStyle,

  // Layout
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as CombinedStyle,
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as CombinedStyle,
  
  // Shadows
  shadowSm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as CombinedStyle,
  
  shadowMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  } as CombinedStyle,
  
  shadowLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  } as CombinedStyle,
});