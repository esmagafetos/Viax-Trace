import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ViaXLogo } from '@/components/ViaXLogo';
import { useResponsive } from '@/lib/responsive';

export function AppHeader() {
  const c = useColors();
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const { rs, isCompact } = useResponsive();
  const initial = (user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase();
  const btnSize = rs(32);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.surface,
          borderBottomColor: c.border,
          paddingHorizontal: rs(16),
          height: rs(56),
        },
      ]}
    >
      <View style={{ flexShrink: 1, flex: 1 }}>
        <ViaXLogo size={isCompact ? 'sm' : 'sm'} showTagline={!isCompact} />
      </View>

      <View style={[styles.actions, { gap: rs(8) }]}>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              width: btnSize,
              height: btnSize,
              borderRadius: btnSize / 2,
              borderColor: c.border,
              backgroundColor: c.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={6}
        >
          <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={rs(15)} color={c.textMuted} />
        </Pressable>

        <View
          style={[
            styles.avatar,
            {
              width: btnSize,
              height: btnSize,
              borderRadius: btnSize / 2,
              backgroundColor: c.accentDim,
              borderColor: 'transparent',
            },
          ]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={{ color: c.accent, fontFamily: 'Poppins_700Bold', fontSize: rs(13) }}>
              {initial}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
});
