import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarPlus,
  Clock,
  Heart,
  MessageCircle,
  PlaySquare,
  RotateCcw,
  Bookmark as BookmarkIcon,
  Trash2,
  Utensils,
} from 'lucide-react-native';
import { ImportTimer } from './ImportTimer';
import { InstagramIcon } from './InstagramIcon';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import type { Bookmark } from '../types/bookmarks';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onPress: (bookmark: Bookmark) => void;
  onSchedule: (bookmark: Bookmark) => void;
  onRemove: (id: string, title: string) => void;
  onRetry: (id: string) => void;
}

const ACTION_WIDTH = -84;
const formatCompact = (value: number) =>
  Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/**
 * Clean, compact simple list row for saved recipe bookmarks.
 * Supports swipe-left to reveal the red Delete button (like clearing a notification).
 */
export function BookmarkCard({
  bookmark,
  onPress,
  onSchedule,
  onRemove,
  onRetry,
}: BookmarkCardProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const totalTime = (bookmark.prepTimeMinutes ?? 0) + (bookmark.cookTimeMinutes ?? 0);
  const ingredientCount = bookmark.ingredients?.length ?? 0;
  const isProcessing = bookmark.importStatus === 'processing';
  const isFailed = bookmark.importStatus === 'failed';

  const [translateX] = useState(() => new Animated.Value(0));

  const [swipeState] = useState(() => {
    let isOpen = false;

    const pan = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capture horizontal movement only so vertical FlatList scrolling stays smooth
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const baseOffset = isOpen ? ACTION_WIDTH : 0;
        const newX = baseOffset + gestureState.dx;

        if (newX < 0) {
          // Dragging left reveals delete action
          translateX.setValue(Math.max(newX, -120));
        } else {
          // Dragging right has rubber band resistance
          translateX.setValue(newX * 0.25);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isOpen) {
          if (gestureState.dx > 25) {
            isOpen = false;
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          } else {
            isOpen = true;
            Animated.spring(translateX, {
              toValue: ACTION_WIDTH,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        } else {
          if (gestureState.dx < -35 || gestureState.vx < -0.5) {
            isOpen = true;
            Animated.spring(translateX, {
              toValue: ACTION_WIDTH,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          } else {
            isOpen = false;
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        }
      },
      onPanResponderTerminate: () => {
        isOpen = false;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    });

    return {
      pan,
      getIsOpen: () => isOpen,
      setIsOpen: (val: boolean) => {
        isOpen = val;
      },
    };
  });

  const handleCardPress = () => {
    if (swipeState.getIsOpen()) {
      swipeState.setIsOpen(false);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      onPress(bookmark);
    }
  };

  const handleDeletePress = () => {
    swipeState.setIsOpen(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    onRemove(bookmark.id, bookmark.title);
  };

  const renderSourceIcon = () => {
    if (bookmark.source === 'instagram') {
      return (
        <View style={[styles.sourceIconBox, { backgroundColor: '#E1306C18' }]}>
          <InstagramIcon size={20} color="#E1306C" />
        </View>
      );
    }
    if (bookmark.source === 'youtube') {
      return (
        <View style={[styles.sourceIconBox, { backgroundColor: '#FF000018' }]}>
          <PlaySquare size={20} color="#FF0000" />
        </View>
      );
    }
    return (
      <View style={[styles.sourceIconBox, { backgroundColor: `${Brand.babyPink}25` }]}>
        <BookmarkIcon size={20} color={Brand.babyPink} />
      </View>
    );
  };

  const formattedCategory = bookmark.category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <View style={styles.swipeContainer}>
      {/* Hidden Action: Red Delete Button revealed on swipe-left */}
      <View style={styles.hiddenActionContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleDeletePress}
          style={[styles.deleteActionButton, { backgroundColor: palette.error }]}
          accessibilityLabel={`Delete ${bookmark.title}`}
          accessibilityRole="button"
        >
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Foreground Card */}
      <Animated.View
        {...swipeState.pan.panHandlers}
        style={[
          styles.rowItem,
          {
            transform: [{ translateX }],
            backgroundColor: isDark ? palette.surface : palette.surface,
            borderColor: isDark ? palette.border : palette.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCardPress}
          style={styles.cardContentTouchable}
          accessibilityLabel={`${bookmark.title} by ${bookmark.author}`}
          accessibilityRole="button"
        >
          {/* Real post media when available; source icon remains the fallback. */}
          {bookmark.thumbnailUrl ? (
            <View style={styles.thumbnailWrap}>
              <Image source={{ uri: bookmark.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
              <View style={[styles.sourceOverlay, { backgroundColor: palette.surface }]}>
                <View style={styles.sourceOverlayIcon}>{renderSourceIcon()}</View>
              </View>
            </View>
          ) : renderSourceIcon()}

          {/* Main Info */}
          <View style={styles.infoCol}>
            {/* Top meta row: author + category + time */}
            <View style={styles.metaRow}>
              <Text
                style={[styles.authorText, { color: isDark ? Brand.babyBlue : '#006699' }]}
                numberOfLines={1}
              >
                {bookmark.author}
              </Text>

              {bookmark.category !== 'all' && (
                <>
                  <Text style={[styles.metaDot, { color: palette.textMuted }]}>•</Text>

                  <View
                    style={[
                      styles.categoryPill,
                      { backgroundColor: isDark ? '#262626' : '#F0F0F0' },
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: palette.textMuted }]}>
                      {formattedCategory}
                    </Text>
                  </View>
                </>
              )}

              {totalTime > 0 && (
                <>
                  <Text style={[styles.metaDot, { color: palette.textMuted }]}>•</Text>
                  <View style={styles.timeWrapper}>
                    <Clock size={11} color={palette.textMuted} />
                    <Text style={[styles.timeText, { color: palette.textMuted }]}>
                      {totalTime}m
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Recipe Title */}
            <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
              {bookmark.title}
            </Text>

            {/* Subtitle details: ingredients + servings */}
            {isProcessing && (
              <View style={styles.subDetailRow}>
                <ActivityIndicator size="small" color={Brand.babyPink} style={styles.processingSpinner} />
                <ImportTimer
                  key={bookmark.importEstimate?.elapsedSeconds}
                  estimate={bookmark.importEstimate}
                  style={[styles.detailText, { color: palette.textMuted }]}
                />
              </View>
            )}

            {isFailed && (
              <Text style={[styles.detailText, styles.failedText, { color: palette.error }]} numberOfLines={2}>
                {bookmark.importError ?? 'Could not read this link'}
              </Text>
            )}

            <View style={styles.subDetailRow}>
              {ingredientCount > 0 && (
                <View style={styles.detailPill}>
                  <Utensils size={11} color={palette.textMuted} />
                  <Text style={[styles.detailText, { color: palette.textMuted }]}>
                    {ingredientCount} ingredients
                  </Text>
                </View>
              )}

              {bookmark.servings ? (
                <>
                  {ingredientCount > 0 && (
                    <Text style={[styles.metaDot, { color: palette.textMuted }]}>•</Text>
                  )}
                  <Text style={[styles.detailText, { color: palette.textMuted }]}>
                    {bookmark.servings} servings
                  </Text>
                </>
              ) : null}
              {bookmark.social?.likesCount !== undefined ? (
                <View style={styles.detailPill}>
                  <Heart size={11} color={palette.textMuted} />
                  <Text style={[styles.detailText, { color: palette.textMuted }]}>{formatCompact(bookmark.social.likesCount)}</Text>
                </View>
              ) : null}
              {bookmark.social?.commentsCount !== undefined ? (
                <View style={styles.detailPill}>
                  <MessageCircle size={11} color={palette.textMuted} />
                  <Text style={[styles.detailText, { color: palette.textMuted }]}>{formatCompact(bookmark.social.commentsCount)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: Only the clean Plan Button */}
        <View style={styles.actionCol}>
          {isFailed ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onRetry(bookmark.id)}
              style={[styles.planButton, { backgroundColor: Brand.babyBlue }]}
              accessibilityLabel={`Try reading ${bookmark.title} again`}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <RotateCcw size={14} color={Brand.black} />
              <Text style={styles.planButtonText}>Retry</Text>
            </TouchableOpacity>
          ) : isProcessing ? null : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSchedule(bookmark)}
              style={[styles.planButton, { backgroundColor: Brand.babyPink }]}
              accessibilityLabel={`Add ${bookmark.title} to meal calendar`}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <CalendarPlus size={14} color={Brand.black} />
              <Text style={styles.planButtonText}>Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  processingSpinner: {
    marginRight: 6,
    transform: [{ scale: 0.7 }],
  },
  failedText: {
    marginTop: 2,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  hiddenActionContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: Math.abs(ACTION_WIDTH),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteActionButton: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardContentTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbnailWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  sourceOverlay: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sourceOverlayIcon: { transform: [{ scale: 0.5 }] },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    marginBottom: 4,
    gap: 5,
  },
  authorText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 120,
  },
  metaDot: {
    fontSize: 10,
    opacity: 0.6,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 4,
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionCol: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  planButtonText: {
    color: Brand.black,
    fontSize: 12,
    fontWeight: '800',
  },
});
