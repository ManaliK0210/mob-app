import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';

import { StoreProvider, useStore } from './src/store';
import { NavContext } from './src/nav';
import { PushedScreen, Toast } from './src/components';
import { colors, fonts } from './src/theme';

import LibraryScreen from './src/screens/LibraryScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import GroceryScreen from './src/screens/GroceryScreen';
import RecipeScreen from './src/screens/RecipeScreen';
import ImportScreen from './src/screens/ImportScreen';
import EditRecipeScreen from './src/screens/EditRecipeScreen';
import CookModeScreen from './src/screens/CookModeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const PUSHED = {
  recipe: RecipeScreen,
  import: ImportScreen,
  edit: EditRecipeScreen,
  cook: CookModeScreen,
  settings: SettingsScreen,
};

const TABS = [
  { key: 'recipes', label: 'Recipes', icon: 'book' },
  { key: 'plan', label: 'Plan', icon: 'calendar' },
  { key: 'import', label: 'Import', icon: 'add', special: true },
  { key: 'grocery', label: 'Groceries', icon: 'basket' },
  { key: 'settings', label: 'Settings', icon: 'options' },
];

function Shell() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('recipes');
  const [stack, setStack] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const push = useCallback((name, params = {}) => setStack((s) => [...s, { key: `${name}-${Date.now()}`, name, params }]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const replace = useCallback(
    (name, params = {}) => setStack((s) => [...s.slice(0, -1), { key: `${name}-${Date.now()}`, name, params }]),
    [],
  );
  const reset = useCallback(() => setStack([]), []);
  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length) {
        pop();
        return true;
      }
      if (tab !== 'recipes') {
        setTab('recipes');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, pop]);

  const nav = useMemo(() => ({ tab, setTab, push, pop, replace, reset, toast }), [tab, push, pop, replace, reset, toast]);

  if (!state.hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  if (!state.settings.onboarded) {
    return (
      <NavContext.Provider value={nav}>
        <OnboardingScreen />
      </NavContext.Provider>
    );
  }

  const TabScreen = tab === 'plan' ? PlannerScreen : tab === 'grocery' ? GroceryScreen : LibraryScreen;
  const top = stack[stack.length - 1];
  const darkTop = top && top.name === 'cook';

  return (
    <NavContext.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <StatusBar style={darkTop ? 'light' : 'dark'} />
        <View style={{ flex: 1 }}>
          <TabScreen />
        </View>

        <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {TABS.map((t) => {
            if (t.special) {
              return (
                <Pressable
                  key={t.key}
                  onPress={() => push('import')}
                  style={s.importWrap}
                  accessibilityRole="button"
                  accessibilityLabel="Import a recipe"
                >
                  <View style={s.importBtn}>
                    <Ionicons name="add" size={30} color={colors.ink} />
                  </View>
                </Pressable>
              );
            }
            const active = tab === t.key;
            const onPress = t.key === 'settings' ? () => push('settings') : () => setTab(t.key);
            return (
              <Pressable key={t.key} onPress={onPress} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
                <Ionicons name={active ? t.icon : `${t.icon}-outline`} size={22} color={active ? colors.basil : colors.muted} />
                <Text style={[s.tabLabel, active && { color: colors.basil, fontFamily: fonts.title }]}>{t.label}</Text>
                {t.key === 'grocery' && state.grocery.some((g) => !g.checked) ? <View style={s.dot} /> : null}
              </Pressable>
            );
          })}
        </View>

        {stack.map((entry) => {
          const Screen = PUSHED[entry.name];
          return Screen ? (
            <PushedScreen key={entry.key}>
              <Screen {...entry.params} />
            </PushedScreen>
          ) : null;
        })}

        <Toast message={toastMsg} />
      </View>
    </NavContext.Provider>
  );
}

export default function App() {
  // If the display font ever fails to load, carry on with the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({ BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 2 },
  tabLabel: { fontSize: 11, color: colors.muted },
  importWrap: { flex: 1, alignItems: 'center' },
  importBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.surface,
    elevation: 4,
  },
  dot: { position: 'absolute', top: 0, right: '30%', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tomato },
});
