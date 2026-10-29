import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, Chip, EmptyState, IconButton, RecipeImage } from '../components';
import { colors, radius, space, type } from '../theme';

function metaLine(r) {
  return [r.totalMinutes ? `${r.totalMinutes} min` : null, `${r.ingredients.length} ingredients`].filter(Boolean).join('  •  ');
}

export default function LibraryScreen() {
  const { state, actions } = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const topTags = useMemo(() => {
    const counts = {};
    state.recipes.forEach((r) => (r.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);
  }, [state.recipes]);

  const sorted = useMemo(() => [...state.recipes].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [state.recipes]);

  const recipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted
      .filter((r) => (filter === 'all' ? true : filter === 'fav' ? r.favorite : (r.tags || []).includes(filter)))
      .filter(
        (r) =>
          !q ||
          r.title.toLowerCase().includes(q) ||
          (r.tags || []).some((t) => t.includes(q)) ||
          r.ingredients.some((i) => (i.name || '').toLowerCase().includes(q)),
      );
  }, [sorted, query, filter]);

  const browsing = !query.trim() && filter === 'all';
  const recent = sorted.slice(0, 5);

  const header = (
    <View>
      <View style={[styles.head, { paddingTop: insets.top + space.md }]}>
        <Text style={type.largeTitle}>Recipes</Text>
        <IconButton name="settings-outline" onPress={() => nav.push('settings')} label="Settings" bg={colors.surface} />
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes or ingredients"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Favorites" active={filter === 'fav'} onPress={() => setFilter('fav')} />
        {topTags.map((t) => (
          <Chip
            key={t}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
            active={filter === t}
            onPress={() => setFilter(filter === t ? 'all' : t)}
          />
        ))}
      </ScrollView>

      {browsing && recent.length > 2 ? (
        <>
          <Text style={[type.h2, styles.sectionTitle]}>Recently saved</Text>
          <FlatList
            horizontal
            data={recent}
            keyExtractor={(r) => `recent-${r.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.featured}
                onPress={() => nav.push('recipe', { id: item.id })}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <RecipeImage recipe={item} style={{ height: 170 }} iconSize={36} />
                <Text style={[type.h3, { marginTop: space.sm }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[type.tiny, { marginTop: 2 }]}>{metaLine(item)}</Text>
              </Pressable>
            )}
          />
        </>
      ) : null}

      {recipes.length ? (
        <Text style={[type.h2, styles.sectionTitle]}>
          {browsing ? 'All recipes' : 'Results'} <Text style={{ color: colors.muted, fontWeight: '600' }}>{recipes.length}</Text>
        </Text>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={recipes}
      keyExtractor={(r) => r.id}
      numColumns={2}
      ListHeaderComponent={header}
      columnWrapperStyle={{ paddingHorizontal: space.lg, gap: space.md }}
      contentContainerStyle={{ paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        state.recipes.length ? (
          <EmptyState icon="search" title="No matches" body="Try a different word, or clear the filter to see all your recipes." />
        ) : (
          <EmptyState
            icon="book-outline"
            title="No recipes yet"
            body="Save recipes from TikTok, Instagram, YouTube or any website. We'll pull out the ingredients and steps for you."
            action={<Button title="Add your first recipe" icon="add" onPress={() => nav.push('import')} />}
          />
        )
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          onPress={() => nav.push('recipe', { id: item.id })}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <RecipeImage recipe={item} style={{ aspectRatio: 1 }} />
          <Pressable
            style={styles.heart}
            onPress={() => actions.toggleFavorite(item.id)}
            hitSlop={8}
            accessibilityLabel={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={18} color={item.favorite ? colors.accent : colors.ink} />
          </Pressable>
          <Text style={[type.h3, { marginTop: space.sm }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[type.tiny, { marginTop: 3 }]} numberOfLines={1}>
            {metaLine(item)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: space.lg,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0 },
  chips: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  sectionTitle: { paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.md },
  featured: { width: 250 },
  card: { flex: 1, marginBottom: space.xl, maxWidth: '48.5%' },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
