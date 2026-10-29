import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedRecipes } from './data/seed';
import { mergeIngredients } from './lib/ingredients';
import { toKey, weekDays } from './lib/dates';

const STORAGE_KEY = 'forkcast/state/v2';

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;


function seededPlan(recipes) {
  const days = weekDays(0);
  const pick = (id) => recipes.find((r) => r.id === id);
  const plan = {};
  const add = (dayIdx, id) => {
    const r = pick(id);
    if (!r) return;
    const key = toKey(days[dayIdx]);
    plan[key] = [...(plan[key] || []), { id: uid(), recipeId: id, servings: r.servings }];
  };
  add(0, 'seed-butter-chicken');
  add(1, 'seed-overnight-oats');
  add(1, 'seed-peanut-noodles');
  add(2, 'seed-tacos');
  add(3, 'seed-shrimp-pasta');
  add(5, 'seed-pancakes');
  add(6, 'seed-lemon-chicken');
  return plan;
}

export function initialState() {
  const recipes = seedRecipes();
  return {
    hydrated: false,
    recipes,
    plan: seededPlan(recipes),
    grocery: [],
    settings: { aiUrl: '', onboarded: false, defaultServings: 4 },
  };
}

function mergeIntoGrocery(list, merged, origin) {
  const next = list.map((x) => ({ ...x }));
  for (const item of merged) {
    const hit = next.find((x) => x.key === item.key && !x.checked);
    if (hit) {
      if (item.qty !== null) hit.qty = (hit.qty || 0) + item.qty;
      hit.sources = [...new Set([...(hit.sources || []), ...item.sources])];
    } else {
      next.push({ ...item, id: uid(), checked: false, origin });
    }
  }
  return next;
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.state, settings: { ...state.settings, ...(action.state?.settings || {}) }, hydrated: true };

    case 'ADD_RECIPE': {
      const r = action.recipe;
      const recipe = {
        id: uid(),
        createdAt: Date.now(),
        favorite: false,
        ...r,
      };
      return { ...state, recipes: [recipe, ...state.recipes], lastAddedId: recipe.id };
    }
    case 'UPDATE_RECIPE':
      return { ...state, recipes: state.recipes.map((r) => (r.id === action.recipe.id ? { ...r, ...action.recipe } : r)) };
    case 'DELETE_RECIPE': {
      const plan = {};
      for (const [k, entries] of Object.entries(state.plan)) {
        const kept = entries.filter((e) => e.recipeId !== action.id);
        if (kept.length) plan[k] = kept;
      }
      return { ...state, recipes: state.recipes.filter((r) => r.id !== action.id), plan };
    }
    case 'TOGGLE_FAVORITE':
      return { ...state, recipes: state.recipes.map((r) => (r.id === action.id ? { ...r, favorite: !r.favorite } : r)) };

    case 'PLAN_ADD': {
      const entries = state.plan[action.dateKey] || [];
      return {
        ...state,
        plan: { ...state.plan, [action.dateKey]: [...entries, { id: uid(), recipeId: action.recipeId, servings: action.servings }] },
      };
    }
    case 'PLAN_REMOVE': {
      const entries = (state.plan[action.dateKey] || []).filter((e) => e.id !== action.entryId);
      const plan = { ...state.plan };
      if (entries.length) plan[action.dateKey] = entries;
      else delete plan[action.dateKey];
      return { ...state, plan };
    }
    case 'PLAN_SERVINGS': {
      const entries = (state.plan[action.dateKey] || []).map((e) =>
        e.id === action.entryId ? { ...e, servings: Math.max(1, action.servings) } : e,
      );
      return { ...state, plan: { ...state.plan, [action.dateKey]: entries } };
    }

    case 'GROCERY_FROM_PLAN': {
      // Replace previously generated plan items that are still unchecked; keep manual / recipe items.
      const kept = state.grocery.filter((x) => x.origin !== 'plan' || x.checked);
      return { ...state, grocery: mergeIntoGrocery(kept, action.items, 'plan') };
    }
    case 'GROCERY_ADD':
      return { ...state, grocery: mergeIntoGrocery(state.grocery, action.items, action.origin || 'recipe') };
    case 'GROCERY_TOGGLE':
      return { ...state, grocery: state.grocery.map((x) => (x.id === action.id ? { ...x, checked: !x.checked } : x)) };
    case 'GROCERY_REMOVE':
      return { ...state, grocery: state.grocery.filter((x) => x.id !== action.id) };
    case 'GROCERY_CLEAR_CHECKED':
      return { ...state, grocery: state.grocery.filter((x) => !x.checked) };
    case 'GROCERY_CLEAR_ALL':
      return { ...state, grocery: [] };

    case 'SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'RESET_DEMO': {
      const fresh = initialState();
      return { ...fresh, hydrated: true, settings: { ...fresh.settings, onboarded: true, aiUrl: state.settings.aiUrl } };
    }
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        dispatch({ type: 'HYDRATE', state: raw ? JSON.parse(raw) : {} });
      } catch (e) {
        dispatch({ type: 'HYDRATE', state: {} });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { hydrated, lastAddedId, ...persist } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persist)).catch(() => {});
    }, 300);
  }, [state]);

  const actions = useMemo(
    () => ({
      addRecipe: (recipe) => dispatch({ type: 'ADD_RECIPE', recipe }),
      updateRecipe: (recipe) => dispatch({ type: 'UPDATE_RECIPE', recipe }),
      deleteRecipe: (id) => dispatch({ type: 'DELETE_RECIPE', id }),
      toggleFavorite: (id) => dispatch({ type: 'TOGGLE_FAVORITE', id }),
      planAdd: (dateKey, recipeId, servings) => dispatch({ type: 'PLAN_ADD', dateKey, recipeId, servings }),
      planRemove: (dateKey, entryId) => dispatch({ type: 'PLAN_REMOVE', dateKey, entryId }),
      planServings: (dateKey, entryId, servings) => dispatch({ type: 'PLAN_SERVINGS', dateKey, entryId, servings }),
      groceryToggle: (id) => dispatch({ type: 'GROCERY_TOGGLE', id }),
      groceryRemove: (id) => dispatch({ type: 'GROCERY_REMOVE', id }),
      groceryClearChecked: () => dispatch({ type: 'GROCERY_CLEAR_CHECKED' }),
      groceryClearAll: () => dispatch({ type: 'GROCERY_CLEAR_ALL' }),
      groceryAddManual: (items) => dispatch({ type: 'GROCERY_ADD', items, origin: 'manual' }),
      setSettings: (settings) => dispatch({ type: 'SETTINGS', settings }),
      resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
    }),
    [],
  );

  const value = useMemo(() => ({ state, dispatch, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ---------- derived helpers ----------

/** Build grocery items for a recipe, scaled to `servings`. */
export function groceryItemsForRecipe(recipe, servings) {
  const factor = recipe.servings ? servings / recipe.servings : 1;
  return mergeIngredients(recipe.ingredients.map((ingredient) => ({ ingredient, factor, recipeTitle: recipe.title })));
}

/** Build merged grocery items for every planned meal in the given days. */
export function groceryItemsForDays(state, days) {
  const entries = [];
  for (const d of days) {
    for (const e of state.plan[toKey(d)] || []) {
      const r = state.recipes.find((x) => x.id === e.recipeId);
      if (!r) continue;
      const factor = r.servings ? e.servings / r.servings : 1;
      for (const ingredient of r.ingredients) entries.push({ ingredient, factor, recipeTitle: r.title });
    }
  }
  return mergeIngredients(entries);
}
