import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groceryItemsForDays, useStore } from '../store';
import { useNav } from '../nav';
import { Button, EmptyState, IconButton, RecipeArt, Sheet } from '../components';
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
    nav.toast(`Grocery list ready: ${items.length} items`);
  };

  const weekTitle =
    weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : weekOffset === -1 ? 'Last week' : weekRangeLabel(days);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: 120 }}>
        <View style={styles.head}>
          <Text style={type.hero}>Meal plan</Text>
          <View style={styles.weekNav}>
            <IconButton name="chevron-back" onPress={() => setWeekOffset((w) => w - 1)} label="Previous week" />
            <Pressable onPress={() => setWeekOffset(0)} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={type.h3}>{weekTitle}</Text>
              <Text style={type.tiny}>
                {weekRangeLabel(days)} · {plannedCount} {plannedCount === 1 ? 'meal' : 'meals'}
              </Text>
            </Pressable>
            <IconButton name="chevron-forward" onPress={() => setWeekOffset((w) => w + 1)} label="Next week" />
          </View>
        </View>

        {days.map((d) => {
          const key = toKey(d);
          const entries = state.plan[key] || [];
          const today = isToday(d);
          return (
            <View key={key} style={styles.day}>
              <View style={[styles.dayBadge, today && styles.dayBadgeToday]}>
                <Text style={[styles.dayName, today && { color: '#fff' }]}>{dayLabel(d)}</Text>
                <Text style={[styles.dayDate, today && { color: '#ffffffcc' }]}>{d.getDate()}</Text>
              </View>
              <View style={{ flex: 1, gap: space.sm }}>
                {entries.map((e) => {
                  const r = state.recipes.find((x) => x.id === e.recipeId);
                  if (!r) return null;
                  return (
                    <Pressable key={e.id} style={styles.meal} onPress={() => nav.push('recipe', { id: r.id })}>
                      <RecipeArt recipe={r} height={44} emojiSize={22} rounded={10} style={{ width: 44 }} />
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
                            <Ionicons name="remove-circle-outline" size={18} color={colors.muted} />
                          </Pressable>
                          <Text style={type.tiny}>{e.servings} servings</Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => actions.planServings(key, e.id, e.servings + 1)}
                            accessibilityLabel="More servings"
                          >
                            <Ionicons name="add-circle-outline" size={18} color={colors.muted} />
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
                <Pressable style={styles.addMeal} onPress={() => setPickerDay(d)} accessibilityLabel={`Add a meal on ${dayLabel(d)}`}>
                  <Ionicons name="add" size={18} color={colors.basil} />
                  <Text style={{ color: colors.basil, fontWeight: '600' }}>{entries.length ? 'Add another' : 'Add a meal'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={plannedCount ? `Make grocery list for ${plannedCount} meals` : 'Plan meals to build a list'}
          icon="basket"
          disabled={!plannedCount}
          onPress={buildList}
        />
      </View>

      <Sheet
        visible={!!pickerDay}
        onClose={() => {
          setPickerDay(null);
          setPickerQuery('');
        }}
        title={pickerDay ? `${dayLabel(pickerDay)} ${shortDate(pickerDay)}` : ''}
        tall
      >
        <TextInput
          value={pickerQuery}
          onChangeText={setPickerQuery}
          placeholder="Search your recipes"
          placeholderTextColor={colors.muted}
          style={styles.pickerSearch}
        />
        <FlatList
          data={pickerRecipes}
          keyExtractor={(r) => r.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState emoji="📭" title="No recipes found" body="Import a recipe first, then plan it here." />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.pickRow}
              onPress={() => {
                actions.planAdd(toKey(pickerDay), item.id, item.servings || 4);
                nav.toast(`Added to ${dayLabel(pickerDay)}`);
                setPickerDay(null);
                setPickerQuery('');
              }}
            >
              <RecipeArt recipe={item} height={48} emojiSize={24} rounded={10} style={{ width: 48 }} />
              <View style={{ flex: 1 }}>
                <Text style={type.h3} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={type.tiny}>{item.totalMinutes ? `${item.totalMinutes} min` : `${item.ingredients.length} ingredients`}</Text>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.basil} />
            </Pressable>
          )}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, marginBottom: space.md },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
  },
  day: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  dayBadge: {
    width: 52,
    height: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  dayBadgeToday: { backgroundColor: colors.basil, borderColor: colors.basil },
  dayName: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  dayDate: { fontSize: 20, fontWeight: '800', color: colors.ink },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  addMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  footer: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg },
  pickerSearch: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    height: 44,
    fontSize: 15,
    color: colors.ink,
    marginBottom: space.md,
  },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
