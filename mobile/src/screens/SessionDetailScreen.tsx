import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Switch, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Shadows } from '../theme/colors';
import { TrainingPlan, Session, User } from '../types';
import { getPlanById, getSessionTypeColor, getSessionDate } from '../services/plans';
import { savePlan, adaptPlanFromFeedback } from '../services/api';

interface SessionDetailScreenProps {
  planId: string;
  weekNumber: number;
  sessionId: string;
  user: User;
  onBack: () => void;
}

const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({
  planId, weekNumber, sessionId, user, onBack,
}) => {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [adaptationRequested, setAdaptationRequested] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPlanById(planId);
        if (data) {
          setPlan(data);
          const week = data.weeks.find((w) => w.weekNumber === weekNumber);
          const sess = week?.sessions.find((s) => s.id === sessionId);
          setSession(sess || null);
        }
      } catch (e) {
        console.error('[SessionDetail] Error loading:', e);
        Alert.alert('Erreur', 'Impossible de charger la séance.', [
          { text: 'Retour', onPress: onBack },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [planId, weekNumber, sessionId]);

  if (loading || !plan || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const typeColor = getSessionTypeColor(session.type);
  const date = getSessionDate(plan, weekNumber, session.day, session.dateOverride);
  const isCompleted = session.feedback?.completed === true;

  const handleDateChange = async (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (!selectedDate || !plan) return;
    setShowDatePicker(false);

    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    setSaving(true);
    try {
      const updatedPlan = {
        ...plan,
        weeks: plan.weeks.map((w) => {
          if (w.weekNumber !== weekNumber) return w;
          return {
            ...w,
            sessions: w.sessions.map((s) => {
              if (s.id !== sessionId) return s;
              return { ...s, dateOverride: isoDate };
            }),
          };
        }),
      };
      await savePlan(updatedPlan as TrainingPlan);
      setPlan(updatedPlan as TrainingPlan);
      const week = updatedPlan.weeks.find((w) => w.weekNumber === weekNumber);
      const sess = week?.sessions.find((s) => s.id === sessionId);
      setSession(sess || null);
    } catch (e) {
      console.error('[SessionDetail] Error saving date override:', e);
      Alert.alert('Erreur', 'Impossible de modifier la date.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFeedback = () => {
    setRpe(session.feedback?.rpe ?? 5);
    setFeedbackNotes(session.feedback?.notes ?? '');
    setShowFeedbackModal(true);
  };

  const handleSaveFeedback = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      let updatedPlan: any = { ...plan, weeks: plan.weeks.map((w) => {
        if (w.weekNumber !== weekNumber) return w;
        return { ...w, sessions: w.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            feedback: {
              rpe,
              notes: feedbackNotes || undefined,
              completed: true,
              completedAt: new Date().toISOString(),
              adaptationRequested,
            },
          };
        })};
      })};
      await savePlan(updatedPlan as TrainingPlan);

      // If adaptation requested and user is premium, call AI adaptation
      if (adaptationRequested && user.isPremium && plan.generationContext?.questionnaireSnapshot) {
        try {
          const feedbackContext = `Séance "${session.title}" (${session.type}, ${session.duration}) — RPE ${rpe}/10${feedbackNotes ? `. Notes: "${feedbackNotes}"` : ''}`;
          const adaptResult = await adaptPlanFromFeedback(
            updatedPlan as TrainingPlan,
            plan.generationContext.questionnaireSnapshot,
            feedbackContext,
          );

          // Apply modifications to the plan
          if (adaptResult.modifications && adaptResult.modifications.length > 0) {
            adaptResult.modifications.forEach((mod: any) => {
              const weekIdx = updatedPlan.weeks.findIndex((w: any) => w.weekNumber === mod.weekNumber);
              if (weekIdx >= 0 && updatedPlan.weeks[weekIdx].sessions[mod.sessionIndex]) {
                const sess = updatedPlan.weeks[weekIdx].sessions[mod.sessionIndex];
                if (mod.changes.duration) sess.duration = mod.changes.duration;
                if (mod.changes.mainSet) sess.mainSet = mod.changes.mainSet;
                if (mod.changes.targetPace) sess.targetPace = mod.changes.targetPace;
                if (mod.changes.advice) sess.advice = mod.changes.advice;
              }
            });
            await savePlan(updatedPlan as TrainingPlan);
            Alert.alert('Plan adapté !', adaptResult.coachNote || 'Les prochaines séances ont été ajustées.');
          } else {
            Alert.alert('Feedback enregistré', adaptResult.coachNote || 'Aucune modification nécessaire.');
          }
        } catch (adaptError) {
          console.warn('[SessionDetail] Adaptation failed:', adaptError);
          Alert.alert('Feedback enregistré', 'L\'adaptation automatique a échoué mais ton ressenti est sauvegardé.');
        }
      }

      setPlan(updatedPlan as TrainingPlan);
      const week = updatedPlan.weeks.find((w: any) => w.weekNumber === weekNumber);
      const sess = week?.sessions.find((s: any) => s.id === sessionId);
      setSession(sess || null);
      setShowFeedbackModal(false);
      setAdaptationRequested(false);
    } catch (e: any) {
      console.error('[SessionDetail] Error saving feedback:', e);
      const detail = e?.message || e?.code || 'Erreur inconnue';
      Alert.alert('Erreur', `Impossible d'enregistrer le ressenti : ${detail}. Vérifie ta connexion et réessaie.`);
    } finally {
      setSaving(false);
    }
  };

  const handleUndoCompletion = async () => {
    if (!plan) return;
    Alert.alert(
      'Annuler la complétion',
      'Êtes-vous sûr de vouloir marquer cette séance comme non faite ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const updatedPlan = { ...plan, weeks: plan.weeks.map((w) => {
                if (w.weekNumber !== weekNumber) return w;
                return { ...w, sessions: w.sessions.map((s) => {
                  if (s.id !== sessionId) return s;
                  const { feedback, ...rest } = s;
                  return rest;
                })};
              })};
              await savePlan(updatedPlan as TrainingPlan);
              setPlan(updatedPlan as TrainingPlan);
              const week = updatedPlan.weeks.find((w) => w.weekNumber === weekNumber);
              const sess = week?.sessions.find((s) => s.id === sessionId);
              setSession(sess || null);
            } catch (e) {
              console.error('[SessionDetail] Error undoing feedback:', e);
              Alert.alert('Erreur', 'Impossible d\'annuler.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const Section = ({ title, content }: { title: string; content: string }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionContent}>{content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: typeColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} Retour</Text>
        </TouchableOpacity>

        <View style={[styles.typeBadge, { backgroundColor: typeColor + '18' }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{session.type}</Text>
        </View>

        <Text style={styles.title}>{session.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{session.day}</Text>
          {date ? (
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
            >
              <Text style={[
                styles.metaText,
                session.dateOverride ? styles.dateOverriddenText : null,
              ]}>
                {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </Text>
              {session.dateOverride ? (
                <Text style={styles.dateModifiedBadge}>modifié</Text>
              ) : null}
              <Text style={styles.dateEditIcon}>✎</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
            >
              <Text style={styles.metaText}>Modifier la date</Text>
              <Text style={styles.dateEditIcon}>✎</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.metaText}>{session.duration}</Text>
          {session.distance ? <Text style={styles.metaText}>{session.distance}</Text> : null}
        </View>

        {showDatePicker ? (
          Platform.OS === 'ios' ? (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={date || new Date()}
                mode="date"
                display="inline"
                locale="fr-FR"
                onChange={handleDateChange}
              />
              <TouchableOpacity
                style={styles.datePickerDoneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )
        ) : null}

        {/* Intensity + Pace */}
        {(session.intensity || session.targetPace) ? (
          <View style={styles.statsRow}>
            {session.intensity ? (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Intensité</Text>
                <Text style={[styles.statValue, {
                  color: session.intensity === 'Facile' ? Colors.success :
                    session.intensity === 'Modéré' ? Colors.warning : Colors.error,
                }]}>{session.intensity}</Text>
              </View>
            ) : null}
            {session.targetPace ? (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Allure cible</Text>
                <Text style={[styles.statValue, { color: Colors.accent }]}>{session.targetPace}</Text>
              </View>
            ) : null}
            {session.elevationGain != null && session.elevationGain > 0 ? (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Dénivelé</Text>
                <Text style={styles.statValue}>D+{session.elevationGain}m</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {session.warmup ? <Section title="Échauffement" content={session.warmup} /> : null}
        {session.mainSet ? <Section title="Corps de séance" content={session.mainSet} /> : null}
        {session.cooldown ? <Section title="Retour au calme" content={session.cooldown} /> : null}
        {session.advice ? (
          <View style={styles.adviceCard}>
            <Text style={styles.adviceTitle}>Conseil du coach</Text>
            <Text style={styles.adviceContent}>{session.advice}</Text>
          </View>
        ) : null}
        {session.locationSuggestion ? (
          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>Lieu suggéré</Text>
            <Text style={styles.locationValue}>{session.locationSuggestion}</Text>
          </View>
        ) : null}

        {/* Export montre — bientôt disponible */}
        <View style={styles.exportTeaser}>
          <Text style={styles.exportTeaserIcon}>⌚</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.exportTeaserTitle}>Export Garmin / Coros</Text>
            <Text style={styles.exportTeaserHint}>Bientôt disponible — exportez cette séance directement vers votre montre</Text>
          </View>
        </View>

        {/* Partager son ressenti — visible pour tous, CTA premium si non abonné */}
        {!isCompleted && (
          <TouchableOpacity
            style={styles.feedbackCTACard}
            onPress={() => {
              if (user.isPremium || plan.fullPlanGenerated) {
                handleOpenFeedback();
              } else {
                Alert.alert(
                  'Fonctionnalité Premium',
                  "Partage ton ressenti après chaque séance et laisse l'IA adapter ton plan automatiquement. Disponible avec le Plan Premium.",
                  [{ text: 'Compris', style: 'default' }],
                );
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.feedbackCTAContent}>
              <Text style={styles.feedbackCTATitle}>Partager mon ressenti & adapter le plan</Text>
              <Text style={styles.feedbackCTAHint}>
                {user.isPremium
                  ? "Note ton effort, l'IA ajuste tes prochaines séances"
                  : "Fonctionnalité Premium — l'IA ajuste ton plan selon ton ressenti"}
              </Text>
            </View>
            {!user.isPremium && (
              <View style={styles.feedbackCTAPremiumBadge}>
                <Text style={styles.feedbackCTAPremiumText}>PREMIUM</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Feedback section — already completed */}
        {isCompleted && session.feedback && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Mon ressenti</Text>
            <View style={styles.rpeRow}>
              <Text style={styles.rpeLabel}>Effort perçu</Text>
              <Text style={styles.rpeValue}>{session.feedback.rpe}/10</Text>
            </View>
            {session.feedback.notes ? (
              <Text style={styles.feedbackNotes}>{session.feedback.notes}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.undoButton}
              onPress={handleUndoCompletion}
              disabled={saving}
            >
              <Text style={styles.undoButtonText}>En fait, je ne l'ai pas faite</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom action button */}
      {!isCompleted && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleOpenFeedback}
          >
            <Text style={styles.completeButtonText}>C'est fait !</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Comment s'est passée la séance ?</Text>

            {/* RPE Display */}
            <Text style={styles.rpeDisplay}>{rpe}</Text>
            <Text style={styles.rpeDisplayLabel}>Effort perçu (RPE)</Text>

            {/* RPE Buttons */}
            <View style={styles.rpeButtonsRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.rpeButton,
                    val === rpe && styles.rpeButtonActive,
                  ]}
                  onPress={() => setRpe(val)}
                >
                  <Text
                    style={[
                      styles.rpeButtonText,
                      val === rpe && styles.rpeButtonTextActive,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.rpeLabelsRow}>
              <Text style={styles.rpeLabelMin}>Facile</Text>
              <Text style={styles.rpeLabelMax}>Maximal</Text>
            </View>

            {/* Notes */}
            <Text style={styles.notesLabel}>Notes (optionnel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Comment vous êtes-vous senti ?"
              placeholderTextColor={Colors.textMuted}
              value={feedbackNotes}
              onChangeText={setFeedbackNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Adaptation toggle — visible pour tous, actif pour premium */}
            {plan.fullPlanGenerated ? (
              <View style={[styles.adaptationRow, !user.isPremium && { opacity: 0.6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adaptationLabel}>Adapter mon plan</Text>
                  <Text style={styles.adaptationHint}>
                    {user.isPremium
                      ? "L'IA ajustera les prochaines séances selon ton ressenti"
                      : "Fonctionnalité Premium — l'IA ajuste tes séances selon ton ressenti"}
                  </Text>
                </View>
                <Switch
                  value={user.isPremium ? adaptationRequested : false}
                  onValueChange={(v) => {
                    if (user.isPremium) {
                      setAdaptationRequested(v);
                    } else {
                      Alert.alert(
                        'Fonctionnalité Premium',
                        "L'adaptation du plan par l'IA est disponible avec le Plan Premium. Passez Premium pour que votre coach ajuste automatiquement vos séances selon votre ressenti.",
                        [{ text: 'Compris', style: 'default' }],
                      );
                    }
                  }}
                  trackColor={{ false: Colors.borderLight, true: Colors.accent + '60' }}
                  thumbColor={adaptationRequested && user.isPremium ? Colors.accent : '#f4f3f4'}
                />
              </View>
            ) : null}

            {/* Actions */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveFeedback}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowFeedbackModal(false)}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  header: {
    backgroundColor: Colors.white,
    padding: 20,
    borderBottomWidth: 3,
    ...Shadows.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '700',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateOverriddenText: {
    color: Colors.accent,
    fontWeight: '700',
  },
  dateModifiedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    backgroundColor: Colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dateEditIcon: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  datePickerContainer: {
    backgroundColor: Colors.bg,
    borderRadius: 12,
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  datePickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  datePickerDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 60,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  adviceCard: {
    backgroundColor: Colors.accentBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  adviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 6,
  },
  adviceContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...Shadows.sm,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  feedbackCTACard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    ...Shadows.sm,
  },
  feedbackCTAContent: { flex: 1 },
  feedbackCTATitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  feedbackCTAHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  feedbackCTAPremiumBadge: {
    backgroundColor: Colors.premiumGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  feedbackCTAPremiumText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.premiumBg,
    letterSpacing: 1,
  },
  exportTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    gap: 12,
    opacity: 0.7,
  },
  exportTeaserIcon: {
    fontSize: 24,
  },
  exportTeaserTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  exportTeaserHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  feedbackCard: {
    backgroundColor: Colors.successBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 8,
  },
  rpeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rpeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rpeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.success,
  },
  feedbackNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  undoButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  undoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completeButton: {
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.sm,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  rpeDisplay: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: 2,
  },
  rpeDisplayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rpeButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rpeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeButtonActive: {
    backgroundColor: Colors.accent,
  },
  rpeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  rpeButtonTextActive: {
    color: Colors.white,
  },
  rpeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rpeLabelMin: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  rpeLabelMax: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: Colors.bg,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    marginBottom: 20,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    ...Shadows.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  adaptationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  adaptationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  adaptationHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

export default SessionDetailScreen;
