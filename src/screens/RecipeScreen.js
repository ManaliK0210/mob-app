import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groceryItemsForRecipe, useStore } from '../store';
import { useNav } from '../nav';
import { Button, IconButton, RecipeArt, Sheet, Stepper, TopBar } from '../components';
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

  const addToGroceries = () => {
    dispatch({ type: 'GROCERY_ADD', items: groceryItemsForRecipe(recipe, servings), origin: 'recipe' });
    nav.toast(`Added ${recipe.ingredients.length} items to groceries`);
  };

  const addToDay = (d) => {
    actions.planAdd(toKey(d), recipe.id, servings);
    setPlanOpen(false);
    nav.toast(`Planned for ${dayLabel(d)} ${shortDate(d)}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <RecipeArt recipe={recipe} height={300 + insets.top} emojiSize={110} rounded={0} />
        <View style={styles.body}>
          <Text style={type.h1}>{recipe.title}</Text>
          <View style={styles.metaRow}>
            {recipe.totalMinutes ? <Meta icon="time-outline" text={`${recipe.totalMinutes} min`} /> : null}
            <Meta icon="list-outline" text={`${recipe.ingredients.length} ingredients`} />
            {recipe.sourceUrl ? (
              <Pressable onPress={() => Linking.openURL(recipe.sourceUrl)} accessibilityRole="link">
                <Meta icon="open-outline" text={recipe.sourceName || 'Source'} link />
              </Pressable>
            ) : recipe.sourceName ? (
              <Meta icon="bookmark-outline" text={recipe.sourceName} />
            ) : null}
          </View>
          {recipe.description ? <Text style={[type.small, { marginTop: space.md }]}>{recipe.description}</Text> : null}
          {recipe.tags && recipe.tags.length ? (
            <View style={styles.tags}>
              {recipe.tags.map((t) => (
                <Text key={t} style={styles.tag}>
                  {t}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Add to plan"
              icon="calendar-outline"
              variant="outline"
              compact
              onPress={() => setPlanOpen(true)}
              style={{ flex: 1 }}
            />
            <Button title="Add to list" icon="basket-outline" variant="outline" compact onPress={addToGroceries} style={{ flex: 1 }} />
          </View>

          <View style={styles.sectionHead}>
            <Text style={type.h2}>Ingredients</Text>
            <Stepper value={servings} onChange={setServings} label={servings === 1 ? 'serving' : 'servings'} />
          </View>
          {recipe.ingredients.length === 0 ? <Text style={type.small}>No ingredients yet — tap edit to add some.</Text> : null}
          {recipe.ingredients.map((ing, i) => {
            const done = checked[i];
            return (
              <Pressable key={i} style={styles.ingRow} onPress={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}>
                <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? colors.basil : colors.muted} />
                <Text style={[type.body, { flex: 1 }, done && styles.done]}>{formatIngredient(ing, factor)}</Text>
              </Pressable>
            );
          })}

          <Text style={[type.h2, { marginTop: space.xl, marginBottom: space.md }]}>Method</Text>
          {recipe.steps.length === 0 ? <Text style={type.small}>No steps yet — tap edit to add them.</Text> : null}
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[type.body, { flex: 1 }]}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.floatingBar}>
        <TopBar
          transparent
          onBack={nav.pop}
          right={
            <>
              <IconButton
                name={recipe.favorite ? 'heart' : 'heart-outline'}
                color={recipe.favorite ? colors.tomato : colors.ink}
                bg="rgba(255,255,255,0.9)"
                onPress={() => actions.toggleFavorite(recipe.id)}
                label="Favourite"
              />
              <IconButton
                name="create-outline"
                bg="rgba(255,255,255,0.9)"
                onPress={() => nav.push('edit', { recipeId: recipe.id })}
                label="Edit recipe"
              />
              <IconButton name="trash-outline" bg="rgba(255,255,255,0.9)" onPress={confirmDelete} label="Delete recipe" />
            </>
          }
        />
      </View>

      {recipe.steps.length ? (
        <View style={[styles.cookBar, { paddingBottom: insets.bottom + space.md }]}>
          <Button title="Start cooking" icon="flame" onPress={() => nav.push('cook', { id: recipe.id, servings })} />
        </View>
      ) : null}

      <Sheet visible={planOpen} onClose={() => setPlanOpen(false)} title="Add to which day?">
        <View style={styles.weekNav}>
          <IconButton name="chevron-back" onPress={() => setWeekOffset((w) => w - 1)} label="Previous week" />
          <Text style={type.h3}>
            {weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : `${shortDate(weekDays(weekOffset)[0])} week`}
          </Text>
          <IconButton name="chevron-forward" onPress={() => setWeekOffset((w) => w + 1)} label="Next week" />
        </View>
        <View style={styles.dayGrid}>
          {weekDays(weekOffset).map((d) => {
            const count = (state.plan[toKey(d)] || []).length;
            return (
              <Pressable key={toKey(d)} onPress={() => addToDay(d)} style={[styles.dayCell, isToday(d) && styles.dayToday]}>
                <Text style={[type.h3, isToday(d) && { color: '#fff' }]}>{dayLabel(d)}</Text>
                <Text style={[type.tiny, isToday(d) && { color: '#ffffffcc' }]}>{shortDate(d)}</Text>
                <Text style={[type.tiny, { marginTop: 4 }, isToday(d) && { color: '#ffffffcc' }]}>
                  {count ? `${count} planned` : 'free'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[type.tiny, { textAlign: 'center', marginTop: space.md }]}>Planned for {servings} servings</Text>
      </Sheet>
    </View>
  );
}

function Meta({ icon, text, link }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={15} color={link ? colors.basil : colors.inkSoft} />
      <Text style={[type.small, link && { color: colors.basil, textDecorationLine: 'underline' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  body: {
    backgroundColor: colors.paper,
    marginTop: -24,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    paddingTop: space.xl,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, marginTop: space.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  tag: {
    fontSize: 12,
    color: colors.basilDark,
    backgroundColor: colors.basilTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.sm },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  stepRow: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { fontWeight: '800', color: colors.ink },
  cookBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dayCell: {
    width: '23%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    alignItems: 'center',
  },
  dayToday: { backgroundColor: colors.basil, borderColor: colors.basil },
});
