import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ViaXLogo } from '@/components/ViaXLogo';
import { useResponsive } from '@/lib/responsive';

type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV_LINKS: NavLink[] = [
  { href: '/(tabs)/dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { href: '/(tabs)/process', label: 'Processar', icon: 'cloud-upload-outline' },
  { href: '/(tabs)/tool', label: 'Ferramenta', icon: 'build-outline' },
  { href: '/(tabs)/history', label: 'Histórico', icon: 'time-outline' },
];

export function AppHeader() {
  const c = useColors();
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { rs } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase();

  const isActive = (href: string) => {
    const segment = href.split('/').pop() ?? '';
    return pathname.endsWith(`/${segment}`);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: c.surface,
          borderBottomColor: c.border,
        },
      ]}
    >
      {/* Brand row */}
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.push('/(tabs)/dashboard')}
          style={{ flexShrink: 1 }}
          hitSlop={6}
        >
          <ViaXLogo size="sm" showTagline />
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={toggle}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: c.border,
                backgroundColor: c.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={6}
          >
            <Ionicons
              name={dark ? 'sunny-outline' : 'moon-outline'}
              size={15}
              color={c.textMuted}
            />
          </Pressable>

          {user && (
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => [
                styles.avatar,
                {
                  backgroundColor: c.accentDim,
                  borderColor: menuOpen ? c.accent : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              hitSlop={4}
            >
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text
                  style={{
                    color: c.accent,
                    fontFamily: 'Poppins_700Bold',
                    fontSize: 13,
                  }}
                >
                  {initial}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Tab pills row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {NAV_LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href as any)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? c.accentDim : c.surface2,
                  borderColor: active ? c.accent : c.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons
                name={link.icon}
                size={14}
                color={active ? c.accent : c.textMuted}
              />
              <Text
                style={{
                  color: active ? c.accent : c.textMuted,
                  fontFamily: active ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
                  fontSize: 12.5,
                }}
              >
                {link.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Profile dropdown */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    shadowColor: '#000',
                  },
                ]}
              >
                <View
                  style={[styles.dropdownHeader, { borderBottomColor: c.border }]}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: c.text,
                      fontFamily: 'Poppins_600SemiBold',
                      fontSize: 13,
                    }}
                  >
                    {user?.name ?? 'Usuário'}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: c.textMuted,
                      fontFamily: 'Poppins_400Regular',
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {user?.email ?? ''}
                  </Text>
                </View>

                <DropdownItem
                  icon="settings-outline"
                  label="Configurações"
                  color={c.text}
                  onPress={() => {
                    closeMenu();
                    router.push('/(tabs)/settings' as any);
                  }}
                />
                <DropdownItem
                  icon="document-text-outline"
                  label="Documentação"
                  color={c.text}
                  onPress={() => {
                    closeMenu();
                    router.push('/(tabs)/settings' as any);
                  }}
                />

                <View
                  style={{
                    height: 1,
                    backgroundColor: c.border,
                    marginVertical: 4,
                  }}
                />

                <DropdownItem
                  icon="log-out-outline"
                  label="Sair"
                  color={c.accent}
                  onPress={async () => {
                    closeMenu();
                    await logout();
                    router.replace('/');
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function DropdownItem({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dropdownItem,
        { backgroundColor: pressed ? c.surface2 : 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text
        style={{
          color,
          fontFamily: 'Poppins_500Medium',
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    paddingTop: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  tabsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 12,
  },
  dropdown: {
    minWidth: 220,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dropdownHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
});
