# Payment Methods Setup Guide

This guide explains how to enable PayPal and Apple Pay in your Stripe Checkout.

## Why PayPal and Apple Pay Aren't Showing

The code is correctly configured, but these payment methods need to be enabled in your Stripe Dashboard. They won't appear until you complete the setup steps below.

---

## 🔵 PayPal Setup

### Step 1: Enable PayPal in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Payment methods**
3. Find **PayPal** under the "Wallets" section
4. Click **"Turn on"** or **"Activate"**
5. Complete any required PayPal account setup/verification

### Step 2: Check Regional Availability

⚠️ **Important**: PayPal via Stripe is currently only available for:
- **EEA countries** (excluding Hungary)
- **United Kingdom**
- **Switzerland**

If your Stripe business account is registered in another country (like the United States), PayPal may not be available via Stripe yet.

### Step 3: Verify Currency Compatibility

- All line items in your checkout must use the same currency
- PayPal supports most major currencies (GBP, EUR, USD, etc.)

### Step 4: Test PayPal

After enabling:
1. Create a new checkout session
2. PayPal button should appear above the card form
3. Test with a PayPal sandbox account

---

## 🍎 Apple Pay Setup

### Step 1: Enable Apple Pay in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Payment methods**
3. Find **Apple Pay** under the "Wallets" section
4. Click **"Configure"** or **"Turn on"**

### Step 2: Domain Verification (Required for Production)

For production (HTTPS sites):
1. In Apple Pay settings, add your domain
2. Stripe will provide a domain association file
3. Host this file at: `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
4. Verify the domain in Stripe Dashboard

For development (localhost):
- Apple Pay works in test mode without domain verification
- But you must test on Safari (iOS/macOS) or Chrome (iOS)

### Step 3: Device and Browser Requirements

Apple Pay **only appears** when:
- ✅ Using **Safari on iOS/macOS** OR **Chrome on iOS**
- ✅ User has at least one card in their Apple Wallet
- ✅ Site is served over HTTPS (or localhost for testing)
- ✅ Apple Pay is enabled in Stripe Dashboard

Apple Pay **will NOT appear** on:
- ❌ Chrome/Firefox on Windows/Linux
- ❌ Chrome/Firefox on Android
- ❌ Desktop browsers other than Safari

### Step 4: Test Apple Pay

1. Open your checkout page on **Safari** (macOS) or **Safari/Chrome** (iOS)
2. Ensure you have a card in your Apple Wallet
3. Apple Pay button should appear above the card form

---

## ✅ Verification Checklist

### PayPal
- [ ] PayPal enabled in Stripe Dashboard > Settings > Payment methods
- [ ] Business account is in supported region (EEA, UK, or Switzerland)
- [ ] PayPal account setup completed
- [ ] Testing on a supported browser/device
- [ ] Code includes `payment_method_types: ['card', 'paypal']` ✅ (Already done)

### Apple Pay
- [ ] Apple Pay enabled in Stripe Dashboard > Settings > Payment methods
- [ ] Domain verified (for production) or testing on localhost
- [ ] Testing on Safari (iOS/macOS) or Chrome (iOS)
- [ ] User has a card in Apple Wallet
- [ ] Site is served over HTTPS (or localhost)
- [ ] Code doesn't need `apple_pay` in `payment_method_types` ✅ (Correctly configured)

---

## 🧪 Testing

### Test PayPal
1. Enable PayPal in Stripe Dashboard
2. Create a checkout session
3. Look for the yellow "PayPal" button above the card form
4. Click it to test with a PayPal sandbox account

### Test Apple Pay
1. Enable Apple Pay in Stripe Dashboard
2. Open checkout page on **Safari** (macOS) or **Safari/Chrome** (iOS)
3. Ensure you have a card in Apple Wallet
4. Look for the Apple Pay button (black button with Apple logo)
5. It should appear above the card form

---

## 🐛 Troubleshooting

### PayPal Not Showing

**Check:**
1. Is PayPal enabled in Stripe Dashboard?
2. Is your business account in a supported region?
3. Are you using test mode? (PayPal works in test mode)
4. Check Stripe Dashboard > Payment methods for any error messages

**Solution:**
- Enable PayPal in Stripe Dashboard
- If not available in your region, consider using Stripe's alternative payment methods

### Apple Pay Not Showing

**Check:**
1. Are you testing on Safari (iOS/macOS) or Chrome (iOS)?
2. Is Apple Pay enabled in Stripe Dashboard?
3. Do you have a card in your Apple Wallet?
4. Is the site served over HTTPS? (or localhost for testing)

**Solution:**
- Enable Apple Pay in Stripe Dashboard
- Test on a supported device/browser
- Verify domain for production sites

---

## 📝 Current Code Configuration

Your code is correctly configured:

```typescript
// lib/stripe/checkout.ts
payment_method_types: ['card', 'paypal'], // ✅ PayPal explicitly enabled
// Apple Pay is automatic - doesn't need to be in this array ✅
```

The code is ready. You just need to enable these payment methods in your Stripe Dashboard!

---

## 🔗 Quick Links

- [Stripe Payment Methods Settings](https://dashboard.stripe.com/settings/payment_methods)
- [Stripe PayPal Documentation](https://docs.stripe.com/payments/paypal)
- [Stripe Apple Pay Documentation](https://docs.stripe.com/payments/apple-pay)
- [PayPal Regional Availability](https://docs.stripe.com/payments/paypal/supported-locales)
