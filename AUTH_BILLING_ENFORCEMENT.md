# Auth & Billing Enforcement Documentation

## Overview

This document describes the server-side authentication and billing enforcement mechanisms implemented to protect dashboard routes and API endpoints.

---

## 1. Middleware Protection (`middleware.ts`)

### Purpose
Server-side enforcement of authentication and subscription status for all dashboard routes.

### Features

#### ✅ Authentication Check
- Validates access token from Authorization header or cookies
- Verifies user identity with Supabase
- Handles cases where token is in localStorage (client-side fallback)

#### ✅ Subscription Status Check
- Checks `is_paid` status for protected routes
- Redirects unpaid users to `/pricing` with redirect parameter
- Allows access to public routes: `/dashboard/billing`, `/dashboard/profile`, `/dashboard/settings`

#### ✅ Route Protection
- Protects all `/dashboard/*` routes
- Excludes public routes from payment check
- Provides redirect URL for post-purchase return

### Flow

```
Request to /dashboard/*
    ↓
Check Authorization Header/Cookies
    ↓
Verify User Authentication
    ↓
Is Public Route? (billing/profile/settings)
    ├─ Yes → Allow Access
    └─ No → Check is_paid Status
            ├─ Paid → Allow Access
            └─ Not Paid → Redirect to /pricing?redirect=/dashboard/...
```

### Code Example

```typescript
// Middleware automatically runs on all /dashboard/* routes
// No code changes needed in pages - protection is automatic
```

### Public Routes (No Payment Required)
- `/dashboard/billing` - Manage subscription
- `/dashboard/profile` - User profile
- `/dashboard/settings` - Account settings

### Protected Routes (Payment Required)
- `/dashboard` - Main dashboard
- `/dashboard/analyze` - Video analysis
- `/dashboard/analyze/[jobId]` - Analysis results
- All other dashboard routes

---

## 2. API Route Protection (`app/api/analyze/route.ts`)

### Purpose
Server-side protection for the analysis API endpoint with comprehensive validation.

### Features

#### ✅ Step 1: Authentication Validation
- Validates Authorization header format
- Extracts and validates Bearer token
- Returns 401 if authentication fails

#### ✅ Step 2: User Verification
- Verifies token with Supabase
- Extracts user ID from token
- Returns 401 if user not found

#### ✅ Step 3: Profile & Subscription Check
- Fetches user profile from database
- Checks `is_paid` status
- Returns 403 if not subscribed

#### ✅ Step 4: Usage Limits Validation
- Checks `analysis_limit` vs `analysis_count`
- Validates remaining quota
- Returns 403 if limit reached

#### ✅ Step 5: Backend Forwarding
- Includes `user_id` in all backend requests
- Adds `X-User-ID` header for backend tracking
- Includes authorization token for backend verification
- Includes user email for notifications (optional)

### Request Flow

```
POST /api/analyze
    ↓
[Step 1] Validate Authorization Header
    ↓
[Step 2] Verify User Authentication
    ↓
[Step 3] Check Subscription Status (is_paid)
    ↓
[Step 4] Validate Usage Limits
    ↓
[Step 5] Forward to Backend with user_id
    ↓
Return job_id
```

### Error Responses

| Status | Error Code | Description |
|--------|-----------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `SUBSCRIPTION_REQUIRED` | User not subscribed |
| 403 | `LIMIT_REACHED` | Analysis quota exhausted |
| 404 | `PROFILE_NOT_FOUND` | User profile missing |
| 500 | `SERVER_ERROR` | Internal server error |

### Code Example

```typescript
// API route automatically validates:
// 1. Authentication
// 2. Subscription status
// 3. Usage limits
// 4. Forwards with user_id

const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData,
});
```

---

## 3. User ID Forwarding

### Purpose
Ensure all backend API calls include user context for tracking and user-specific processing.

### Implementation

