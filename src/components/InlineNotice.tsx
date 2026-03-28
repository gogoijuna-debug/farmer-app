import React from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export default function InlineNotice({
  type,
  message,
}: {
  type: 'success' | 'error' | 'info';
  message: string;
}) {
  const { theme } = useAppTheme();

  const colors = {
    success: {
      backgroundColor: theme.tint + '15',
      borderColor: theme.tint + '35',
      textColor: theme.tint,
    },
    error: {
      backgroundColor: '#FEE2E2',
      borderColor: '#FECACA',
      textColor: '#DC2626',
    },
    info: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      textColor: theme.text,
    },
  }[type];

  return (
    <View
      style={{
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: colors.textColor,
          fontSize: 13,
          fontWeight: '700',
          lineHeight: 18,
        }}
      >
        {message}
      </Text>
    </View>
  );
}