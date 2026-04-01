import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Shadows } from '../theme/colors';
import { UserGoal, RunningLevel, QuestionnaireData, User } from '../types';
import DurationPicker from '../components/DurationPicker';
import {
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  ROAD_DISTANCES,
  WEEK_DAYS,
  MIN_SESSIONS_PER_WEEK,
  MAX_SESSIONS_PER_WEEK,
  DEFAULT_SESSIONS_PER_WEEK,
} from '../constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuestionnaireScreenProps {
  user: User | null;
  onBack: () => void;
  onLogin?: () => void;
  onSubmit: (
    data: QuestionnaireData,
    firstName: string,
    email: string,
    password: string,
  ) => void;
  isGenerating: boolean;
  processingStep?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_TITLES = ['Objectif', 'Course', 'Chronos & Santé', 'Profil physique', 'Finalisation'];
const TOTAL_STEPS = 5;


const FITNESS_SUBGOALS = [
  'Courir régulièrement',
  'Améliorer mon cardio',
  'Rester actif / bien-être',
  'Reprendre après une pause',
];

const CGV_URL = 'https://coachrunningia.fr/cgv';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const durationToString = (val: string) => {
  if (!val) return undefined;
  const parts = val.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    if (s > 0) return `${m}:${String(s).padStart(2, '0')}`;
    return `${m}:00`;
  }
  return val;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({
  user,
  onBack,
  onLogin,
  onSubmit,
  isGenerating,
  processingStep,
}) => {
  // Step tracking
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);

  // Step 1 — Objectif
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [subGoal, setSubGoal] = useState<string>('');
  const [trailDistance, setTrailDistance] = useState('');
  const [trailElevation, setTrailElevation] = useState('');
  const [weightLossSubGoal, setWeightLossSubGoal] = useState('');
  const [fitnessSubGoal, setFitnessSubGoal] = useState('');

  // Step 2 — Course (date, temps visé, ville)
  const [raceDate, setRaceDate] = useState<Date | undefined>(undefined);
  const [showRaceDatePicker, setShowRaceDatePicker] = useState(false);
  const [targetTime, setTargetTime] = useState('');
  const [city, setCity] = useState('');

  // Step 3 — Chronos & Santé
  const [hasInjury, setHasInjury] = useState(false);
  const [injuryDescription, setInjuryDescription] = useState('');
  const [time5km, setTime5km] = useState('');
  const [time10km, setTime10km] = useState('');
  const [timeSemi, setTimeSemi] = useState('');
  const [timeMarathon, setTimeMarathon] = useState('');
  const [weeklyVolume, setWeeklyVolume] = useState('');
  const [comments, setComments] = useState('');
  const [showVolumeError, setShowVolumeError] = useState(false);

  // Step 4 — Profil physique
  const [sex, setSex] = useState<'Homme' | 'Femme' | undefined>(undefined);
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [level, setLevel] = useState<RunningLevel | null>(null);

  // Step 5 — Finalisation
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [frequency, setFrequency] = useState(DEFAULT_SESSIONS_PER_WEEK);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredLongRunDay, setPreferredLongRunDay] = useState('Dimanche');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedCGV, setAcceptedCGV] = useState(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        if (!goal) return false;
        if (goal === UserGoal.ROAD_RACE && !subGoal) return false;
        // Perte de poids : pas de sous-objectif requis
        if (goal === UserGoal.FITNESS && !fitnessSubGoal) return false;
        // Trail : pas de sous-objectif obligatoire à sélectionner (distance/dénivelé ont des defaults)
        return true;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return level !== null;
      case 5:
        if (!user) {
          return (
            firstName.trim().length > 0 &&
            isValidEmail(email.trim()) &&
            password.length >= 6 &&
            acceptedCGV
          );
        }
        return acceptedCGV;
      default:
        return true;
    }
  };

  const getStepHint = (): string | null => {
    if (canGoNext()) return null;
    switch (step) {
      case 1:
        if (!goal) return 'Sélectionnez un objectif pour continuer';
        if (goal === UserGoal.ROAD_RACE && !subGoal) return 'Sélectionnez une distance';
        // Perte de poids : pas de hint car pas de sous-objectif
        if (goal === UserGoal.FITNESS && !fitnessSubGoal) return 'Précisez votre objectif forme';
        return null;
      case 4:
        return 'Sélectionnez votre niveau de course';
      case 5: {
        if (!user) {
          if (!firstName.trim()) return 'Renseignez votre prénom';
          if (!email.trim()) return 'Renseignez votre email';
          if (email.trim() && !isValidEmail(email.trim())) return 'Format email invalide';
          if (password.length < 6) return 'Mot de passe : 6 caractères minimum';
          if (!acceptedCGV) return 'Veuillez accepter les CGV';
        } else {
          if (!acceptedCGV) return 'Veuillez accepter les CGV';
        }
        return null;
      }
      default:
        return null;
    }
  };

  const handleNext = () => {
    // Validation volume obligatoire step 3 pour Course/Trail
    if (step === 3 && (goal === UserGoal.ROAD_RACE || goal === UserGoal.TRAIL)) {
      if (!weeklyVolume && weeklyVolume !== '0') {
        setShowVolumeError(true);
        return;
      }
    }
    setShowVolumeError(false);
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
    } else {
      onBack();
    }
  };

  const handleSubmit = () => {
    const data: QuestionnaireData = {
      goal,
      level,
      frequency,
      preferredDays,
      sex,
      age: age ? parseInt(age, 10) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseInt(height, 10) : undefined,
      city: city || undefined,
      startDate: formatDate(startDate),
      raceDate: raceDate ? formatDate(raceDate) : undefined,
      targetTime: durationToString(targetTime),
      comments: comments || undefined,
      preferredLongRunDay: preferredLongRunDay || 'Dimanche',
      currentWeeklyVolume: weeklyVolume ? parseFloat(weeklyVolume) : undefined,
      injuries: {
        hasInjury,
        description: hasInjury ? injuryDescription : undefined,
      },
      recentRaceTimes: {
        distance5km: durationToString(time5km),
        distance10km: durationToString(time10km),
        distanceHalfMarathon: durationToString(timeSemi),
        distanceMarathon: durationToString(timeMarathon),
      },
    };

    // Goal-specific fields
    if (goal === UserGoal.ROAD_RACE) {
      data.subGoal = subGoal || undefined;
    } else if (goal === UserGoal.TRAIL) {
      data.trailDetails = {
        distance: trailDistance ? parseInt(trailDistance, 10) : 0,
        elevation: trailElevation ? parseInt(trailElevation, 10) : 0,
      };
    } else if (goal === UserGoal.FITNESS) {
      data.fitnessSubGoal = fitnessSubGoal || undefined;
    }

    onSubmit(data, firstName.trim(), email.trim(), password);
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>
          Étape {step}/{TOTAL_STEPS}
        </Text>
        <Text style={styles.progressTitle}>{STEP_TITLES[step - 1]}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>
    </View>
  );

  const renderCard = (children: React.ReactNode) => (
    <View style={[styles.card, Shadows.md]}>{children}</View>
  );

  const renderSectionTitle = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderOptionButton = (
    label: string,
    isSelected: boolean,
    onPress: () => void,
    subtitle?: string,
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{label}</Text>
      {subtitle ? (
        <Text style={[styles.optionSub, isSelected && styles.optionSubSelected]}>{subtitle}</Text>
      ) : null}
    </TouchableOpacity>
  );

  const renderTextInput = (
    placeholder: string,
    value: string,
    onChangeText: (t: string) => void,
    opts?: { keyboardType?: 'default' | 'numeric' | 'email-address'; secure?: boolean; multiline?: boolean },
  ) => (
    <TextInput
      style={[styles.input, opts?.multiline && styles.inputMultiline]}
      placeholder={placeholder}
      placeholderTextColor={Colors.textPlaceholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={opts?.keyboardType ?? 'default'}
      secureTextEntry={opts?.secure}
      multiline={opts?.multiline}
      autoCapitalize={opts?.keyboardType === 'email-address' ? 'none' : 'sentences'}
    />
  );

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  const renderStep1 = () => (
    <View>
      {renderCard(
        <>
          {renderSectionTitle('Quel est votre objectif ?')}
          {GOAL_OPTIONS.map((opt) =>
            renderOptionButton(opt.label, goal === opt.value, () => {
              setGoal(opt.value);
              setSubGoal('');
              setWeightLossSubGoal('');
              setFitnessSubGoal('');
            }),
          )}
          {/* Hint */}
          {step === 1 && getStepHint() && (
            <Text style={styles.hintText}>{getStepHint()}</Text>
          )}
        </>,
      )}

      {/* Sous-objectif : Course sur route */}
      {goal === UserGoal.ROAD_RACE && (
        <View style={{ marginTop: 16 }}>
          {renderCard(
            <>
              {renderSectionTitle('Quelle distance ?')}
              {ROAD_DISTANCES.map((d) =>
                renderOptionButton(d, subGoal === d, () => {
                  setSubGoal(d);
                }),
              )}
            </>,
          )}
        </View>
      )}

      {/* Sous-objectif : Trail */}
      {goal === UserGoal.TRAIL && (
        <View style={{ marginTop: 16 }}>
          {renderCard(
            <>
              {renderSectionTitle('Détails du trail')}

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Distance (km)</Text>
                {renderTextInput(
                  'Ex : 30',
                  trailDistance,
                  setTrailDistance,
                  { keyboardType: 'numeric' },
                )}
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Dénivelé (m D+)</Text>
                {renderTextInput(
                  'Ex : 1000',
                  trailElevation,
                  setTrailElevation,
                  { keyboardType: 'numeric' },
                )}
              </View>
            </>,
          )}
        </View>
      )}

      {/* Sous-objectif : Forme */}
      {goal === UserGoal.FITNESS && (
        <View style={{ marginTop: 16 }}>
          {renderCard(
            <>
              {renderSectionTitle('Votre objectif forme')}
              {FITNESS_SUBGOALS.map((sg) =>
                renderOptionButton(sg, fitnessSubGoal === sg, () => {
                  setFitnessSubGoal(sg);
                }),
              )}
            </>,
          )}
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View>
      {/* Date de la course — route & trail uniquement */}
      {(goal === UserGoal.ROAD_RACE || goal === UserGoal.TRAIL) &&
        renderCard(
          <>
            {renderSectionTitle('Date de la course')}
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowRaceDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateButtonText, !raceDate && { color: Colors.textPlaceholder }]}>
                {raceDate ? formatDateDisplay(raceDate) : 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>
            {showRaceDatePicker && (
              <DateTimePicker
                value={raceDate || new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000)}
                mode="date"
                display="spinner"
                minimumDate={new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000)}
                locale="fr-FR"
                onChange={(_, selectedDate) => {
                  setShowRaceDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setRaceDate(selectedDate);
                }}
              />
            )}
          </>,
        )}

      {/* Temps visé */}
      {(goal === UserGoal.ROAD_RACE || goal === UserGoal.TRAIL) && (
        <View style={{ marginTop: 16 }}>
          {renderCard(
            <>
              {renderSectionTitle('Temps visé')}
              <DurationPicker
                label="Temps visé"
                placeholder="Sélectionner un temps"
                value={targetTime}
                onChange={setTargetTime}
                showHours={true}
                showSeconds={false}
              />
            </>,
          )}
        </View>
      )}

      {/* Ville */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle('Ville d\'entraînement')}
            {renderTextInput('Ex : Paris, Lyon...', city, setCity)}
          </>,
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      {/* Blessures */}
      {renderCard(
        <>
          {renderSectionTitle('Blessures')}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Avez-vous une blessure ?</Text>
            <Switch
              value={hasInjury}
              onValueChange={setHasInjury}
              trackColor={{ false: Colors.border, true: Colors.accentLight }}
              thumbColor={hasInjury ? Colors.accent : Colors.textMuted}
            />
          </View>
          {hasInjury &&
            renderTextInput(
              'Décrivez votre blessure...',
              injuryDescription,
              setInjuryDescription,
              { multiline: true },
            )}
        </>,
      )}

      {/* Chronos récents */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle('Vos chronos récents')}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>5 km</Text>
              <DurationPicker
                label="Temps 5 km"
                placeholder="Ex : 25min 30s"
                value={time5km}
                onChange={setTime5km}
                showHours={false}
                showSeconds={true}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>10 km</Text>
              <DurationPicker
                label="Temps 10 km"
                placeholder="Ex : 52min 00s"
                value={time10km}
                onChange={setTime10km}
                showHours={true}
                showSeconds={true}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Semi-marathon</Text>
              <DurationPicker
                label="Temps semi-marathon"
                placeholder="Ex : 1h 55min"
                value={timeSemi}
                onChange={setTimeSemi}
                showHours={true}
                showSeconds={false}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Marathon</Text>
              <DurationPicker
                label="Temps marathon"
                placeholder="Ex : 4h 10min"
                value={timeMarathon}
                onChange={setTimeMarathon}
                showHours={true}
                showSeconds={false}
              />
            </View>
          </>,
        )}
      </View>

      {/* Volume hebdomadaire — OBLIGATOIRE pour Course/Trail */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle(
              (goal === UserGoal.ROAD_RACE || goal === UserGoal.TRAIL)
                ? 'Combien de km courez-vous par semaine ? *'
                : 'Volume hebdomadaire actuel (km)',
            )}
            {renderTextInput(
              'Ex : 20 (0 si débutant)',
              weeklyVolume,
              (t) => { setWeeklyVolume(t); setShowVolumeError(false); },
              { keyboardType: 'numeric' },
            )}
            {showVolumeError && (
              <Text style={{ color: Colors.error, fontSize: 12, marginTop: 6 }}>
                Le volume hebdomadaire est obligatoire. Si vous ne courez pas encore, indiquez 0.
              </Text>
            )}
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
              Essentiel pour calibrer votre plan. Si vous débutez, indiquez 0.
            </Text>
          </>,
        )}
      </View>

      {/* Commentaires */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle('Commentaires libres (optionnel)')}
            {renderTextInput(
              'Informations supplémentaires...',
              comments,
              setComments,
              { multiline: true },
            )}
          </>,
        )}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      {/* Sexe */}
      {renderCard(
        <>
          {renderSectionTitle('Sexe')}
          <View style={styles.rowButtons}>
            {renderOptionButton('Homme', sex === 'Homme', () => setSex('Homme'))}
            {renderOptionButton('Femme', sex === 'Femme', () => setSex('Femme'))}
          </View>
        </>,
      )}

      {/* Âge */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle('Âge')}
            {renderTextInput('Ex : 35', age, setAge, { keyboardType: 'numeric' })}
          </>,
        )}
      </View>

      {/* Poids & Taille */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle('Mensurations')}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Poids (kg)</Text>
              {renderTextInput('70', weight, setWeight, { keyboardType: 'numeric' })}
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Taille (cm)</Text>
              {renderTextInput('175', height, setHeight, { keyboardType: 'numeric' })}
            </View>
          </>,
        )}
      </View>

      {/* Niveau */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle('Niveau de course')}
            {LEVEL_OPTIONS.map((opt) =>
              renderOptionButton(opt.label, level === opt.value, () => {
                setLevel(opt.value);
                // Débutant : max 2 séances/semaine
                if (opt.value === RunningLevel.BEGINNER && frequency > 2) {
                  setFrequency(2);
                }
              }, opt.sub),
            )}
            {step === 4 && getStepHint() && (
              <Text style={styles.hintText}>{getStepHint()}</Text>
            )}
          </>,
        )}
      </View>

      {/* Avertissement médical */}
      <View style={styles.medicalWarning}>
        <Text style={styles.medicalWarningIcon}>⚕️</Text>
        <Text style={styles.medicalWarningText}>
          Avant de reprendre ou de commencer une activité sportive, nous vous recommandons de consulter un médecin, notamment pour obtenir un certificat médical d'aptitude au sport.
        </Text>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View>
      {/* Date de début */}
      {renderCard(
        <>
          {renderSectionTitle('Date de début du plan')}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateButtonText}>
              {formatDateDisplay(startDate)}
            </Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              locale="fr-FR"
              onChange={(_, selectedDate) => {
                setShowStartDatePicker(Platform.OS === 'ios');
                if (selectedDate) setStartDate(selectedDate);
              }}
            />
          )}
        </>,
      )}

      {/* Fréquence */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle(`Séances par semaine : ${frequency}`)}
            <View style={styles.frequencyRow}>
              <TouchableOpacity
                style={styles.frequencyButton}
                onPress={() => setFrequency(Math.max(MIN_SESSIONS_PER_WEEK, frequency - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.frequencyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.frequencyValue}>{frequency}</Text>
              <TouchableOpacity
                style={styles.frequencyButton}
                onPress={() => setFrequency(Math.min(level === RunningLevel.BEGINNER ? 2 : MAX_SESSIONS_PER_WEEK, frequency + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.frequencyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            {level === RunningLevel.BEGINNER && (
              <Text style={[styles.hintText, { marginTop: 8, color: Colors.accent }]}>
                2 séances/semaine max recommandées pour les débutants
              </Text>
            )}
            <Text style={[styles.hintText, { marginTop: 8 }]}>
              1 séance sera dédiée au renforcement musculaire. Les autres seront de la course à pied ({frequency - 1} running + 1 renfo).
            </Text>
          </>,
        )}
      </View>

      {/* Jours préférés */}
      <View style={{ marginTop: 16 }}>
        {renderCard(
          <>
            {renderSectionTitle('Jours préférés')}
            <View style={styles.daysGrid}>
              {WEEK_DAYS.map((day) => {
                const selected = preferredDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, selected && styles.dayChipSelected]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>,
        )}
      </View>

      {/* Jour de la sortie longue */}
      {(goal === UserGoal.ROAD_RACE || goal === UserGoal.TRAIL) && frequency >= 3 && (
        <View style={{ marginTop: 16 }}>
          {renderCard(
            <>
              {renderSectionTitle('Jour de la sortie longue')}
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 10 }}>
                La sortie longue est la séance clé de ta semaine. Choisis le jour où tu as le plus de temps.
              </Text>
              <View style={styles.daysGrid}>
                {WEEK_DAYS.map((day) => {
                  const selected = preferredLongRunDay === day;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, selected && styles.dayChipSelected]}
                      onPress={() => setPreferredLongRunDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                        {day.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>,
          )}
        </View>
      )}

      {/* Création de compte — uniquement si non connecté */}
      {!user && (
        <View style={{ marginTop: 16 }}>
          {renderCard(
            <>
              {renderSectionTitle('Créer votre compte')}
              {renderTextInput('Prénom', firstName, setFirstName)}
              <View style={{ height: 12 }} />
              {renderTextInput('Email', email, setEmail, { keyboardType: 'email-address' })}
              <View style={{ height: 12 }} />
              {renderTextInput('Mot de passe (6 car. min)', password, setPassword, { secure: true })}

              {onLogin && (
                <TouchableOpacity style={styles.loginLink} onPress={onLogin} activeOpacity={0.7}>
                  <Text style={styles.loginLinkText}>
                    {'Déjà un compte ? '}
                    <Text style={styles.loginLinkAccent}>Se connecter</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </>,
          )}
        </View>
      )}

      {/* CGV */}
      <View style={{ marginTop: 16 }}>
        <TouchableOpacity
          style={styles.cgvRow}
          onPress={() => setAcceptedCGV(!acceptedCGV)}
          activeOpacity={0.7}
        >
          <View style={[styles.cgvCheckbox, acceptedCGV && styles.cgvCheckboxChecked]}>
            {acceptedCGV && <Text style={styles.cgvCheckmark}>{'✓'}</Text>}
          </View>
          <Text style={styles.cgvText}>
            {'En créant mon plan, j\'accepte les '}
            <Text
              style={styles.cgvLink}
              onPress={() => Linking.openURL(CGV_URL)}
            >
              Conditions Générales de Vente
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hint step 5 */}
      {getStepHint() && (
        <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
          <Text style={styles.hintText}>{getStepHint()}</Text>
        </View>
      )}

      {/* Générer */}
      <View style={{ marginTop: 24 }}>
        <TouchableOpacity
          style={[styles.submitButton, (!canGoNext() || isGenerating) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canGoNext() || isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator color={Colors.white} size="small" />
              <Text style={styles.submitButtonText}>
                {processingStep ?? 'Génération en cours...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Générer mon plan</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Barre de progression */}
      {renderProgressBar()}

      {/* Contenu scrollable */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Pied de page navigation */}
      {step < TOTAL_STEPS && (
        <View style={styles.footerWrapper}>
          {getStepHint() && (
            <Text style={styles.footerHint}>{getStepHint()}</Text>
          )}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButton} onPress={handlePrev} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, !canGoNext() && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={!canGoNext()}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Suivant</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === TOTAL_STEPS && (
        <View style={styles.footerWrapper}>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButton} onPress={handlePrev} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {/* Overlay de chargement */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingTitle}>
              {processingStep || 'Génération en cours...'}
            </Text>
            <Text style={styles.loadingSubtitle}>Ne ferme pas l'application</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Barre de progression
  progressContainer: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  progressTitle: { fontSize: 13, color: Colors.accent, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.borderLight, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.accent },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },

  // Card
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.borderLight },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },

  // Options
  optionButton: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, backgroundColor: Colors.white,
  },
  optionButtonSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentBg },
  optionLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  optionLabelSelected: { color: Colors.accentDark },
  optionSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  optionSubSelected: { color: Colors.accentDark },
  rowButtons: { flexDirection: 'row', gap: 10 },

  // Input
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.textPrimary, backgroundColor: Colors.white,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

  // Date button
  dateButton: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14, backgroundColor: Colors.white,
  },
  dateButtonText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },

  // Fréquence
  frequencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  frequencyButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  frequencyButtonText: { fontSize: 22, fontWeight: '700', color: Colors.white },
  frequencyValue: { fontSize: 28, fontWeight: '800', color: Colors.accent, minWidth: 40, textAlign: 'center' },

  // Jours
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: Colors.white,
  },
  dayChipSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  dayChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  dayChipTextSelected: { color: Colors.white },

  // Switch
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontSize: 15, color: Colors.textPrimary, flex: 1 },

  // Champs
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },

  // Hint
  hintText: { fontSize: 13, color: Colors.warning, fontWeight: '600', marginTop: 10 },

  // Medical warning
  medicalWarning: {
    marginTop: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  medicalWarningIcon: { fontSize: 20, marginTop: 2 },
  medicalWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
  },

  // Footer
  footerWrapper: {
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerHint: {
    fontSize: 13, color: Colors.warning, fontWeight: '600',
    textAlign: 'center', paddingTop: 10, paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backButton: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  backButtonText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  nextButton: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12, backgroundColor: Colors.accent },
  nextButtonText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  buttonDisabled: { opacity: 0.45 },

  // Submit
  submitButton: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Login link
  loginLink: { marginTop: 16, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: Colors.textSecondary },
  loginLinkAccent: { color: Colors.accent, fontWeight: '700' },

  // CGV
  cgvRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4 },
  cgvCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: Colors.border, backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  cgvCheckboxChecked: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  cgvCheckmark: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  cgvText: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },
  cgvLink: { color: Colors.accent, fontWeight: '600', textDecorationLine: 'underline' },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  loadingCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 32, alignItems: 'center', marginHorizontal: 40 },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 16, textAlign: 'center' },
  loadingSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },
});

export default QuestionnaireScreen;
