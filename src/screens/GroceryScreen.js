import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, EmptyState, IconButton, Sheet } from '../components';
import { AISLE_ORDER, formatGroceryAmount, mergeIngredients, parseIngredient } from '../lib/ingredients';
import { colors, radius, space, type } from '../theme';

export default function GroceryScreen() {
  const { state, actions } = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [newItem, setNewItem] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const items = state.grocery;
  const done = items.filter((i) => i.checked).length;
  const progress = items.length ? done / items.length : 0;

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
        return `${s.title}\n${open.map((i) => `• ${i.name}${formatGroceryAmount(i) ? ` (${formatGroceryAmount(i)})` : ''}`).join('\n')}`;
      })
      .filter(Boolean)
      .join('\n\n');
    Share.share({ message: `Grocery list\n\n${lines}` }).catch(() => {});
  };

  const clearAll = () =>
    Alert.alert('Clear the whole list?', 'This removes every item, checked or not.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: actions.groceryClearAll },
    ]);

  const menuAction = (fn) => () => {
    setMenuOpen(false);
    fn();
  };

  const header = (
    <View style={[styles.head, { paddingTop: insets.top + space.md }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={type.largeTitle}>Groceries</Text>
        {items.length ? (
          <IconButton name="ellipsis-horizontal" onPress={() => setMenuOpen(true)} label="List options" bg={colors.surface} />
        ) : null}
      </View>

      {items.length ? (
        <View style={{ marginTop: space.md }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={[type.small, { marginTop: 6 }]}>
            {done} of {items.length} items
          </Text>
        </View>
      ) : null}

      <View style={styles.addRow}>
        <Ionicons name="add" size={22} color={colors.accent} />
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addManual}
          placeholder="Add item"
          placeholderTextColor={colors.muted}
          style={styles.addInput}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        {newItem.trim() ? (
          <Pressable onPress={addManual} hitSlop={8} accessibilityLabel="Add item">
            <Text style={{ color: colors.accent, fontWeight: '700' }}>Add</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 60 }}
        ListEmptyComponent={
          <EmptyState
            icon="cart-outline"
            title="Your list is empty"
            body="Plan your meals and we’ll build one list for the week, with amounts added up and sorted by aisle."
            action={<Button title="Go to meal plan" icon="calendar-outline" onPress={() => nav.setTab('plan')} />}
          />
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => actions.groceryToggle(item.id)}
            onLongPress={() => actions.groceryRemove(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.checked }}
            accessibilityHint="Long-press to remove"
          >
            <View style={[styles.check, item.checked && styles.checkOn]}>
              {item.checked ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, item.checked && styles.checked]}>{item.name}</Text>
              {item.sources && item.sources.length && !item.checked ? (
                <Text style={type.tiny} numberOfLines={1}>
                  {item.sources.join(', ')}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.amount, item.checked && styles.checked]}>{formatGroceryAmount(item)}</Text>
          </Pressable>
        )}
      />
      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="List options">
        <MenuRow icon="share-outline" label="Share list" onPress={menuAction(share)} />
        <MenuRow icon="checkmark-done-outline" label="Remove checked items" onPress={menuAction(actions.groceryClearChecked)} />
        <MenuRow icon="trash-outline" label="Clear list" danger onPress={menuAction(clearAll)} />
      </Sheet>
    </View>
  );
}

function MenuRow({ icon, label, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.ink} />
      <Text style={[type.body, { fontWeight: '600' }, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.success },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: space.lg,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  addInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CFCFCA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  amount: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
  checked: { color: colors.muted, textDecorationLine: 'line-through' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
});
