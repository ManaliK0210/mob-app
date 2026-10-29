import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { Button } from '../components';
import { colors, fonts, radius, space, type } from '../theme';

const TILES = [
  { emoji: '🍤', color: '#F6D8C8', rotate: '-6deg' },
  { emoji: '🥗', color: '#DDE8D3', rotate: '4deg' },
  { emoji: '🍋', color: '#FBEBB5', rotate: '-3deg' },
  { emoji: '🍜', color: '#F3D9B8', rotate: '7deg' },
];

const POINTS = [
  { icon: 'link', text: 'Paste a TikTok, Instagram or blog link and get a clean recipe card.' },
  { icon: 'calendar', text: 'Drop recipes into your week in two taps.' },
  { icon: 'basket', text: 'One grocery list, sorted by aisle, amounts added up.' },
];

export default function OnboardingScreen() {
  const { actions } = useStore();
  const insets = useSafeAreaInsets();
  const anims = useRef(TILES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      90,
      anims.map((a) => Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6 })),
    ).start();
  }, [anims]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg }]}>
      <StatusBar style="dark" />
      <View style={styles.tiles}>
        {TILES.map((t, i) => (
          <Animated.View
            key={i}
            style={[
              styles.tile,
              {
                backgroundColor: t.color,
                opacity: anims[i],
                transform: [{ rotate: t.rotate }, { scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              },
            ]}
          >
            <Text style={{ fontSize: 34 }}>{t.emoji}</Text>
          </Animated.View>
        ))}
      </View>

      <Text style={styles.title}>Every recipe you save, finally in one place.</Text>

      <View style={{ marginTop: space.xl, gap: space.lg }}>
        {POINTS.map((p) => (
          <View key={p.icon} style={styles.point}>
            <View style={styles.pointIcon}>
              <Ionicons name={p.icon} size={18} color={colors.basil} />
            </View>
            <Text style={[type.body, { flex: 1 }]}>{p.text}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Button title="Start cooking" variant="saffron" onPress={() => actions.setSettings({ onboarded: true })} />
      <Text style={[type.tiny, { textAlign: 'center', marginTop: space.md }]}>
        Six sample recipes are loaded so you can try everything.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.xl },
  tiles: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', marginTop: space.lg },
  tile: { width: '21%', aspectRatio: 0.72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.ink, marginTop: space.xxl, letterSpacing: -0.5 },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pointIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.basilTint, alignItems: 'center', justifyContent: 'center' },
});
