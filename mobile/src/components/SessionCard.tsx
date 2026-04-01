import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Session } from '../types';
import { Colors, Shadows } from '../theme/colors';
import { getSessionTypeColor, getSessionDate } from '../services/plans';
import { TrainingPlan } from '../types';

interface SessionCardProps {
  session: Session;
  plan: TrainingPlan;
  weekNumber: number;
  onPress?: () => void;
  onQuickComplete?: (sessionId: string, completed: boolean) => void;
  isPast?: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, plan, weekNumber, onPress, onQuickComplete, isPast }) => {
  const typeColor = getSessionTypeColor(session.type);
  const date = getSessionDate(plan, weekNumber, session.day, session.dateOverride);
  const isCompleted = session.feedback?.completed;

  // Jour affiché : dynamique si la séance a été déplacée (dateOverride)
  const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const displayDay = session.dateOverride && date
    ? JOURS_SEMAINE[date.getDay()]
    : session.day;

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        isPast && !isCompleted && styles.cardMissed,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Barre couleur type */}
      <View style={[styles.typeBar, { backgroundColor: typeColor }]} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.day}>{displayDay}</Text>
            {date && <Text style={styles.date}>{formatDate(date)}</Text>}
          </View>
          <View style={styles.headerRight}>
            {onQuickComplete ? (
              <TouchableOpacity
                style={[styles.quickCheck, isCompleted && styles.quickCheckActive]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onQuickComplete(session.id, !isCompleted);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.quickCheckText}>{isCompleted ? '✓' : ''}</Text>
              </TouchableOpacity>
            ) : null}
            {isCompleted ? (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Fait</Text>
              </View>
            ) : null}
            {session.feedback && !isCompleted ? (
              <View style={styles.skippedBadge}>
                <Text style={styles.skippedText}>Manqué</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>{session.title}</Text>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '18' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{session.type}</Text>
          </View>
          <Text style={styles.duration}>{session.duration}</Text>
          {session.distance ? <Text style={styles.distance}>{session.distance}</Text> : null}
          {session.elevationGain != null && session.elevationGain > 0 ? (
            <Text style={styles.distance}>D+{session.elevationGain}m</Text>
          ) : null}
        </View>

        {/* Intensity */}
        {session.intensity ? (
          <View style={styles.intensityRow}>
            <View style={[
              styles.intensityDot,
              {
                backgroundColor:
                  session.intensity === 'Facile' ? Colors.success :
                  session.intensity === 'Modéré' ? Colors.warning :
                  Colors.error,
              },
            ]} />
            <Text style={styles.intensityText}>{session.intensity}</Text>
            {session.targetPace ? (
              <Text style={styles.paceText}>{session.targetPace}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardMissed: {
    opacity: 0.5,
  },
  typeBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  day: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCheckActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  quickCheckText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.white,
  },
  completedBadge: {
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  skippedBadge: {
    backgroundColor: Colors.errorBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  skippedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  duration: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  distance: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  intensityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  paceText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
});

export default SessionCard;
