/**
 * Tests platformService.ts — détection plateforme + Apple 3.1.1 helpers.
 *
 * Note : ces tests tournent en environnement Vitest/jsdom (Capacitor n'est pas
 * initialisé). Par défaut Capacitor.isNativePlatform() retourne false et
 * getPlatform() retourne 'web'. C'est l'invariant qu'on verrouille ici.
 *
 * Pour tester les paths iOS natifs / Android natifs, il faudrait mocker
 * @capacitor/core — fait dans les tests d'intégration UI dédiés.
 */

import { describe, it, expect } from 'vitest';
import {
  isNative,
  platform,
  isIOSNative,
  isAndroidNative,
  canShowPaidCTA,
} from '../platformService';

describe('platformService — environnement test (= web)', () => {
  it('isNative est false en environnement de test', () => {
    expect(isNative).toBe(false);
  });

  it('platform est "web" en environnement de test', () => {
    expect(platform).toBe('web');
  });

  it('isIOSNative est false en environnement de test', () => {
    expect(isIOSNative).toBe(false);
  });

  it('isAndroidNative est false en environnement de test', () => {
    expect(isAndroidNative).toBe(false);
  });

  it('canShowPaidCTA retourne true en environnement web (Stripe autorisé)', () => {
    // Apple 3.1.1 ne s'applique qu'à iOS natif. Sur web on autorise Stripe.
    expect(canShowPaidCTA()).toBe(true);
  });
});
