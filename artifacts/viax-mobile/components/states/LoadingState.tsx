import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/lib/responsive';

/**
 * Skeleton placeholder for the Dashboard StatTile grid. Renders five
 * tiles in the same flex-basis pattern as the live grid so layout never
 * jumps when real data arrives.
 */
export function StatTilesLoading() {
  const c = useColors();
  const { cols, rs } = useResponsive();
  const basis = cols === 4 ? '23%' : cols === 3 ? '31%' : '47%';

  return (
    <View style={[skeletonStyles.statGrid, { gap: rs(8) }]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            flexBasis: basis,
            flexGrow: 1,
            backgroundColor: c.surface,
            borderColor: c.borderStrong,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: rs(12),
            paddingTop: rs(12),
            paddingBottom: rs(14),
            gap: 8,
          }}
        >
          <Skeleton height={rs(22)} width="60%" />
          <Skeleton height={rs(9)} width="80%" />
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton placeholder for the financial panel — header strip + 3 number
 * cards + the "rotas no ciclo" big number + chart bars.
 */
export function FinancialPanelLoading() {
  const c = useColors();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderColor: c.borderStrong,
        borderWidth: 1,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomColor: c.border,
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Skeleton width="38%" height={11} />
        <Skeleton width="28%" height={11} />
      </View>
      <View style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: c.surface2,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
                gap: 6,
              }}
            >
              <Skeleton height={14} width="70%" />
              <Skeleton height={9} width="50%" />
            </View>
          ))}
        </View>
        <Skeleton height={28} width="40%" />
        <View style={{ gap: 6 }}>
          <Skeleton height={9} width="32%" />
          <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 60 }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} height={Math.floor(20 + Math.random() * 35)} width={10} radius={2} style={{ flex: 1 }} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Skeleton row for the "Análises recentes" list — five rows by default. */
export function RecentListLoading({ rows = 5 }: { rows?: number }) {
  const c = useColors();
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomColor: c.border,
            borderBottomWidth: i === rows - 1 ? 0 : 1,
          }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton height={13} width="70%" />
            <Skeleton height={10} width="45%" />
          </View>
          <Skeleton height={18} width={36} radius={99} />
          <Skeleton height={18} width={48} radius={99} />
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
