import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groceryItemsForDays, useStore } from '../store';
import { useNav } from '../nav';
import { Button, EmptyState, IconButton, RecipeImage, Sheet } from '../components';
import { dayLabel, isToday, shortDate, toKey, weekDays, weekRangeLabel } from '../lib/dates';
import { colors, radius, space, type } from '../theme';

export default function PlannerScreen() {
  const { state, actions, dispatch } = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const [pickerDay, setPickerDay] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const days = useMemo(() => weekDays(weekOffset), [weekOffset]);
  const plannedCount = days.reduce((n, d) => n + (state.plan[toKey(d)] || []).length, 0);

  const pickerRecipes = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return state.recipes.filter((r) => !q || r.title.toLowerCase().includes(q));
  }, [state.recipes, pickerQuery]);

  const buildList = () => {
    const items = groceryItemsForDays(state, days);
    dispatch({ type: 'GROCERY_FROM_PLAN', items });
    nav.setTab('grocery');
    nav.toast(`Grocery list updated: ${items.length} items`);
  };

  const closePicker = () => {
    setPickerDay(null);
    setPickerQuery('');
  };

  const weekTitle =
    weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : weekOffset === -1 ? 'Last week' : weekRangeLabel(days);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: 110 }}>
        <View style={styles.head}>
          <Text style={type.largeTitle}>Meal plan</Text>
        </View>

        <View style={styles.weekNav}>
          <IconButton name="chevron-back" onPress={() => setWeekOffset((w) => w - 1)} label="Previous week" bg={colors.surface} size={20} />
          <Pressable onPress={() => setWeekOffset(0)} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={type.h3}>{weekTitle}</Text>
            <Text style={type.tiny}>
              {weekRangeLabel(days)} • {plannedCount} {plannedCount === 1 ? 'meal' : 'meals'}
            </Text>
          </Pressable>
          <IconButton name="chevron-forward" onPress={() => setWeekOffset((w) => w + 1)} label="Next week" bg={colors.surface} size={20} />
        </View>

        {days.map((d) => {
          const key = toKey(d);
          const entries = state.plan[key] || [];
          const today = isToday(d);
          return (
            <View key={key} style={styles.day}>
              <View style={styles.dayHead}>
                <Text style={[type.h3, today && { color: colors.accent }]}>
                  {dayLabel(d)}, {shortDate(d)}
                </Text>
                {today ? (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayText}>Today</Text>
                  </View>
                ) : null}
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => setPickerDay(d)}
                  hitSlop={10}
                  style={styles.addLink}
                  accessibilityLabel={`Add a meal on ${dayLabel(d)}`}
                >
                  <Ionicons name="add" size={18} color={colors.accent} />
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              </View>

              {entries.length === 0 ? <Text style={[type.small, { color: colors.muted }]}>No meals planned</Text> : null}

              {entries.map((e) => {
                const r = state.recipes.find((x) => x.id === e.recipeId);
                if (!r) return null;
                return (
                  <Pressable key={e.id} style={styles.meal} onPress={() => nav.push('recipe', { id: r.id })}>
                    <RecipeImage recipe={r} style={styles.thumb} iconSize={20} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3} numberOfLines={1}>
                        {r.title}
                      </Text>
                      <View style={styles.servingRow}>
                        <Pressable
                          hitSlop={8}
                          onPress={() => actions.planServings(key, e.id, e.servings - 1)}
                          accessibilityLabel="Fewer servings"
                        >
                          <Ionicons name="remove-circle-outline" size={20} color={colors.muted} />
                        </Pressable>
                        <Text style={type.small}>{e.servings} servings</Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() => actions.planServings(key, e.id, e.servings + 1)}
                          accessibilityLabel="More servings"
                        >
                          <Ionicons name="add-circle-outline" size={20} color={colors.muted} />
                        </Pressable>
                      </View>
                    </View>
                    <IconButton
                      name="close"
                      size={18}
                      color={colors.muted}
                      onPress={() => actions.planRemove(key, e.id)}
                      label={`Remove ${r.title}`}
                    />
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={plannedCount ? 'Create grocery list' : 'Add meals to create a list'}
          icon="cart-outline"
          disabled={!plannedCount}
          onPress={buildList}
        />
      </View>

      <Sheet visible={!!pickerDay} onClose={closePicker} title={pickerDay ? `${dayLabel(pickerDay)}, ${shortDate(pickerDay)}` : ''} tall>
        <View style={styles.pickerSearch}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={pickerQuery}
            onChangeText={setPickerQuery}
            placeholder="Search your recipes"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0 }}
          />
        </View>
        <FlatList
          data={pickerRecipes}
          keyExtractor={(r) => r.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState icon="book-outline" title="No recipes found" body="Save a recipe first, then add it to your plan." />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.pickRow}
              onPress={() => {
                actions.planAdd(toKey(pickerDay), item.id, item.servings || 4);
                nav.toast(`Added to ${dayLabel(pickerDay)}`);
                closePicker();
              }}
            >
              <RecipeImage recipe={item} style={styles.thumb} iconSize={20} />
              <View style={{ flex: 1 }}>
                <Text style={type.h3} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={type.tiny}>{item.totalMinutes ? `${item.totalMinutes} min` : `${item.ingredients.length} ingredients`}</Text>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.accent} />
            </Pressable>
          )}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingBottom: space.md },
  weekNav: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginBottom: space.sm },
  day: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  todayPill: { backgroundColor: colors.accentTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  todayText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  meal: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  thumb: { width: 60, height: 60, borderRadius: radius.sm },
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  footer: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: space.md,
  },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
