import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, Chip, Field, TopBar } from '../components';
import { importFromText, importFromUrl } from '../lib/importer';
import { colors, radius, space, type } from '../theme';

const SAMPLE_CAPTION = `Creamy Tuscan Gnocchi 🤤 ready in 20 minutes!
Ingredients:
- 1 lb gnocchi
- 2 tbsp butter
- 3 cloves garlic, minced
- 1/2 cup sun-dried tomatoes, chopped
- 2 cups baby spinach
- 1 cup heavy cream
- 1/2 cup grated parmesan
- Salt and pepper to taste
Method:
1. Pan-fry the gnocchi in butter over medium-high heat until golden, about 5 minutes. Set aside.
2. Add the garlic and sun-dried tomatoes to the pan and cook for 1 minute.
3. Stir in the spinach until wilted, then pour in the cream and parmesan. Simmer for 3 minutes.
4. Return the gnocchi to the pan, toss to coat and season to taste.
#dinner #pasta #easyrecipes`;

export function getAiUrl(settings) {
  return (settings.aiUrl || Constants.expoConfig?.extra?.aiProxyUrl || '').trim();
}

export default function ImportScreen() {
  const { state } = useStore();
  const nav = useNav();
  const [mode, setMode] = useState('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const aiUrl = getAiUrl(state.settings);

  const pasteLink = async () => {
    const clip = (await Clipboard.getStringAsync()) || '';
    const found = clip.match(/https?:\/\/\S+/)?.[0];
    if (found) {
      setUrl(found);
      setError('');
    } else {
      setError('Your clipboard doesn’t have a link in it. Copy the share link from TikTok, Instagram or a recipe site first.');
    }
  };

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const result = mode === 'link' ? await importFromUrl(url, { aiUrl }) : await importFromText(text, { aiUrl });
      nav.replace('edit', { draft: result.recipe, method: result.method, warning: result.warning });
    } catch (e) {
      setError(e.message || 'Import failed. Try pasting the recipe text instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <TopBar title="Import a recipe" onBack={nav.pop} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={type.h1}>Turn any post into a recipe card</Text>
        <Text style={[type.small, { marginTop: space.sm, marginBottom: space.lg }]}>
          Paste a link from TikTok, Instagram, YouTube or a recipe blog — or paste the recipe text itself.
        </Text>

        <View style={styles.segment}>
          <Chip label="From a link" icon="link" active={mode === 'link'} onPress={() => setMode('link')} />
          <Chip label="From text" icon="document-text" active={mode === 'text'} onPress={() => setMode('text')} />
        </View>

        {mode === 'link' ? (
          <>
            <Field
              value={url}
              onChangeText={setUrl}
              placeholder="https://www.tiktok.com/@chef/video/…"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={run}
            />
            <Button title="Paste link from clipboard" icon="clipboard-outline" variant="outline" onPress={pasteLink} />
          </>
        ) : (
          <>
            <Field
              value={text}
              onChangeText={setText}
              placeholder={'Paste a caption, a message from a friend, or notes.\nList ingredients and steps on separate lines.'}
              multiline
              inputStyle={{ minHeight: 200 }}
            />
            <Button title="Try a sample caption" icon="sparkles-outline" variant="outline" onPress={() => setText(SAMPLE_CAPTION)} />
          </>
        )}

        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={colors.tomato} />
            <Text style={[type.small, { color: colors.tomato, flex: 1 }]}>{error}</Text>
          </View>
        ) : null}

        <Button
          title={loading ? 'Reading recipe…' : 'Import recipe'}
          icon="download-outline"
          variant="saffron"
          loading={loading}
          disabled={mode === 'link' ? !url.trim() : !text.trim()}
          onPress={run}
          style={{ marginTop: space.xl }}
        />

        <View style={styles.aiNote}>
          <Ionicons name={aiUrl ? 'sparkles' : 'sparkles-outline'} size={18} color={aiUrl ? colors.basil : colors.muted} />
          <Text style={[type.tiny, { flex: 1, color: colors.inkSoft }]}>
            {aiUrl
              ? 'AI import is on: captions and messy pages are read by AI, then you review before saving.'
              : 'Recipe blogs import instantly. For social captions, turn on AI import in Settings for the best results.'}
          </Text>
        </View>

        <Button
          title="Write a recipe from scratch"
          variant="ghost"
          icon="create-outline"
          onPress={() => nav.replace('edit', {})}
          style={{ marginTop: space.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, paddingBottom: 60 },
  segment: { flexDirection: 'row', marginBottom: space.lg },
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.tomatoTint,
    padding: space.md,
    borderRadius: radius.sm,
    marginTop: space.lg,
  },
  aiNote: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.basilTint,
  },
});
