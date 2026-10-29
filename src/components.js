import React, { useEffect, useRef, useState } from 'react';
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
import { colors, radius, shadow, space, type } from './theme';

const VARIANTS = {
  primary: { bg: colors.accent, fg: '#FFFFFF', border: colors.accent },
  dark: { bg: colors.ink, fg: '#FFFFFF', border: colors.ink },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.surface },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent' },
  danger: { bg: colors.dangerTint, fg: colors.danger, border: colors.dangerTint },
};

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
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 17 : 19} color={v.fg} /> : null}
          <Text style={[styles.btnText, compact && { fontSize: 14 }, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

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

export function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** Two-option segmented control, e.g. Ingredients | Method. */
export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && { color: colors.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
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

/** Recipe photo, with a quiet placeholder when there is no photo or it fails to load. */
export function RecipeImage({ recipe, style, iconSize = 28 }) {
  const [failed, setFailed] = useState(false);
  if (recipe.image && !failed) {
    return (
      <View style={[styles.imgWrap, style]}>
        <Image source={{ uri: recipe.image }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      </View>
    );
  }
  return (
    <View style={[styles.imgWrap, styles.imgPlaceholder, style]}>
      <Ionicons name="restaurant-outline" size={iconSize} color={colors.muted} />
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 40 }) {
  return (
    <View style={styles.stepper}>
      <IconButton
        name="remove"
        size={18}
        onPress={() => onChange(Math.max(min, value - 1))}
        label="Fewer servings"
        style={styles.stepperBtn}
      />
      <Text style={styles.stepperText}>{value}</Text>
      <IconButton name="add" size={18} onPress={() => onChange(Math.min(max, value + 1))} label="More servings" style={styles.stepperBtn} />
    </View>
  );
}

export function EmptyState({ icon, title, body, action }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.accent} />
      </View>
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
            <IconButton name="close" onPress={onClose} label="Close" bg={colors.surface} size={20} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Header row used by pushed screens. */
export function TopBar({ title, onBack, right, overlay }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + space.sm }, !overlay && { backgroundColor: colors.bg }]}>
      <IconButton name="chevron-back" onPress={onBack} bg={overlay ? 'rgba(255,255,255,0.95)' : 'transparent'} label="Back" />
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
          backgroundColor: colors.bg,
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
    <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + 84 }]}>
      <Ionicons name="checkmark-circle" size={18} color="#7BE0A6" />
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
    minHeight: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  btnCompact: { minHeight: 40, paddingHorizontal: space.lg, borderRadius: radius.sm },
  btnText: { fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: space.sm,
  },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.sm, padding: 4 },
  segment: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: colors.bg, ...shadow, elevation: 1 },
  segmentText: { fontSize: 15, fontWeight: '700', color: colors.muted },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.inkSoft, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
  },
  inputMulti: { minHeight: 140, textAlignVertical: 'top', lineHeight: 22 },
  imgWrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3 },
  stepperBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg },
  stepperText: { fontSize: 16, fontWeight: '700', minWidth: 36, textAlign: 'center', color: colors.ink },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    maxHeight: '88%',
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.md },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingBottom: space.sm, zIndex: 10 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dark,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    maxWidth: '90%',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
