import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { StoreProvider, useStore } from './src/store';
import { NavContext } from './src/nav';
import { PushedScreen, Toast } from './src/components';
import { colors } from './src/theme';

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
  { key: 'plan', label: 'Meal plan', icon: 'calendar' },
  { key: 'grocery', label: 'Groceries', icon: 'cart' },
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

  if (!state.hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (!state.settings.onboarded) {
    return (
      <NavContext.Provider value={nav}>
        <OnboardingScreen />
      </NavContext.Provider>
    );
  }

  const TabScreen = tab === 'plan' ? PlannerScreen : tab === 'grocery' ? GroceryScreen : LibraryScreen;
  const top = stack[stack.length - 1];
  const openItems = state.grocery.filter((g) => !g.checked).length;

  return (
    <NavContext.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={top && top.name === 'cook' ? 'light' : 'dark'} />
        <View style={{ flex: 1 }}>
          <TabScreen />
        </View>

        {tab === 'recipes' ? (
          <Pressable
            onPress={() => push('import')}
            style={({ pressed }) => [s.fab, { bottom: Math.max(insets.bottom, 8) + 74 }, pressed && { transform: [{ scale: 0.96 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Add a recipe"
          >
            <Ionicons name="add" size={30} color="#fff" />
          </Pressable>
        ) : null}

        <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={s.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <View>
                  <Ionicons name={active ? t.icon : `${t.icon}-outline`} size={24} color={active ? colors.accent : colors.muted} />
                  {t.key === 'grocery' && openItems ? (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{openItems > 99 ? '99+' : openItems}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[s.tabLabel, active && { color: colors.accent }]}>{t.label}</Text>
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
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DADAD6',
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
