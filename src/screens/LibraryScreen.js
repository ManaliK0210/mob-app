import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, Chip, EmptyState, RecipeArt } from '../components';
import { colors, radius, space, type } from '../theme';

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

  const recipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.recipes
      .filter((r) => (filter === 'all' ? true : filter === 'fav' ? r.favorite : (r.tags || []).includes(filter)))
      .filter(
        (r) =>
          !q ||
          r.title.toLowerCase().includes(q) ||
          (r.tags || []).some((t) => t.includes(q)) ||
          r.ingredients.some((i) => (i.name || '').toLowerCase().includes(q)),
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [state.recipes, query, filter]);

  const header = (
    <View>
      <View style={[styles.head, { paddingTop: insets.top + space.lg }]}>
        <Text style={type.hero}>Your recipes</Text>
        <Text style={[type.small, { marginTop: 4 }]}>{state.recipes.length} saved · paste any link to add more</Text>
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
        <Chip label="Favourites" icon="heart" active={filter === 'fav'} onPress={() => setFilter('fav')} />
        {topTags.map((t) => (
          <Chip key={t} label={t} active={filter === t} onPress={() => setFilter(filter === t ? 'all' : t)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      data={recipes}
      keyExtractor={(r) => r.id}
      numColumns={2}
      ListHeaderComponent={header}
      columnWrapperStyle={{ paddingHorizontal: space.lg, gap: space.md }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        state.recipes.length ? (
          <EmptyState emoji="🔍" title="No matches" body="Try another word, or clear the filter to see everything." />
        ) : (
          <EmptyState
            emoji="🥄"
            title="Your recipe box is empty"
            body="Paste a link from TikTok, Instagram, YouTube or any recipe blog and Forkcast turns it into a clean recipe card."
            action={<Button title="Import a recipe" icon="link" variant="saffron" onPress={() => nav.push('import')} />}
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
          <RecipeArt recipe={item} height={132} emojiSize={52} />
          <Pressable
            style={styles.heart}
            onPress={() => actions.toggleFavorite(item.id)}
            hitSlop={8}
            accessibilityLabel={item.favorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={18} color={item.favorite ? colors.tomato : colors.ink} />
          </Pressable>
          <Text style={[type.h3, { marginTop: space.sm }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[type.tiny, { marginTop: 2 }]} numberOfLines={1}>
            {[item.totalMinutes ? `${item.totalMinutes} min` : null, `${item.ingredients.length} ingredients`].filter(Boolean).join(' · ')}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: space.lg,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0 },
  chips: { paddingHorizontal: space.lg, paddingVertical: space.md },
  card: { flex: 1, marginBottom: space.lg, maxWidth: '50%' },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
