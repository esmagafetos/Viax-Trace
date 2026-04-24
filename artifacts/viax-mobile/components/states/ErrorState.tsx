import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ErrorStateProps {
  /** Error thrown by the failed query (for the secondary text). */
  error?: Error | null | string;
  /** Headline shown above the error message. */
  title?: string;
  /** Re-runs the request — typically the query's `refetch`. */
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Presents a failed network request with a retry CTA. Uses the warm "accent"
 * tone so it reads as a recoverable problem (not a destructive crash) — same
 * visual register as the web's `.toast.error` style.
 */
export function ErrorState({ error, title = 'Não foi possível carregar', onRetry, compact }: ErrorStateProps) {
  const c = useColors();
  const message =
    typeof error === 'string'
      ? error
      : error?.message ?? 'Verifique sua conexão e tente novamente.';

  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: compact ? 24 : 36,
        paddingHorizontal: 24,
        gap: 10,
      }}
    >
      <View
        style={{
          width: compact ? 36 : 48,
          height: compact ? 36 : 48,
          borderRadius: 99,
          backgroundColor: c.accentDim,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="alert-circle-outline" size={compact ? 22 : 28} color={c.accent} />
      </View>
      <Text
        style={{
          color: c.text,
          fontFamily: 'Poppins_700Bold',
          fontSize: compact ? 13 : 14,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: c.textFaint,
          fontFamily: 'Poppins_400Regular',
          fontSize: 12,
          lineHeight: 17,
          textAlign: 'center',
          maxWidth: 320,
        }}
      >
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            marginTop: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 99,
            backgroundColor: c.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="refresh" size={13} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>
            Tentar novamente
          </Text>
        </Pressable>
      )}
    </View>
  );
}
