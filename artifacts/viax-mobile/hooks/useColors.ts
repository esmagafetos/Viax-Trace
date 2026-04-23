import { Colors, type Theme } from '@/constants/colors';
import { useTheme } from '@/lib/theme';

export function useColors(): Theme {
  const { dark } = useTheme();
  return dark ? Colors.dark : Colors.light;
}
