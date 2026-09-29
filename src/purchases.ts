import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { ENTITLEMENT, RC_ANDROID_KEY, RC_DEBUG, RC_IOS_KEY } from './config';

let configured = false;

export function configurePurchases() {
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey || configured) return;
  if (RC_DEBUG) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  configured = true;
  if (RC_DEBUG) logSetup();
}

/** Debug only: writes the current offering and the active entitlements to the device log. */
async function logSetup() {
  Purchases.addCustomerInfoUpdateListener((info) =>
    console.log('[RC] active entitlements:', Object.keys(info.entitlements.active)),
  );
  try {
    const { current } = await Purchases.getOfferings();
    const packages = current?.availablePackages.map((p) => `${p.identifier} = ${p.product.identifier} ${p.product.priceString}`);
    console.log('[RC] current offering:', current?.identifier ?? 'none', packages ?? []);
  } catch (e) {
    console.log('[RC] getOfferings failed:', e);
  }
}

/** False until a RevenueCat API key is set in .env. */
export const purchasesReady = () => configured;

export const isPro = (info: CustomerInfo | null) => !!info?.entitlements.active[ENTITLEMENT];

export async function getCustomerInfo() {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function onCustomerInfo(cb: (info: CustomerInfo) => void) {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}

/** Shows the RevenueCat Paywall (designed in the dashboard). Returns true if the user is now Pro. */
export async function showPaywall(): Promise<boolean> {
  if (!configured) return false;
  try {
    const r = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT });
    return r === PAYWALL_RESULT.PURCHASED || r === PAYWALL_RESULT.RESTORED || r === PAYWALL_RESULT.NOT_PRESENTED;
  } catch {
    return false;
  }
}

export async function restore() {
  if (!configured) return false;
  return isPro(await Purchases.restorePurchases());
}

export async function openCustomerCenter() {
  if (!configured) return;
  await RevenueCatUI.presentCustomerCenter();
}
