import { useEffect } from 'react';
import { View, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}

/**
 * A single shimmering placeholder block. The shimmer is a light overlay
 * sliding left → right (1.2s loop) using Reanimated. Honours the active
 * theme so it looks correct against both the warm-paper light surface and
 * the dark surface.
 */
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const c = useColors();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [t]);

  const overlayStyle = useAnimatedStyle(() => {
    const tx = interpolate(t.value, [0, 1], [-160, 220]);
    return { transform: [{ translateX: tx }] };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: c.surface2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 140,
            backgroundColor: c.border,
            opacity: 0.55,
          },
          overlayStyle,
        ]}
      />
    </View>
  );
}
