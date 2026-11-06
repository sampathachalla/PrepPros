import React from 'react';
import {
  Modal,
  Image,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  X,
  ExternalLink,
  CalendarPlus,
  Clock,
  Users,
  PlaySquare,
  Bookmark as BookmarkIcon,
  ChefHat,
  Eye,
  Heart,
  MessageCircle,
  Images,
  Trash2,
} from 'lucide-react-native';
import { InstagramIcon } from './InstagramIcon';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import type { Bookmark } from '../types/bookmarks';

interface BookmarkDetailModalProps {
  bookmark: Bookmark | null;
  visible: boolean;
  onClose: () => void;
  onWatch: (url: string) => void;
  onSchedule: (bookmark: Bookmark) => void;
  onRemove: (id: string, title: string) => void;
}

export function BookmarkDetailModal({
  bookmark,
  visible,
  onClose,
  onWatch,
  onSchedule,
  onRemove,
}: BookmarkDetailModalProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  if (!bookmark) return null;

  const totalTime = (bookmark.prepTimeMinutes ?? 0) + (bookmark.cookTimeMinutes ?? 0);
  const heroImage = bookmark.social?.photos[0] ?? bookmark.thumbnailUrl;
  const formatCount = (value: number) =>
    Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

  const renderSourceBadge = () => {
    if (bookmark.source === 'instagram') {
      return (
        <View style={[styles.platformBadge, { backgroundColor: '#E1306C' }]}>
          <InstagramIcon size={14} color="#FFFFFF" />
          <Text style={styles.platformBadgeText}>Instagram Reel</Text>
        </View>
      );
    }
    if (bookmark.source === 'youtube') {
      return (
        <View style={[styles.platformBadge, { backgroundColor: '#FF0000' }]}>
          <PlaySquare size={14} color="#FFFFFF" />
          <Text style={styles.platformBadgeText}>YouTube Video</Text>
        </View>
      );
    }
    return (
      <View style={[styles.platformBadge, { backgroundColor: Brand.babyPink }]}>
        <BookmarkIcon size={14} color={Brand.black} />
        <Text style={[styles.platformBadgeText, { color: Brand.black }]}>PrepPros Catalog</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? palette.surface : palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          {/* Top Bar with Dismiss Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: Brand.babyPink }]} />
          </View>

          {/* Top Header Row with Platform Badge & Close Button */}
          <View style={[styles.headerRow, { borderBottomColor: palette.border }]}>
            {renderSourceBadge()}

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? '#262626' : '#F0F0F0' },
              ]}
              accessibilityLabel="Close detail"
            >
              <X size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {heroImage ? (
              <View style={styles.heroWrap}>
                <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
                {(bookmark.social?.photos.length ?? 0) > 1 ? (
                  <View style={styles.mediaCountBadge}>
                    <Images size={14} color="#FFFFFF" />
                    <Text style={styles.mediaCountText}>{bookmark.social?.photos.length}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {/* Title & Author */}
            <View style={styles.content}>
              <Text style={[styles.author, { color: isDark ? Brand.babyBlue : '#006699' }]}>
                {bookmark.author}
              </Text>
              <Text style={[styles.title, { color: palette.text }]}>{bookmark.title}</Text>

              {/* Available recipe information only—never invent defaults. */}
              {(totalTime > 0 || bookmark.servings || bookmark.category !== 'all') && <View
                style={[
                  styles.statsRow,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#F7F7F7',
                    borderColor: palette.border,
                  },
                ]}
              >
                <View style={styles.statItem}>
                  <Clock size={16} color={palette.textMuted} />
                  <Text style={[styles.statValue, { color: palette.text }]}>
                    {totalTime > 0 ? `${totalTime} min` : '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>Total Time</Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />

                <View style={styles.statItem}>
                  <Users size={16} color={palette.textMuted} />
                  <Text style={[styles.statValue, { color: palette.text }]}>
                    {bookmark.servings ?? '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>Servings</Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />

                <View style={styles.statItem}>
                  <ChefHat size={16} color={palette.textMuted} />
                  <Text style={[styles.statValue, { color: palette.text }]}>
                    {bookmark.category === 'all' ? '—' : bookmark.category.replace('_', ' ')}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>Category</Text>
                </View>
              </View>}

              {bookmark.social && (
                <View style={[styles.engagementRow, { borderColor: palette.border }]}>
                  {bookmark.social.viewsCount !== undefined && (
                    <View style={styles.engagementItem}><Eye size={15} color={palette.textMuted} /><Text style={[styles.engagementText, { color: palette.textMuted }]}>{formatCount(bookmark.social.viewsCount)} views</Text></View>
                  )}
                  {bookmark.social.likesCount !== undefined && (
                    <View style={styles.engagementItem}><Heart size={15} color={palette.textMuted} /><Text style={[styles.engagementText, { color: palette.textMuted }]}>{formatCount(bookmark.social.likesCount)}</Text></View>
                  )}
                  {bookmark.social.commentsCount !== undefined && (
                    <View style={styles.engagementItem}><MessageCircle size={15} color={palette.textMuted} /><Text style={[styles.engagementText, { color: palette.textMuted }]}>{formatCount(bookmark.social.commentsCount)}</Text></View>
                  )}
                </View>
              )}

              {/* Action Buttons Row */}
              <View style={styles.actionsContainer}>
                {bookmark.url ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => onWatch(bookmark.url)}
                    style={[
                      styles.watchButton,
                      {
                        backgroundColor:
                          bookmark.source === 'instagram'
                            ? '#E1306C'
                            : bookmark.source === 'youtube'
                              ? '#FF0000'
                              : Brand.babyPink,
                      },
                    ]}
                  >
                    <ExternalLink size={16} color="#FFFFFF" />
                    <Text style={styles.watchButtonText}>
                      {bookmark.source === 'instagram'
                        ? 'Watch on Instagram'
                        : bookmark.source === 'youtube'
                          ? 'Watch on YouTube'
                          : 'View Online'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    onClose();
                    onSchedule(bookmark);
                  }}
                  style={[styles.scheduleButton, { backgroundColor: Brand.babyBlue }]}
                >
                  <CalendarPlus size={16} color={Brand.black} />
                  <Text style={styles.scheduleButtonText}>Add to Calendar</Text>
                </TouchableOpacity>
              </View>

              {/* Ingredients Section */}
              {bookmark.ingredients && bookmark.ingredients.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Ingredients</Text>
                  <View style={styles.ingredientsList}>
                    {bookmark.ingredients.map((item, idx) => (
                      <View key={idx} style={styles.ingredientRow}>
                        <View style={[styles.bullet, { backgroundColor: Brand.babyPink }]} />
                        <Text style={[styles.ingredientText, { color: palette.text }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Notes Section */}
              {bookmark.notes ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Notes & Tips</Text>
                  <View
                    style={[
                      styles.notesBox,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9',
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Text style={[styles.notesText, { color: palette.text }]}>{bookmark.notes}</Text>
                  </View>
                </View>
              ) : null}

              {bookmark.social?.hashtags.length ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Tags</Text>
                  <View style={styles.tagsRow}>
                    {bookmark.social.hashtags.map((tag) => (
                      <View key={tag} style={[styles.tag, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}>
                        <Text style={[styles.tagText, { color: palette.textMuted }]}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Delete Bookmark */}
              <TouchableOpacity
                onPress={() => onRemove(bookmark.id, bookmark.title)}
                activeOpacity={0.7}
                style={styles.removeRow}
              >
                <Trash2 size={16} color={palette.error} />
                <Text style={[styles.removeText, { color: palette.error }]}>
                  Remove from Bookmarks
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroWrap: { height: 220, marginHorizontal: 20, marginTop: 16, borderRadius: 18, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  mediaCountBadge: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.72)' },
  mediaCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  platformBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  actionsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  engagementRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingVertical: 12, marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  engagementItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  engagementText: { fontSize: 12, fontWeight: '600' },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  watchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  scheduleButtonText: {
    color: Brand.black,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  notesBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { fontSize: 12, fontWeight: '600' },
  removeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
