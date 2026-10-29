import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, EmptyState, IconButton } from '../components';
import { AISLE_ORDER, formatGroceryAmount, mergeIngredients, parseIngredient } from '../lib/ingredients';
import { colors, radius, space, type } from '../theme';

const AISLE_ICONS = {
  Produce: '🥬',
  'Meat & Seafood': '🍗',
  'Dairy & Eggs': '🧀',
  Bakery: '🥖',
  Pantry: '🫙',
  'Spices & Seasoning': '🧂',
  Frozen: '🧊',
  Other: '🛒',
};

export default function GroceryScreen() {
  const { state, actions } = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [newItem, setNewItem] = useState('');

  const items = state.grocery;
  const remaining = items.filter((i) => !i.checked).length;

  const sections = useMemo(() => {
    const byAisle = {};
    for (const it of items) (byAisle[it.aisle] = byAisle[it.aisle] || []).push(it);
    return AISLE_ORDER.filter((a) => byAisle[a]).map((a) => ({
      title: a,
      data: byAisle[a].slice().sort((x, y) => Number(x.checked) - Number(y.checked) || x.name.localeCompare(y.name)),
    }));
  }, [items]);

  const addManual = () => {
    const text = newItem.trim();
    if (!text) return;
    actions.groceryAddManual(mergeIngredients([{ ingredient: parseIngredient(text), factor: 1 }]));
    setNewItem('');
  };

  const share = () => {
    const lines = sections
      .map((s) => {
        const open = s.data.filter((i) => !i.checked);
        if (!open.length) return null;
        return `${s.title}\n${open.map((i) => `☐ ${i.name}${formatGroceryAmount(i) ? ` — ${formatGroceryAmount(i)}` : ''}`).join('\n')}`;
      })
      .filter(Boolean)
      .join('\n\n');
    Share.share({ message: `Grocery list from Forkcast\n\n${lines}` }).catch(() => {});
  };

  const clearAll = () =>
    Alert.alert('Clear the whole list?', 'This removes every item, checked or not.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear list', style: 'destructive', onPress: actions.groceryClearAll },
    ]);

  const header = (
    <View style={[styles.head, { paddingTop: insets.top + space.lg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={type.hero}>Groceries</Text>
          <Text style={[type.small, { marginTop: 4 }]}>
            {items.length ? `${remaining} to buy · ${items.length - remaining} in the basket` : 'Sorted by aisle, merged across recipes'}
          </Text>
        </View>
        {items.length ? <IconButton name="share-outline" onPress={share} label="Share list" /> : null}
      </View>
      <View style={styles.addRow}>
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addManual}
          placeholder="Add an item, e.g. 2 lemons"
          placeholderTextColor={colors.muted}
          style={styles.addInput}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <Pressable style={styles.addBtn} onPress={addManual} accessibilityLabel="Add item">
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 60 }}
      ListEmptyComponent={
        <EmptyState
          emoji="🧺"
          title="Your list is empty"
          body="Plan a few meals and Forkcast builds one list, with duplicates merged and amounts added up."
          action={<Button title="Go to meal plan" icon="calendar" onPress={() => nav.setTab('plan')} />}
        />
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>
          {AISLE_ICONS[section.title]} {section.title}
        </Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => actions.groceryToggle(item.id)}
          onLongPress={() => actions.groceryRemove(item.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityHint="Long-press to remove"
        >
          <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={24} color={item.checked ? colors.basil : colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[type.body, item.checked && styles.checked]}>{item.name}</Text>
            {item.sources && item.sources.length ? (
              <Text style={type.tiny} numberOfLines={1}>
                For {item.sources.join(', ')}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.amount, item.checked && styles.checked]}>{formatGroceryAmount(item)}</Text>
        </Pressable>
      )}
      ListFooterComponent={
        items.length ? (
          <View style={styles.footer}>
            <Button
              title="Remove checked"
              variant="outline"
              compact
              icon="checkmark-done"
              onPress={actions.groceryClearChecked}
              style={{ flex: 1 }}
            />
            <Button title="Clear list" variant="danger" compact icon="trash-outline" onPress={clearAll} style={{ flex: 1 }} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  addRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  addInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    fontSize: 15,
    color: colors.ink,
  },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.basil, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...type.h3, paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  amount: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
  checked: { color: colors.muted, textDecorationLine: 'line-through' },
  footer: { flexDirection: 'row', gap: space.sm, padding: space.lg, marginTop: space.md },
});
