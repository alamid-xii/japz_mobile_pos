import { StyleSheet } from 'react-native';

export const buttonStyles = StyleSheet.create({
  base: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  default: {
    backgroundColor: '#FFCE1B',
    borderWidth: 1,
    borderColor: '#FFCE1B',
  },
  destructive: {
    backgroundColor: '#d4183d',
    borderWidth: 1,
    borderColor: '#d4183d',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#C3C3C3',
  },
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  default: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
  },
  text: {
    fontWeight: '500',
    textAlign: 'center',
  },
  smText: {
    fontSize: 14,
  },
  defaultText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.5,
  },
});