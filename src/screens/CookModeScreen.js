import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useNav } from '../nav';
import { formatIngredient } from '../lib/ingredients';
import { colors, radius, space } from '../theme';

// Full-screen, big-type step view. Keeps the screen awake while cooking.
export default function CookModeScreen({ id, servings }) {
  useKeepAwake();
  const { state } = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const recipe = state.recipes.find((r) => r.id === id);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);

  if (!recipe) return null;
  const total = recipe.steps.length;
  const factor = recipe.servings ? (servings || recipe.servings) / recipe.servings : 1;
  const last = step === total - 1;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.top}>
        <Pressable onPress={nav.pop} hitSlop={12} accessibilityLabel="Exit cook mode" style={styles.roundBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.recipeName} numberOfLines={1}>
          {recipe.title}
        </Text>
        <Pressable
          onPress={() => setShowIngredients((v) => !v)}
          hitSlop={12}
          accessibilityLabel={showIngredients ? 'Show step' : 'Show ingredients'}
          style={[styles.roundBtn, showIngredients && { backgroundColor: colors.accent }]}
        >
          <Ionicons name="list" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.progress}>
        {recipe.steps.map((_, i) => (
          <View key={i} style={[styles.progressSeg, i <= step && { backgroundColor: colors.accent }]} />
        ))}
      </View>

      {showIngredients ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: space.xl }}>
          {recipe.ingredients.map((ing, i) => (
            <Text key={i} style={styles.ingText}>
              {formatIngredient(ing, factor)}
            </Text>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: space.xl }}>
          <Text style={styles.stepCount}>
            Step {step + 1} of {total}
          </Text>
          <Text style={styles.stepText}>{recipe.steps[step]}</Text>
        </ScrollView>
      )}

      <View style={styles.controls}>
        <Pressable
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          style={[styles.navBtn, styles.navBack, step === 0 && { opacity: 0.3 }]}
          accessibilityLabel="Previous step"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => (last ? nav.pop() : setStep((s) => Math.min(total - 1, s + 1)))}
          style={[styles.navBtn, styles.navNext]}
          accessibilityLabel={last ? 'Finish cooking' : 'Next step'}
        >
          <Text style={styles.navNextText}>{last ? 'Finish' : 'Next step'}</Text>
          {!last ? <Ionicons name="arrow-forward" size={22} color="#fff" /> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.dark, paddingHorizontal: space.xl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeName: { flex: 1, color: '#ffffffcc', fontSize: 15, textAlign: 'center' },
  progress: { flexDirection: 'row', gap: 4, marginTop: space.lg },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  stepCount: { color: colors.accent, fontWeight: '800', fontSize: 15, marginBottom: space.md },
  stepText: { color: '#fff', fontWeight: '600', fontSize: 26, lineHeight: 36 },
  ingText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 28,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  controls: { flexDirection: 'row', gap: space.md },
  navBtn: { height: 60, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  navBack: { width: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  navNext: { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: colors.accent },
  navNextText: { fontWeight: '800', fontSize: 17, color: '#fff' },
});
