import { Colors } from '@/constants/colors';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return Colors.light.secondary;
    switch (variant) {
      case 'primary':
        return Colors.light.primary;
      case 'secondary':
        return Colors.light.secondary;
      case 'outline':
        return 'transparent';
      default:
        return Colors.light.primary;
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return Colors.light.text;
    return Colors.light.text;
  };

  const getBorderColor = () => {
    if (variant === 'outline') return Colors.light.border;
    return 'transparent';
  };

  return (
    <TouchableOpacity
      style={{
        backgroundColor: getBackgroundColor(),
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: getBorderColor(),
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.6 : 1,
      }}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={{
            color: getTextColor(),
            fontSize: 16,
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};