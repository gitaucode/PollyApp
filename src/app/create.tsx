import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Send, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { POLL_CATEGORIES } from '@/constants/categories';
import { UI } from '@/constants/theme';
import { pollpopApi } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
const PURPLE = UI.color.purpleDark;
const PURPLE_BTN = UI.color.purple;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface OptionDraft {
  id: string;
  text: string;
  imageUri?: string;   // local URI for preview
  imageUrl?: string;   // uploaded R2 URL
  uploading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DragHandle
// ─────────────────────────────────────────────────────────────────────────────
function DragHandle() {
  return (
    <View style={dh.root}>
      {[0, 1, 2].map((col) => (
        <View key={col} style={dh.col}>
          <View style={dh.dot} />
          <View style={dh.dot} />
        </View>
      ))}
    </View>
  );
}
const DOT = 3;
const dh = StyleSheet.create({
  root: { flexDirection: 'row', gap: 2.5, marginRight: 10, opacity: 0.35 },
  col: { flexDirection: 'column', gap: 3 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#374151' },
});

// ─────────────────────────────────────────────────────────────────────────────
// TextOptionRow
// ─────────────────────────────────────────────────────────────────────────────
function TextOptionRow({
  option, index, canDelete, onChange, onDelete,
}: {
  option: OptionDraft;
  index: number;
  canDelete: boolean;
  onChange: (text: string) => void;
  onDelete: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[optRow.wrapper, focused && optRow.wrapperFocused]}>
      <DragHandle />
      <TextInput
        style={optRow.input}
        placeholder={index === 0 ? 'Yes, my choice' : index === 1 ? 'No, friends see things' : `Option ${index + 1}`}
        placeholderTextColor="#BDBDBD"
        value={option.text}
        onChangeText={onChange}
        maxLength={60}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {canDelete && (
        <Pressable onPress={onDelete} style={optRow.deleteBtn} hitSlop={8}>
          <Text style={optRow.deleteX}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const optRow = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingLeft: 12, paddingRight: 10, paddingVertical: 13, marginBottom: 8,
  },
  wrapperFocused: { borderColor: '#A78BFA' },
  input: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500', paddingVertical: 0 },
  deleteBtn: { paddingLeft: 8 },
  deleteX: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────────────────────
// ImageOptionRow
// ─────────────────────────────────────────────────────────────────────────────
function ImageOptionRow({
  option, index, canDelete, onPickImage, onLabelChange, onDelete,
}: {
  option: OptionDraft;
  index: number;
  canDelete: boolean;
  onPickImage: () => void;
  onLabelChange: (text: string) => void;
  onDelete: () => void;
}) {
  return (
    <View style={imgRow.wrapper}>
      {/* Image picker / preview */}
      <TouchableOpacity
        style={imgRow.imageTap}
        onPress={onPickImage}
        activeOpacity={0.8}
        disabled={option.uploading}
      >
        {option.imageUri ? (
          <Image source={{ uri: option.imageUri }} style={imgRow.preview} />
        ) : (
          <View style={imgRow.placeholder}>
            <ImageIcon size={20} color="#C4B5FD" strokeWidth={1.5} />
            <Text style={imgRow.placeholderText}>Pick photo</Text>
          </View>
        )}
        {option.uploading && (
          <View style={imgRow.uploadingOverlay}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        )}
      </TouchableOpacity>

      {/* Label */}
      <TextInput
        style={imgRow.label}
        placeholder={`Option ${index + 1} label`}
        placeholderTextColor="#BDBDBD"
        value={option.text}
        onChangeText={onLabelChange}
        maxLength={40}
      />

      {canDelete && (
        <Pressable onPress={onDelete} hitSlop={8} style={imgRow.deleteBtn}>
          <X size={16} color="#9CA3AF" strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const imgRow = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 10, marginBottom: 8, gap: 10,
  },
  imageTap: { position: 'relative' },
  preview: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6' },
  placeholder: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: '#F5F0FF', borderWidth: 1.5, borderColor: '#DDD6FE',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  placeholderText: { fontSize: 10, color: '#A78BFA', fontWeight: '600' },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  deleteBtn: { padding: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function CreatePollScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [question, setQuestion] = useState('');
  const [questionFocused, setQuestionFocused] = useState(false);
  const [imagePollMode, setImagePollMode] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([
    { id: '1', text: 'Yes, my choice' },
    { id: '2', text: 'No, friends see things' },
    { id: '3', text: 'Depends why' },
    { id: '4', text: 'I need more tea' },
  ]);
  const [category, setCategory] = useState('dating');
  const [anonymous, setAnonymous] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextId = useRef(5);

  // Switch between text and image mode — reset options to 2 blanks
  const handleModeToggle = useCallback((imageMode: boolean) => {
    setImagePollMode(imageMode);
    setOptions([
      { id: '1', text: '' },
      { id: '2', text: '' },
    ]);
    nextId.current = 3;
  }, []);

  const addOption = useCallback(() => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { id: String(nextId.current++), text: '' }]);
  }, [options.length]);

  const removeOption = useCallback((id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const updateText = useCallback((id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  }, []);

  const pickImage = useCallback(async (id: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const base64 = asset.base64;
    if (!base64) { setError('Could not read image data.'); return; }

    // Mark as uploading
    setOptions((prev) => prev.map((o) => o.id === id ? { ...o, imageUri: asset.uri, uploading: true } : o));

    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const contentType = asset.mimeType ?? `image/${ext}`;
      const { url } = await pollpopApi.uploadMedia({
        filename: `option-${id}.${ext}`,
        contentType,
        base64,
      });
      setOptions((prev) => prev.map((o) => o.id === id ? { ...o, imageUrl: url, uploading: false } : o));
    } catch (err) {
      setOptions((prev) => prev.map((o) => o.id === id ? { ...o, uploading: false } : o));
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }, []);

  const handlePublish = async () => {
    if (isPublishing) return;
    setError(null);

    if (imagePollMode) {
      const validOptions = options.filter((o) => o.imageUrl && o.text.trim());
      if (!question.trim() || validOptions.length < 2) {
        setError('Add a question and at least 2 options with photos and labels.');
        return;
      }
      if (options.some((o) => o.uploading)) {
        setError('Please wait for all uploads to finish.');
        return;
      }
      setIsPublishing(true);
      try {
        await pollpopApi.createPoll({
          question: question.trim(),
          category,
          anonymous,
          options: validOptions.map((o) => ({ text: o.text.trim(), imageUrl: o.imageUrl })),
        });
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not publish poll.');
      } finally {
        setIsPublishing(false);
      }
    } else {
      const cleanOptions = options.map((o) => o.text.trim()).filter(Boolean);
      if (!question.trim() || cleanOptions.length < 2) {
        setError('Add a question and at least two options.');
        return;
      }
      setIsPublishing(true);
      try {
        await pollpopApi.createPoll({
          question: question.trim(),
          category,
          anonymous,
          options: cleanOptions.map((text) => ({ text })),
        });
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not publish poll.');
      } finally {
        setIsPublishing(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.7}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a poll</Text>
        <View style={styles.closeBtn} />
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + Math.max(insets.bottom, 16) },
        ]}
      >
        {/* ── Poll Type Toggle ── */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeBtn, !imagePollMode && styles.modeBtnActive]}
            onPress={() => handleModeToggle(false)}
            activeOpacity={0.75}
          >
            <Text style={[styles.modeBtnText, !imagePollMode && styles.modeBtnTextActive]}>📝 Text poll</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, imagePollMode && styles.modeBtnActive]}
            onPress={() => handleModeToggle(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.modeBtnText, imagePollMode && styles.modeBtnTextActive]}>🖼️ Image poll</Text>
          </TouchableOpacity>
        </View>

        {/* ── Question ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Write your question</Text>
            <Text style={styles.charCount}>{question.length}/140</Text>
          </View>
          <View style={[styles.questionBox, questionFocused && styles.questionBoxFocused]}>
            <TextInput
              style={styles.questionInput}
              placeholder="E.g. What's the best late night snack?"
              placeholderTextColor="#C0C0C0"
              value={question}
              onChangeText={setQuestion}
              onFocus={() => setQuestionFocused(true)}
              onBlur={() => setQuestionFocused(false)}
              multiline
              maxLength={140}
              textAlignVertical="top"
            />
            <View style={styles.questionFooter}>
              <Text style={styles.smileyIcon}>🙂</Text>
            </View>
          </View>
        </View>

        {/* ── Options ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {imagePollMode ? 'Add image options (pick photo + label)' : 'Add answer options'}
          </Text>

          {options.map((opt, index) =>
            imagePollMode ? (
              <ImageOptionRow
                key={opt.id}
                option={opt}
                index={index}
                canDelete={options.length > 2}
                onPickImage={() => void pickImage(opt.id)}
                onLabelChange={(text) => updateText(opt.id, text)}
                onDelete={() => removeOption(opt.id)}
              />
            ) : (
              <TextOptionRow
                key={opt.id}
                option={opt}
                index={index}
                canDelete={options.length > 2}
                onChange={(text) => updateText(opt.id, text)}
                onDelete={() => removeOption(opt.id)}
              />
            )
          )}

          {options.length < (imagePollMode ? 2 : 6) && (
            <TouchableOpacity onPress={addOption} style={styles.addOptionBtn} activeOpacity={0.7}>
              <Text style={styles.addOptionText}>+ Add another option</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Category ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pick a category</Text>
          <View style={styles.categoryPills}>
            {POLL_CATEGORIES.map((cat) => {
              const selected = cat.id === category;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.75}
                  onPress={() => setCategory(cat.id)}
                  style={[styles.categoryPill, selected && styles.categoryPillSelected]}
                >
                  <Text style={styles.categoryPillEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryPillText, selected && styles.categoryPillTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Anonymous Toggle ── */}
        <View style={styles.anonymousRow}>
          <Text style={styles.anonIcon}>🎭</Text>
          <View style={styles.anonTextCol}>
            <Text style={styles.anonTitle}>Anonymous by default</Text>
            <Text style={styles.anonSub}>Voters do not see who you are.</Text>
          </View>
          <Switch
            value={anonymous}
            onValueChange={setAnonymous}
            trackColor={{ false: '#E5E7EB', true: PURPLE }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* ── Publish button ── */}
      <View style={[styles.postBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePublish}
          style={styles.postBtnOuter}
          disabled={isPublishing}
        >
          <LinearGradient
            colors={UI.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.postBtn}
          >
            <Text style={styles.postBtnText}>{isPublishing ? 'Publishing...' : 'Publish poll'}</Text>
            <View style={styles.postBtnIcon}>
              <Send size={16} color="white" strokeWidth={2} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12, backgroundColor: '#FFFFFF',
  },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 17, color: '#374151', fontWeight: '400' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 8 },

  // Mode Toggle
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  modeBtn: {
    flex: 1, paddingVertical: 9, alignItems: 'center',
    borderRadius: 9,
  },
  modeBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  modeBtnTextActive: { color: PURPLE },

  // Sections
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  charCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },

  // Question
  questionBox: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, minHeight: 90,
  },
  questionBoxFocused: { borderColor: '#A78BFA' },
  questionInput: { fontSize: 15, color: '#111827', fontWeight: '400', minHeight: 46, lineHeight: 22, paddingVertical: 0 },
  questionFooter: { alignItems: 'flex-end', paddingTop: 4 },
  smileyIcon: { fontSize: 18, opacity: 0.5 },

  // Add option
  addOptionBtn: { paddingTop: 2, paddingLeft: 2 },
  addOptionText: { fontSize: 14, fontWeight: '600', color: PURPLE_BTN },

  // Category
  categoryPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', gap: 5,
  },
  categoryPillSelected: { backgroundColor: '#F3F0FF', borderColor: '#C4B5FD' },
  categoryPillEmoji: { fontSize: 14 },
  categoryPillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  categoryPillTextSelected: { color: PURPLE },

  // Anonymous
  anonymousRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, gap: 12,
  },
  anonIcon: { fontSize: 22 },
  anonTextCol: { flex: 1 },
  anonTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  anonSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 16 },

  // Publish bar
  postBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingTop: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  postBtnOuter: { borderRadius: 14, overflow: 'hidden' },
  postBtn: {
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, flexDirection: 'row', gap: 10,
  },
  postBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  postBtnIcon: { opacity: 0.9 },
});
