import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, Field, TopBar } from '../components';
import { aiExtract } from '../lib/importer';
import { colors, radius, space, type } from '../theme';

export default function SettingsScreen() {
  const { state, actions } = useStore();
  const nav = useNav();
  const builtIn = (Constants.expoConfig?.extra?.aiProxyUrl || '').trim();
  const [aiUrl, setAiUrl] = useState(state.settings.aiUrl || '');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const saveAi = () => {
    actions.setSettings({ aiUrl: aiUrl.trim() });
    nav.toast(aiUrl.trim() ? 'AI import turned on' : 'AI import address cleared');
  };

  const test = async () => {
    const target = aiUrl.trim() || builtIn;
    if (!target) return;
    setTesting(true);
    setStatus(null);
    try {
      const r = await aiExtract(target, {
        text: 'Cheese toast\n2 slices bread\n1 cup grated cheddar\nToast the bread, top with cheese, grill until bubbling.',
      });
      setStatus({ ok: true, msg: `Connected — read “${r.title}” with ${r.ingredients.length} ingredients.` });
    } catch (e) {
      setStatus({ ok: false, msg: `Couldn’t connect: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  const reset = () =>
    Alert.alert('Reset to sample data?', 'Your recipes, plan and grocery list will be replaced with the starter recipes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          actions.resetDemo();
          nav.reset();
          nav.toast('Sample data restored');
        },
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Settings" onBack={nav.pop} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="sparkles" size={20} color={colors.basil} />
            <Text style={type.h2}>AI import</Text>
          </View>
          <Text style={[type.small, { marginBottom: space.lg }]}>
            Recipe blogs import without AI. Social captions and messy pages are read best by AI, which runs through a small proxy so no API
            key lives on your phone.{' '}
            {builtIn ? 'This build already includes one — add your own only to override it.' : 'Paste your proxy address to turn it on.'}
          </Text>
          <Field
            label="Proxy address"
            value={aiUrl}
            onChangeText={setAiUrl}
            placeholder={builtIn || 'https://forkcast-ai.yourname.workers.dev'}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Save" compact onPress={saveAi} style={{ flex: 1 }} />
            <Button
              title="Test connection"
              compact
              variant="outline"
              loading={testing}
              disabled={!aiUrl.trim() && !builtIn}
              onPress={test}
              style={{ flex: 1 }}
            />
          </View>
          {status ? (
            <Text style={[type.small, { marginTop: space.md, color: status.ok ? colors.basil : colors.tomato }]}>{status.msg}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="refresh" size={20} color={colors.basil} />
            <Text style={type.h2}>Sample data</Text>
          </View>
          <Text style={[type.small, { marginBottom: space.lg }]}>Restore the six starter recipes and a planned week. Handy for demos.</Text>
          <Button title="Reset to sample data" variant="danger" compact onPress={reset} />
        </View>

        <Text style={[type.tiny, { textAlign: 'center', marginTop: space.xl }]}>
          Forkcast {Constants.expoConfig?.version || '1.0.0'} · {state.recipes.length} recipes stored on this device
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, paddingBottom: 60 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.sm },
});
