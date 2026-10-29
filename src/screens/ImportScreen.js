import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, Field, Segmented, TopBar } from '../components';
import { importFromText, importFromUrl } from '../lib/importer';
import { colors, radius, space, type } from '../theme';

const SAMPLE_CAPTION = `Creamy Tuscan Gnocchi ready in 20 minutes!
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

const SOURCES = [
  { icon: 'logo-tiktok', label: 'TikTok' },
  { icon: 'logo-instagram', label: 'Instagram' },
  { icon: 'logo-youtube', label: 'YouTube' },
  { icon: 'globe-outline', label: 'Websites' },
];

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
      setError('There’s no link on your clipboard. Tap Share → Copy link in TikTok, Instagram or your browser first.');
    }
  };

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const result = mode === 'link' ? await importFromUrl(url, { aiUrl }) : await importFromText(text, { aiUrl });
      nav.replace('edit', { draft: result.recipe, method: result.method, warning: result.warning });
    } catch (e) {
      setError(e.message || 'Import didn’t work. Try pasting the recipe text instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <TopBar title="" onBack={nav.pop} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={type.title}>Add a recipe</Text>
        <Text style={[type.small, { marginTop: 6 }]}>We’ll pull out the ingredients and steps for you.</Text>

        <View style={styles.sources}>
          {SOURCES.map((s) => (
            <View key={s.label} style={styles.source}>
              <View style={styles.sourceIcon}>
                <Ionicons name={s.icon} size={20} color={colors.ink} />
              </View>
              <Text style={type.tiny}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Segmented
          options={[
            { value: 'link', label: 'Paste link' },
            { value: 'text', label: 'Paste text' },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v);
            setError('');
          }}
        />

        <View style={{ marginTop: space.lg }}>
          {mode === 'link' ? (
            <>
              <Field
                value={url}
                onChangeText={setUrl}
                placeholder="https://"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={run}
              />
              <Button title="Paste from clipboard" icon="clipboard-outline" variant="secondary" compact onPress={pasteLink} />
            </>
          ) : (
            <>
              <Field
                value={text}
                onChangeText={setText}
                placeholder={'Paste a caption, a message or your own notes.\nPut ingredients and steps on separate lines.'}
                multiline
                inputStyle={{ minHeight: 200 }}
              />
              <Button
                title="Use an example"
                icon="document-text-outline"
                variant="secondary"
                compact
                onPress={() => setText(SAMPLE_CAPTION)}
              />
            </>
          )}
        </View>

        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[type.small, { color: colors.danger, flex: 1 }]}>{error}</Text>
          </View>
        ) : null}

        <Button
          title={loading ? 'Importing…' : 'Import recipe'}
          loading={loading}
          disabled={mode === 'link' ? !url.trim() : !text.trim()}
          onPress={run}
          style={{ marginTop: space.xl }}
        />

        <Button title="Write my own recipe" variant="ghost" onPress={() => nav.replace('edit', {})} style={{ marginTop: space.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, paddingBottom: 60 },
  sources: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: space.xl },
  source: { alignItems: 'center', gap: 6, flex: 1 },
  sourceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.dangerTint,
    padding: space.md,
    borderRadius: radius.sm,
    marginTop: space.lg,
  },
});
