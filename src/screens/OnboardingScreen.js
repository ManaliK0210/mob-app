import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { Button } from '../components';
import { SEED_PHOTOS } from '../data/seed';
import { colors, radius, space, type } from '../theme';

const POINTS = [
  { icon: 'link-outline', text: 'Save recipes from TikTok, Instagram, YouTube and any website' },
  { icon: 'calendar-outline', text: 'Plan your week in a few taps' },
  { icon: 'cart-outline', text: 'Get one shopping list, sorted by aisle' },
];

export default function OnboardingScreen() {
  const { actions } = useStore();
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + space.lg }]}>
      <StatusBar style="light" />
      <Animated.View style={[styles.collage, { opacity: fade }]}>
        <Image source={{ uri: SEED_PHOTOS.shrimp }} style={[styles.photo, { flex: 1.25 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <Image source={{ uri: SEED_PHOTOS.pancakes }} style={[styles.photo, { flex: 1 }]} />
          <Image source={{ uri: SEED_PHOTOS.bowl }} style={[styles.photo, { flex: 1 }]} />
        </View>
      </Animated.View>

      <View style={styles.content}>
        <Text style={type.largeTitle}>All your recipes in one place</Text>
        <View style={{ marginTop: space.xl, gap: space.lg }}>
          {POINTS.map((p) => (
            <View key={p.icon} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={20} color={colors.accent} />
              </View>
              <Text style={[type.body, { flex: 1 }]}>{p.text}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <Button title="Get started" onPress={() => actions.setSettings({ onboarded: true })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  collage: { height: '42%', flexDirection: 'row', gap: 6, backgroundColor: colors.surface },
  photo: { width: '100%', backgroundColor: colors.surfaceAlt },
  content: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xl },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
