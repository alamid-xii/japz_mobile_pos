"use client";

import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

// For web: use Radix UI
// For native: use custom implementation
let CollapsiblePrimitive: any = null;

if (Platform.OS === 'web') {
  try {
    CollapsiblePrimitive = require("@radix-ui/react-collapsible");
  } catch {
    CollapsiblePrimitive = null;
  }
}

interface CollapsibleProps {
  title?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

// Native-compatible Collapsible component
function NativeCollapsible({
  title,
  children,
  ...props
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View {...props}>
      {title && (
        <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
          <Text>{title}</Text>
        </TouchableOpacity>
      )}
      {isOpen && <View>{children}</View>}
    </View>
  );
}

function Collapsible({
  title,
  children,
  ...props
}: CollapsibleProps) {
  if (Platform.OS === 'web' && CollapsiblePrimitive) {
    return (
      <CollapsiblePrimitive.Root data-slot="collapsible" {...props}>
        {children}
      </CollapsiblePrimitive.Root>
    );
  }
  return <NativeCollapsible title={title} {...props}>{children}</NativeCollapsible>;
}

function CollapsibleTrigger({
  ...props
}: CollapsibleProps) {
  if (Platform.OS === 'web' && CollapsiblePrimitive) {
    return (
      <CollapsiblePrimitive.CollapsibleTrigger
        data-slot="collapsible-trigger"
        {...props}
      />
    );
  }
  return <TouchableOpacity {...props} />;
}

function CollapsibleContent({
  ...props
}: CollapsibleProps) {
  if (Platform.OS === 'web' && CollapsiblePrimitive) {
    return (
      <CollapsiblePrimitive.CollapsibleContent
        data-slot="collapsible-content"
        {...props}
      />
    );
  }
  return <View {...props} />;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };

