/**
 * Tests platformService — mode iOS natif simulé.
 *
 * Mock @capacitor/core pour tester le path iOS natif (par défaut Vitest tourne
 * en jsdom = pas de Capacitor = isNativePlatform=false).
 *
 * Vérifie :
 * - Avec mock iOS : isIOSNative=true, platform='ios', canShowPaidCTA=false
 * - Avec mock Android : isAndroidNative=true, platform='android'
 *
 * NB : ces tests valident la couche de détection. Les composants React qui
 * en dépendent (PricingPage, ProfilePage, NativeOnlyRoute, etc.) sont
 * validés visuellement en simulateur Xcode (cf CHECKLIST-IOS-SIMULATEUR.md).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('platformService — mock iOS natif', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isNativePlatform=true + getPlatform=ios → isIOSNative=true, canShowPaidCTA=false', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'ios',
      },
    }));
    const mod = await import('../platformService');
    expect(mod.isNative).toBe(true);
    expect(mod.platform).toBe('ios');
    expect(mod.isIOSNative).toBe(true);
    expect(mod.isAndroidNative).toBe(false);
    expect(mod.canShowPaidCTA()).toBe(false);
  });

  it('isNativePlatform=true + getPlatform=android → isAndroidNative=true, canShowPaidCTA=true', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      },
    }));
    const mod = await import('../platformService');
    expect(mod.isNative).toBe(true);
    expect(mod.platform).toBe('android');
    expect(mod.isIOSNative).toBe(false);
    expect(mod.isAndroidNative).toBe(true);
    // Android n'a pas la même contrainte 3.1.1 que iOS → CTA paiement autorisé
    expect(mod.canShowPaidCTA()).toBe(true);
  });

  it('Capacitor lève une exception (env web sans Capacitor) → fallback safe (isNative=false)', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => { throw new Error('Capacitor not available'); },
        getPlatform: () => { throw new Error('Capacitor not available'); },
      },
    }));
    const mod = await import('../platformService');
    expect(mod.isNative).toBe(false);
    expect(mod.platform).toBe('web');
    expect(mod.isIOSNative).toBe(false);
    expect(mod.canShowPaidCTA()).toBe(true);
  });
});
