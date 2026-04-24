import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface EmptyStateProps {
  /** Ionicon name. Defaults to `folder-open-outline`. */
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Inline call-to-action shown beneath the subtitle. */
  cta?: { label: string; onPress: () => void };
  /** Compact variant uses smaller icon / paddings (for inline empty list rows). */
  compact?: boolean;
}

/**
 * Friendly empty-state used by lists (Dashboard recent, History, etc).
 * Mirrors the muted-colour, centered layout the web uses for the
 * "Nenhuma análise ainda" panel, with an icon added for mobile readability.
 */
export function EmptyState({ icon = 'folder-open-outline', title, subtitle, cta, compact }: EmptyStateProps) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? 28 : 40, paddingHorizontal: 24, gap: 6 }}>
      <Ionicons name={icon} size={compact ? 28 : 36} color={c.textFaint} />
      <Text
        style={{
          color: c.textMuted,
          fontFamily: 'Poppins_600SemiBold',
          fontSize: compact ? 13 : 14,
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle && (
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
          {subtitle}
        </Text>
      )}
      {cta && (
        <Pressable onPress={cta.onPress} hitSlop={6} style={{ marginTop: 6 }}>
          <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
            {cta.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
