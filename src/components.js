import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, space, type } from './theme';

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style, compact }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 19} color={v.fg} /> : null}
          <Text style={[styles.btnText, compact && { fontSize: 14 }, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANTS = {
  primary: { bg: colors.basil, fg: '#FFFFFF', border: colors.basil },
  saffron: { bg: colors.saffron, fg: colors.ink, border: colors.saffron },
  outline: { bg: 'transparent', fg: colors.basil, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.basil, border: 'transparent' },
  danger: { bg: colors.tomatoTint, fg: colors.tomato, border: colors.tomatoTint },
};

export function IconButton({ name, onPress, color = colors.ink, size = 22, bg = 'transparent', label, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label || name}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: bg }, pressed && { opacity: 0.6 }, style]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? '#fff' : colors.inkSoft} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, inputStyle, ...props }) {
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.inputMulti, inputStyle]} {...props} />
    </View>
  );
}

/** Coloured tile with the recipe photo, or its emoji on a colour block. */
export function RecipeArt({ recipe, height = 120, emojiSize = 48, rounded = radius.md, style }) {
  if (recipe.image) {
    return (
      <View style={[{ height, borderRadius: rounded, overflow: 'hidden', backgroundColor: recipe.color || colors.basilTint }, style]}>
        <Image source={{ uri: recipe.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View
      style={[
        {
          height,
          borderRadius: rounded,
          backgroundColor: recipe.color || colors.basilTint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{recipe.emoji || '🍲'}</Text>
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 40, label }) {
  return (
    <View style={styles.stepper}>
      <IconButton name="remove" size={18} onPress={() => onChange(Math.max(min, value - 1))} label="Fewer servings" />
      <Text style={styles.stepperText}>
        {value} {label || ''}
      </Text>
      <IconButton name="add" size={18} onPress={() => onChange(Math.min(max, value + 1))} label="More servings" />
    </View>
  );
}

export function EmptyState({ emoji, title, body, action }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 54, marginBottom: space.md }}>{emoji}</Text>
      <Text style={[type.h2, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.small, { textAlign: 'center', marginTop: space.sm, maxWidth: 300 }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space.xl }}>{action}</View> : null}
    </View>
  );
}

/** Bottom sheet built on Modal. */
export function Sheet({ visible, onClose, title, children, tall }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }, tall && { height: '82%' }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={type.h2}>{title}</Text>
            <IconButton name="close" onPress={onClose} label="Close" />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Header row used by pushed screens. */
export function TopBar({ title, onBack, right, transparent }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + space.sm }, !transparent && { backgroundColor: colors.paper }]}>
      <IconButton name="arrow-back" onPress={onBack} bg={transparent ? 'rgba(255,255,255,0.9)' : 'transparent'} label="Back" />
      <Text style={[type.h3, { flex: 1, marginLeft: space.sm }]} numberOfLines={1}>
        {title || ''}
      </Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>{right}</View>
    </View>
  );
}

/** Slide-in wrapper for pushed screens. */
export function PushedScreen({ children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.paper,
          opacity: anim,
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Toast({ message }) {
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + 96 }]}>
      <Ionicons name="checkmark-circle" size={18} color={colors.saffron} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  btnCompact: { minHeight: 38, paddingHorizontal: space.lg },
  btnText: { fontFamily: fonts.title, fontSize: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: space.sm,
  },
  chipActive: { backgroundColor: colors.basil, borderColor: colors.basil },
  chipText: { fontSize: 14, color: colors.inkSoft, fontWeight: '500' },
  fieldLabel: { fontFamily: fonts.title, fontSize: 14, color: colors.inkSoft, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  inputMulti: { minHeight: 140, textAlignVertical: 'top', lineHeight: 22 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 4,
  },
  stepperText: { fontFamily: fonts.title, fontSize: 15, minWidth: 92, textAlign: 'center', color: colors.ink },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: space.xl },
  scrim: { flex: 1, backgroundColor: 'rgba(23,37,30,0.45)' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    maxHeight: '88%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.md },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingBottom: space.sm, zIndex: 10 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    maxWidth: '90%',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
