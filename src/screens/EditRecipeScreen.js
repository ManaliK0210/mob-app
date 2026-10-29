import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uid, useStore } from '../store';
import { useNav } from '../nav';
import { Button, Field, RecipeArt, TopBar } from '../components';
import { parseIngredient } from '../lib/ingredients';
import { colors, radius, space, type } from '../theme';

const toLines = (s) =>
  String(s || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// Review an imported draft (or edit an existing recipe) before saving.
export default function EditRecipeScreen({ draft, method, warning, recipeId }) {
  const { state, actions } = useStore();
  const nav = useNav();
  const existing = recipeId ? state.recipes.find((r) => r.id === recipeId) : null;
  const base = existing || draft || { title: '', servings: 4, ingredients: [], steps: [], tags: [] };

  const [title, setTitle] = useState(base.title || '');
  const [servings, setServings] = useState(String(base.servings || 4));
  const [minutes, setMinutes] = useState(base.totalMinutes ? String(base.totalMinutes) : '');
  const [tags, setTags] = useState((base.tags || []).join(', '));
  const [ingredients, setIngredients] = useState((base.ingredients || []).map((i) => i.raw || i.name).join('\n'));
  const [steps, setSteps] = useState((base.steps || []).join('\n'));
  const [error, setError] = useState('');

  const save = () => {
    if (!title.trim()) {
      setError('Give the recipe a name so you can find it later.');
      return;
    }
    const recipe = {
      ...(existing || draft || {}),
      title: title.trim(),
      servings: Math.max(1, parseInt(servings, 10) || 4),
      totalMinutes: parseInt(minutes, 10) || null,
      tags: tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
      ingredients: toLines(ingredients).map(parseIngredient),
      steps: toLines(steps).map((s) => s.replace(/^(\d+[.)]|step \d+:?)\s*/i, '')),
    };
    if (existing) {
      actions.updateRecipe(recipe);
      nav.pop();
      nav.toast('Recipe updated');
    } else {
      recipe.id = uid();
      actions.addRecipe(recipe);
      nav.setTab('recipes');
      nav.replace('recipe', { id: recipe.id });
      nav.toast('Saved to your recipes');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <TopBar title={existing ? 'Edit recipe' : 'Review recipe'} onBack={nav.pop} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {method ? (
          <View style={[styles.banner, warning && { backgroundColor: colors.saffronTint }]}>
            <Ionicons name={warning ? 'information-circle' : 'checkmark-circle'} size={20} color={warning ? colors.ink : colors.basil} />
            <Text style={[type.small, { flex: 1, color: colors.ink }]}>
              {warning || `Imported via ${method.toLowerCase()}. Check it over, then save.`}
            </Text>
          </View>
        ) : null}

        {(draft && draft.image) || (existing && existing.image) ? (
          <RecipeArt recipe={existing || draft} height={180} style={{ marginBottom: space.lg }} />
        ) : null}

        <Field label="Recipe name" value={title} onChangeText={setTitle} placeholder="e.g. Grandma’s apple crumble" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field label="Servings" value={servings} onChangeText={setServings} keyboardType="number-pad" style={{ flex: 1 }} />
          <Field
            label="Total time (min)"
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            placeholder="30"
            style={{ flex: 1 }}
          />
        </View>
        <Field label="Tags" value={tags} onChangeText={setTags} placeholder="dinner, vegetarian, quick" autoCapitalize="none" />
        <Field
          label={`Ingredients · ${toLines(ingredients).length}`}
          value={ingredients}
          onChangeText={setIngredients}
          multiline
          placeholder={'One per line\n2 cups flour\n1 tsp salt'}
        />
        <Field
          label={`Steps · ${toLines(steps).length}`}
          value={steps}
          onChangeText={setSteps}
          multiline
          inputStyle={{ minHeight: 200 }}
          placeholder={'One step per line'}
        />

        {draft && draft.sourceUrl ? (
          <Text style={[type.tiny, { marginBottom: space.lg }]} numberOfLines={1}>
            Source: {draft.sourceUrl}
          </Text>
        ) : null}

        {error ? <Text style={[type.small, { color: colors.tomato, marginBottom: space.md }]}>{error}</Text> : null}
        <Button title={existing ? 'Save changes' : 'Save recipe'} icon="checkmark" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, paddingBottom: 80 },
  banner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.basilTint,
    padding: space.md,
    borderRadius: radius.sm,
    marginBottom: space.lg,
  },
});
