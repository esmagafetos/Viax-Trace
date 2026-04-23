import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ViaXLogo } from '@/components/ViaXLogo';

export function AppHeader() {
  const c = useColors();
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const initial = (user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: c.surface, borderBottomColor: c.border },
      ]}
    >
      <ViaXLogo size="sm" showTagline />

      <View style={styles.actions}>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [
            styles.iconBtn,
            { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={6}
        >
          <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={15} color={c.textMuted} />
        </Pressable>

        <View
          style={[
            styles.avatar,
            {
              backgroundColor: c.accentDim,
              borderColor: 'transparent',
            },
          ]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={{ color: c.accent, fontFamily: 'Poppins_700Bold', fontSize: 13 }}>
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
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
});
