import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groceryItemsForRecipe, useStore } from '../store';
import { useNav } from '../nav';
import { Button, IconButton, RecipeImage, Segmented, Sheet, Stepper, TopBar } from '../components';
import { formatIngredient } from '../lib/ingredients';
import { dayLabel, isToday, shortDate, toKey, weekDays } from '../lib/dates';
import { colors, radius, space, type } from '../theme';

export default function RecipeScreen({ id }) {
  const { state, actions, dispatch } = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const recipe = state.recipes.find((r) => r.id === id);
  const [servings, setServings] = useState(recipe ? recipe.servings || 4 : 4);
  const [checked, setChecked] = useState({});
  const [tab, setTab] = useState('ingredients');
  const [planOpen, setPlanOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  if (!recipe) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="" onBack={nav.pop} />
        <Text style={[type.body, { padding: space.lg }]}>This recipe was deleted.</Text>
      </View>
    );
  }

  const factor = recipe.servings ? servings / recipe.servings : 1;

  const confirmDelete = () =>
    Alert.alert('Delete recipe?', `“${recipe.title}” will be removed from your recipes and meal plan.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          nav.pop();
          actions.deleteRecipe(recipe.id);
          nav.toast('Recipe deleted');
        },
      },
    ]);

  const more = () =>
    Alert.alert(recipe.title, undefined, [
      { text: 'Edit recipe', onPress: () => nav.push('edit', { recipeId: recipe.id }) },
      { text: 'Delete recipe', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const addToGroceries = () => {
    dispatch({ type: 'GROCERY_ADD', items: groceryItemsForRecipe(recipe, servings), origin: 'recipe' });
    nav.toast(`${recipe.ingredients.length} items added to your list`);
  };

  const addToDay = (d) => {
    actions.planAdd(toKey(d), recipe.id, servings);
    setPlanOpen(false);
    nav.toast(`Added to ${dayLabel(d)}, ${shortDate(d)}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <RecipeImage recipe={recipe} style={{ height: 340 + insets.top, borderRadius: 0 }} iconSize={56} />

        <View style={styles.body}>
          <Text style={type.title}>{recipe.title}</Text>

          {recipe.sourceUrl ? (
            <Pressable onPress={() => Linking.openURL(recipe.sourceUrl)} accessibilityRole="link" style={styles.source}>
              <Ionicons name="link" size={15} color={colors.accent} />
              <Text style={[type.small, { color: colors.accent, fontWeight: '600' }]}>{recipe.sourceName || 'View original'}</Text>
            </Pressable>
          ) : recipe.sourceName ? (
            <Text style={[type.small, { marginTop: 6 }]}>By {recipe.sourceName}</Text>
          ) : null}

          <View style={styles.stats}>
            <Stat icon="time-outline" value={recipe.totalMinutes ? `${recipe.totalMinutes} min` : '—'} label="Total time" />
            <View style={styles.statDivider} />
            <Stat icon="people-outline" value={String(recipe.servings || 4)} label="Servings" />
            <View style={styles.statDivider} />
            <Stat icon="basket-outline" value={String(recipe.ingredients.length)} label="Ingredients" />
          </View>

          {recipe.description ? (
            <Text style={[type.body, { color: colors.inkSoft, marginTop: space.lg }]}>{recipe.description}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Add to plan"
              icon="calendar-outline"
              variant="secondary"
              compact
              onPress={() => setPlanOpen(true)}
              style={{ flex: 1 }}
            />
            <Button title="Add to list" icon="cart-outline" variant="secondary" compact onPress={addToGroceries} style={{ flex: 1 }} />
          </View>

          <View style={{ marginTop: space.xl }}>
            <Segmented
              options={[
                { value: 'ingredients', label: 'Ingredients' },
                { value: 'method', label: 'Method' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>

          {tab === 'ingredients' ? (
            <View>
              <View style={styles.servingsRow}>
                <Text style={type.h3}>Servings</Text>
                <Stepper value={servings} onChange={setServings} />
              </View>
              {recipe.ingredients.length === 0 ? <Text style={type.small}>No ingredients yet. Tap ••• to edit.</Text> : null}
              {recipe.ingredients.map((ing, i) => {
                const done = checked[i];
                return (
                  <Pressable key={i} style={styles.ingRow} onPress={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}>
                    <View style={[styles.check, done && styles.checkOn]}>
                      {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                    <Text style={[type.body, { flex: 1 }, done && styles.done]}>{formatIngredient(ing, factor)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ marginTop: space.lg }}>
              {recipe.steps.length === 0 ? <Text style={type.small}>No steps yet. Tap ••• to edit.</Text> : null}
              {recipe.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={styles.stepLabel}>Step {i + 1}</Text>
                  <Text style={type.body}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.floatingBar}>
        <TopBar
          overlay
          onBack={nav.pop}
          right={
            <>
              <IconButton
                name={recipe.favorite ? 'heart' : 'heart-outline'}
                color={recipe.favorite ? colors.accent : colors.ink}
                bg="rgba(255,255,255,0.95)"
                onPress={() => actions.toggleFavorite(recipe.id)}
                label="Favorite"
              />
              <IconButton name="ellipsis-horizontal" bg="rgba(255,255,255,0.95)" onPress={more} label="More options" />
            </>
          }
        />
      </View>

      {recipe.steps.length ? (
        <View style={[styles.cookBar, { paddingBottom: insets.bottom + space.md }]}>
          <Button title="Start cooking" icon="play" onPress={() => nav.push('cook', { id: recipe.id, servings })} />
        </View>
      ) : null}

      <Sheet visible={planOpen} onClose={() => setPlanOpen(false)} title="Add to meal plan">
        <View style={styles.weekNav}>
          <IconButton name="chevron-back" onPress={() => setWeekOffset((w) => w - 1)} label="Previous week" />
          <Text style={type.h3}>
            {weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : `Week of ${shortDate(weekDays(weekOffset)[0])}`}
          </Text>
          <IconButton name="chevron-forward" onPress={() => setWeekOffset((w) => w + 1)} label="Next week" />
        </View>
        {weekDays(weekOffset).map((d) => {
          const count = (state.plan[toKey(d)] || []).length;
          return (
            <Pressable key={toKey(d)} onPress={() => addToDay(d)} style={styles.dayRow}>
              <View>
                <Text style={type.h3}>
                  {dayLabel(d)}, {shortDate(d)}
                  {isToday(d) ? <Text style={{ color: colors.accent }}> Today</Text> : null}
                </Text>
                <Text style={type.tiny}>{count ? `${count} meal${count > 1 ? 's' : ''} planned` : 'Nothing planned'}</Text>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.accent} />
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

function Stat({ icon, value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={[type.h3, { marginTop: 4 }]}>{value}</Text>
      <Text style={type.tiny}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  body: {
    backgroundColor: colors.bg,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: space.lg,
    paddingTop: space.xl,
  },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  statDivider: { width: 1, height: 36, backgroundColor: colors.line },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg, marginBottom: space.sm },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CFCFCA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  stepRow: { marginBottom: space.xl },
  stepLabel: { fontSize: 13, fontWeight: '800', color: colors.accent, marginBottom: 4 },
  cookBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
