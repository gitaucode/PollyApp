import { CATEGORY_EMOJI } from '@/constants/categories';
import { UI } from '@/constants/theme';
import { pollpopApi, UserPollSummary, UserProfile } from '@/lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, X } from 'lucide-react-native';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';

const PURPLE_DARK = UI.color.purpleDark;

const TABS = ['Polls', 'Results', 'Saved'] as const;
type Tab = (typeof TABS)[number];

// ─── Profile Avatar ───────────────────────────────────────────────────────────
function ProfileAvatar({ uri }: { uri: string }) {
  return (
    <View style={styles.avatarWrapper}>
      <LinearGradient
        colors={UI.gradient.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatarRingGradient}
      >
        <View style={styles.avatarInnerBorder}>
          <Image source={{ uri }} style={styles.avatarImage} />
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Stats Item ───────────────────────────────────────────────────────────────
function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Poll Row ─────────────────────────────────────────────────────────────────
function PollRow({ poll }: { poll: UserPollSummary }) {
  const router = useRouter();
  const emoji = CATEGORY_EMOJI[poll.category] ?? '🗳️';
  const tint = '#F3E8FF';
  return (
    <TouchableOpacity
      style={styles.pollRow}
      activeOpacity={0.72}
      onPress={() => router.push({ pathname: '/results', params: { pollId: poll.id } })}
    >
      <View style={styles.pollRowLeft}>
        <View style={styles.pollRowBody}>
          <Text style={styles.pollQuestion} numberOfLines={2}>{poll.question}</Text>
          <View style={styles.pollMeta}>
            <Text style={styles.pollMetaText}>{poll.timeAgo}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.pollMetaText}>{poll.votes} votes</Text>
          </View>
        </View>
      </View>
      <View style={[styles.emojiTile, { backgroundColor: tint }]}>
        <Text style={styles.tileEmoji}>{emoji}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Tab Placeholder ──────────────────────────────────────────────────────────
function TabPlaceholder({ message }: { message: string }) {
  return (
    <View style={styles.tabPlaceholder}>
      <Text style={styles.tabPlaceholderText}>{message}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userId, signOut, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Polls');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [polls, setPolls] = useState<UserPollSummary[]>([]);
  const [savedPolls, setSavedPolls] = useState<UserPollSummary[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async (refresh = false) => {
    try {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const [userData, pollsData] = await Promise.all([
        pollpopApi.getUser(userId),
        pollpopApi.getUserPolls(userId),
      ]);
      setUser(userData);
      setPolls(pollsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const loadSavedPolls = useCallback(async () => {
    try {
      setSavedLoading(true);
      setSavedPolls(await pollpopApi.getSavedPolls(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load saved polls.');
    } finally {
      setSavedLoading(false);
    }
  }, [userId]);

  const handleRefresh = useCallback(() => {
    if (activeTab === 'Saved') {
      void loadSavedPolls();
    } else {
      void loadProfile(true);
    }
  }, [activeTab, loadProfile, loadSavedPolls]);

  const openEditModal = useCallback(() => {
    if (user) {
      setEditName(user.name);
      setEditBio(user.bio);
      setEditModalVisible(true);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await pollpopApi.updateUser(userId, editName.trim(), editBio.trim());
      setUser((prev) => prev ? { ...prev, name: editName.trim(), bio: editBio.trim() } : null);
      await refreshUser();
      setEditModalVisible(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (activeTab === 'Saved') void loadSavedPolls();
  }, [activeTab, loadSavedPolls]);

  return (
    <View style={styles.root}>
      {/* ── Fixed Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => void signOut()}
        >
          <Settings size={20} color={UI.color.subtle} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={UI.color.purple} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || savedLoading}
              onRefresh={handleRefresh}
              tintColor={UI.color.purple}
            />
          }
        >
          {/* ── Profile Card ── */}
          {user && (
            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#F5F0FF', '#FAF7FF', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.cardTopTint}
                pointerEvents="none"
              />
              <View style={styles.identityRow}>
                <ProfileAvatar uri={user.avatar} />
                <View style={styles.identityText}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userHandle}>{user.handle}</Text>
                </View>
              </View>
              {!!user.bio && <Text style={styles.userBio}>{user.bio}</Text>}
              <View style={styles.statsRow}>
                <StatItem value={user.polls} label="Polls" />
                <View style={styles.statSep} />
                <StatItem value={user.followers} label="Followers" />
                <View style={styles.statSep} />
                <StatItem value={user.following} label="Following" />
              </View>
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={openEditModal}>
                <Text style={styles.editBtnText}>Edit profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Tabs ── */}
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab}</Text>
                  {isActive && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Tab Content ── */}
          {activeTab === 'Polls' && (
            <View style={styles.pollList}>
              {polls.length === 0 ? (
                <TabPlaceholder message="No polls yet. Create your first one!" />
              ) : (
                <View style={styles.pollGroup}>
                  {polls.map((poll, idx) => (
                    <React.Fragment key={poll.id}>
                      <PollRow poll={poll} />
                      {idx < polls.length - 1 && <View style={styles.pollDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          )}
          {activeTab === 'Results' && (
            <View style={styles.pollList}>
              {polls.length === 0 ? (
                <TabPlaceholder message="No poll results yet. Create polls to see results!" />
              ) : (
                <View style={styles.pollGroup}>
                  {polls.map((poll, idx) => (
                    <React.Fragment key={poll.id}>
                      <PollRow poll={poll} />
                      {idx < polls.length - 1 && <View style={styles.pollDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          )}
          {activeTab === 'Saved' && (
            <View style={styles.pollList}>
              {savedLoading && savedPolls.length === 0 ? (
                <ActivityIndicator color={UI.color.purple} style={{ marginTop: 32 }} />
              ) : savedPolls.length === 0 ? (
                <TabPlaceholder message="Save polls from results to find them here." />
              ) : (
                <View style={styles.pollGroup}>
                  {savedPolls.map((poll, idx) => (
                    <React.Fragment key={poll.id}>
                      <PollRow poll={poll} />
                      {idx < savedPolls.length - 1 && <View style={styles.pollDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      <BottomNav activeTab="profile" />

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalClose}>
                <X size={20} color={UI.color.subtle} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor="#9CA3AF"
                  maxLength={30}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell us about yourself"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={150}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveProfile}
                disabled={isSaving || !editName.trim()}
              >
                <Text style={styles.modalBtnTextSave}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.color.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI.space.xl,
    paddingBottom: UI.space.md,
    backgroundColor: UI.color.white,
  },
  headerTitle: {
    fontSize: UI.text.hero,
    fontWeight: '700',
    color: UI.color.black,
    letterSpacing: 0,
  },
  settingsBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 108 },
  profileCard: {
    marginHorizontal: UI.space.lg,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: UI.color.white,
    borderRadius: UI.radius.xl,
    padding: UI.space.xl,
    overflow: 'hidden',
    ...UI.shadow.card,
    borderWidth: 1,
    borderColor: '#F3F0FF',
  },
  cardTopTint: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 80,
    borderTopLeftRadius: UI.radius.xl,
    borderTopRightRadius: UI.radius.xl,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarWrapper: {},
  avatarRingGradient: { borderRadius: 999, padding: 2.5 },
  avatarInnerBorder: { backgroundColor: UI.color.white, borderRadius: 999, padding: 2 },
  avatarImage: { width: 68, height: 68, borderRadius: 34, backgroundColor: UI.color.line },
  identityText: { marginLeft: 14, flex: 1 },
  userName: { fontSize: 22, fontWeight: '800', color: UI.color.black, letterSpacing: 0, lineHeight: 26 },
  userHandle: { fontSize: 13, color: UI.color.subtle, fontWeight: '500', marginTop: 2 },
  userBio: { fontSize: 13.5, color: '#4B5563', lineHeight: 20, marginBottom: 16, fontWeight: '400' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: UI.color.black, letterSpacing: 0 },
  statLabel: { fontSize: 11.5, color: UI.color.subtle, fontWeight: '500', marginTop: 1 },
  statSep: { width: 1, height: 26, backgroundColor: '#F3F4F6', marginHorizontal: 4 },
  editBtn: {
    alignSelf: 'stretch',
    borderRadius: UI.radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: PURPLE_DARK, letterSpacing: 0.1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 16,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabLabelActive: { color: PURPLE_DARK },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: '20%', right: '20%',
    height: 2.5, backgroundColor: PURPLE_DARK, borderRadius: 99,
  },
  pollList: { paddingHorizontal: 16, paddingTop: 8 },
  pollGroup: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F0FF',
    overflow: 'hidden',
  },
  pollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pollRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  pollRowBody: { flex: 1 },
  pollQuestion: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20, marginBottom: 5 },
  pollMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pollMetaText: { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D1D5DB' },
  pollDivider: { height: 1, backgroundColor: '#EEEBF8', marginHorizontal: 16 },
  emojiTile: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  tileEmoji: { fontSize: 24 },
  tabPlaceholder: { paddingHorizontal: 32, paddingTop: 52, alignItems: 'center' },
  tabPlaceholderText: {
    fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21, fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnSave: {
    backgroundColor: '#7C3AED',
  },
  modalBtnTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalBtnTextSave: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
