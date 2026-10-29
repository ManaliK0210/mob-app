import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useNav } from '../nav';
import { Button, Field, TopBar } from '../components';
import { aiExtract } from '../lib/importer';
import { getAiUrl } from './ImportScreen';
import { colors, radius, space, type } from '../theme';

export default function SettingsScreen() {
  const { state, actions } = useStore();
  const nav = useNav();
  const builtIn = (Constants.expoConfig?.extra?.aiProxyUrl || '').trim();
  const activeUrl = getAiUrl(state.settings);
  const [customUrl, setCustomUrl] = useState(state.settings.aiUrl || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const test = async () => {
    if (!activeUrl) return;
    setTesting(true);
    setStatus(null);
    try {
      const r = await aiExtract(activeUrl, {
        text: 'Cheese toast\n2 slices bread\n1 cup grated cheddar\nToast the bread, top with cheese, grill until bubbling.',
      });
      setStatus({ ok: true, msg: `Working. Test recipe read with ${r.ingredients.length} ingredients.` });
    } catch (e) {
      setStatus({ ok: false, msg: `Not reachable right now (${e.message}). Imports still work using the built-in reader.` });
    } finally {
      setTesting(false);
    }
  };

  const saveCustom = () => {
    actions.setSettings({ aiUrl: customUrl.trim() });
    setStatus(null);
    nav.toast(customUrl.trim() ? 'Custom server saved' : 'Using the default server');
  };

  const reset = () =>
    Alert.alert('Restore sample recipes?', 'Your recipes, meal plan and grocery list will be replaced with the starter recipes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: () => {
          actions.resetDemo();
          nav.reset();
          nav.toast('Sample recipes restored');
        },
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Settings" onBack={nav.pop} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.groupLabel}>Import</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>Smart import</Text>
              <Text style={[type.small, { marginTop: 2 }]}>
                Reads ingredients and steps from social media captions and messy web pages.
              </Text>
            </View>
            <View style={[styles.statusPill, !activeUrl && { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.statusText, !activeUrl && { color: colors.muted }]}>{activeUrl ? 'On' : 'Off'}</Text>
            </View>
          </View>
          {activeUrl ? (
            <View style={[styles.row, styles.rowBorder]}>
              <Button title="Test smart import" variant="secondary" compact loading={testing} onPress={test} style={{ flex: 1 }} />
            </View>
          ) : null}
          {status ? (
            <Text style={[type.small, styles.status, { color: status.ok ? colors.success : colors.danger }]}>{status.msg}</Text>
          ) : null}
          <Pressable style={[styles.row, styles.rowBorder]} onPress={() => setShowAdvanced((v) => !v)}>
            <Text style={[type.body, { flex: 1 }]}>Advanced</Text>
            <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
          </Pressable>
          {showAdvanced ? (
            <View style={{ padding: space.lg, paddingTop: 0 }}>
              <Field
                label="Custom import server"
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder={builtIn || 'https://'}
                inputStyle={{ backgroundColor: colors.bg }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Button title="Save" compact onPress={saveCustom} />
            </View>
          ) : null}
        </View>

        <Text style={styles.groupLabel}>Data</Text>
        <View style={styles.group}>
          <Pressable style={styles.row} onPress={reset}>
            <Ionicons name="refresh" size={20} color={colors.ink} />
            <Text style={[type.body, { flex: 1 }]}>Restore sample recipes</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.groupLabel}>About</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={[type.body, { flex: 1 }]}>Version</Text>
            <Text style={type.small}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={[type.body, { flex: 1 }]}>Saved recipes</Text>
            <Text style={type.small}>{state.recipes.length}</Text>
          </View>
        </View>
        <Text style={[type.tiny, { textAlign: 'center', marginTop: space.xl }]}>
          Your recipes are stored on this device. Sample photos from Unsplash.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, paddingBottom: 60 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: space.sm, marginTop: space.lg, marginLeft: 4 },
  group: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DEDED9' },
  statusPill: { backgroundColor: '#E2F4EA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { color: colors.success, fontWeight: '800', fontSize: 13 },
  status: { paddingHorizontal: space.lg, paddingBottom: space.md },
});