#### FormData Fields
```typescript
backendFormData.append('user_id', user.id);        // Required
backendFormData.append('user_email', user.email);  // Optional
backendFormData.append('job_id', jobId);            // Required
backendFormData.append('model', model);             // Required
```

#### HTTP Headers
```typescript
headers: {
  'X-User-ID': user.id,                    // For backend tracking
  'Authorization': `Bearer ${token}`,       // For backend verification
  'X-API-Key': process.env.AI_BACKEND_API_KEY, // If configured
}
```

### Benefits
- Backend can track usage per user
- Backend can implement user-specific rate limiting
- Backend can send user-specific notifications
- Backend can enforce user-specific quotas
- Backend can audit user actions

---

## 4. Security Layers

### Defense in Depth

1. **Middleware** (First Layer)
   - Server-side route protection
   - Checks authentication and subscription
   - Redirects unauthorized users

2. **API Route** (Second Layer)
   - Validates every API request
   - Checks subscription status
   - Validates usage limits
   - Returns appropriate errors

3. **Client-Side** (Third Layer)
   - `ProtectedRoute` component
   - Additional client-side checks
   - User-friendly error messages

### Why Multiple Layers?

- **Middleware**: Fast server-side protection, prevents unnecessary page loads
- **API Route**: Validates actual API calls, prevents bypassing UI
- **Client-Side**: Provides better UX, handles localStorage sessions

---

## 5. Testing

### Test Cases

#### ✅ Authentication Tests
- [ ] Missing token → 401 Unauthorized
- [ ] Invalid token → 401 Unauthorized
- [ ] Expired token → 401 Unauthorized
- [ ] Valid token → 200 OK

#### ✅ Subscription Tests
- [ ] Unpaid user → 403 Forbidden
- [ ] Paid user → 200 OK
- [ ] Missing profile → 404 Not Found

#### ✅ Usage Limit Tests
- [ ] Limit reached → 403 Forbidden
- [ ] Quota available → 200 OK
- [ ] Limit reset → 200 OK

#### ✅ Backend Forwarding Tests
- [ ] user_id included in FormData
- [ ] X-User-ID header present
- [ ] Authorization header forwarded
- [ ] Backend receives correct user context

---

## 6. Environment Variables

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional
```env
AI_BACKEND_URL=https://your-backend.com
AI_BACKEND_API_KEY=your-api-key
```

---

## 7. Troubleshooting

### Issue: Users can access dashboard without payment

**Solution**: Check middleware is running:
1. Verify `middleware.ts` exists in project root
2. Check `matcher` config includes `/dashboard/:path*`
3. Verify Supabase cookies are being read correctly

### Issue: API returns 401 even with valid token

**Solution**: Check token format:
1. Ensure `Authorization: Bearer <token>` format
2. Verify token is not expired
3. Check Supabase client configuration

### Issue: Backend not receiving user_id

**Solution**: Verify forwarding:
1. Check FormData includes `user_id`
2. Verify `X-User-ID` header is set
3. Check backend logs for received data

---

## 8. Best Practices

### ✅ Do
- Always validate authentication server-side
- Check subscription status on every request
- Include user_id in all backend calls
- Return clear error messages
- Log authentication failures

### ❌ Don't
- Rely only on client-side checks
- Skip subscription validation
- Expose service role key to client
- Trust user-provided user_id
- Return sensitive error details

---

## 9. Future Enhancements

### Potential Improvements
- [ ] Rate limiting per user
- [ ] IP-based rate limiting
- [ ] Audit logging for API calls
- [ ] Webhook verification for backend
- [ ] Caching for profile checks
- [ ] Token refresh handling

---

## Summary

The authentication and billing enforcement system provides:

1. **Server-side protection** via middleware
2. **API route validation** for all requests
3. **User context forwarding** to backend
4. **Multiple security layers** for defense in depth
5. **Clear error responses** for debugging

All dashboard routes and API endpoints are now protected with server-side enforcement, ensuring only paid users can access analysis features.
