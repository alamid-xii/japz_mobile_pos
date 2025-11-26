import { Image, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

interface ImageWithFallbackNativeProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  fallbackEmoji?: string;
}

export function ImageWithFallbackNative({
  src,
  alt = 'Image',
  width = 100,
  height = 100,
  fallbackEmoji = '🖼️',
}: ImageWithFallbackNativeProps) {
  const [imageError, setImageError] = React.useState(false);

  if (!src || imageError) {
    return (
      <View
        style={{
          width,
          height,
          backgroundColor: Colors.light.border,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: Math.min(width, height) * 0.5 }}>
          {fallbackEmoji}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={{ width, height, borderRadius: 8 }}
      onError={() => setImageError(true)}
      accessible
      accessibilityLabel={alt}
    />
  );
}

import React from 'react';
