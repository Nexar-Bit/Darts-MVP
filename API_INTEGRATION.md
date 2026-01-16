# API Integration Documentation

This document describes all API integration points for the Dart Throw Analysis Platform.

## Overview

The application integrates with multiple external services:
- **Supabase**: Authentication, database, and storage
- **Stripe**: Payment processing and subscriptions
- **AI Backend**: Video analysis processing (optional)

## API Endpoints

### Internal API Routes (Next.js)

All internal API routes are located in `/app/api/` and handle server-side operations.

#### Authentication & User Management

##### `POST /api/verify-session`
Verifies Stripe checkout sessions and updates user subscription status.

**Request:**
```typescript
{
  sessionId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  profile?: {
    is_paid: boolean;
    stripe_customer_id?: string;
    plan_type?: string;
  };
}
```

**Integration Points:**
- Called after Stripe checkout redirect
- Updates Supabase `profiles` table
- Returns updated user profile

---

##### `GET /api/health`
Simple health check endpoint.

**Response:**
```typescript
{
  status: "ok";
  timestamp: number;
}
```

---

#### Video Analysis

##### `POST /api/analyze`
Handles video upload and analysis job creation.

**Request:**
- `multipart/form-data` with:
  - `side_video`: File (optional)
  - `front_video`: File (optional)
  - `model`: string (default: 'gpt-5-mini')

**Response:**
```typescript
{
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
}
```

**Integration Points:**
- Validates user authentication
- Checks subscription status (`is_paid`)
- Enforces usage limits
- Creates job in Supabase `jobs` table
- Forwards to AI backend (if configured)
- Returns job ID for polling

**Error Responses:**
- `401`: Unauthorized
- `403`: Subscription required or limit reached
- `400`: Invalid file or missing required fields
- `500`: Server error

---

##### `GET /api/jobs`
Retrieves user's analysis jobs.

**Query Parameters:**
- `limit`: number (default: 10)
- `offset`: number (default: 0)

**Response:**
```typescript
{
  jobs: Array<{
    job_id: string;
    status: string;
    created_at_unix: number;
    original_filename?: string;
    throws_detected?: number;
    error_message?: string;
  }>;
  total: number;
}
```

**Integration Points:**
- Queries Supabase `jobs` table
- Filters by authenticated user
- Returns paginated results

---

##### `GET /api/jobs/[jobId]`
Retrieves specific job status and results.

**Response:**
```typescript
{
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
  progress?: number;
  stage?: string;
  result?: {
    overlay_video_url?: string;
    scorecard?: any;
    coaching_plan?: any;
    pdf_url?: string;
  };
  error_message?: string;
  created_at_unix: number;
}
```

**Integration Points:**
- Queries Supabase `jobs` table
- Verifies user ownership
- Returns job status and results

---

#### Payment Processing

##### `POST /api/create-checkout-session`
Creates a Stripe Checkout session.

**Request:**
```typescript
{
  priceId: string;
  mode: "payment" | "subscription";
}
```

**Response:**
```typescript
{
  sessionId: string;
  url: string;
}
```

**Integration Points:**
- Creates Stripe Checkout session
- Links session to user (via metadata)
- Returns checkout URL

---

##### `POST /api/create-portal-session`
Creates a Stripe Customer Portal session.

**Response:**
```typescript
{
  url: string;
}
```

**Integration Points:**
- Creates Stripe Customer Portal session
- Returns portal URL for subscription management

---

##### `POST /api/webhook`
Handles Stripe webhook events.

**Request:**
- Stripe webhook event payload
- `stripe-signature` header for verification

**Events Handled:**
- `checkout.session.completed`: Updates user subscription status
- `customer.subscription.created`: Creates subscription record
- `customer.subscription.updated`: Updates subscription status
- `customer.subscription.deleted`: Cancels subscription
- `invoice.payment_succeeded`: Confirms payment
- `invoice.payment_failed`: Handles failed payments

**Integration Points:**
- Verifies webhook signature
- Updates Supabase `profiles` table
- Handles subscription lifecycle

---

#### API Proxy Routes

##### `POST /api/proxy/analyze`
Proxies video upload requests to AI backend.

**Request:**
- `multipart/form-data` with video files
- `Authorization: Bearer <token>` header

**Response:**
```typescript
{
  job_id: string;
  status: string;
}
```

**Integration Points:**
- Validates authentication
- Adds user context to request
- Forwards to `NEXT_PUBLIC_API_BASE_URL/analyze`
- Returns backend response

**CORS Headers:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-API-Key`

---

##### `GET /api/proxy/jobs/[jobId]`
Proxies job status requests to AI backend with caching.

**Request:**
- `Authorization: Bearer <token>` header

**Response:**
```typescript
{
  job_id: string;
  status: string;
  progress?: number;
  stage?: string;
  result?: any;
}
```

**Integration Points:**
- Validates authentication
- Caches responses (5 seconds TTL)
- Forwards to `NEXT_PUBLIC_API_BASE_URL/jobs/{jobId}`
- Returns cached or fresh response

**Cache Headers:**
- `X-Cache: HIT` or `X-Cache: MISS`

---

## External API Integrations

### Supabase

#### Authentication
- **Endpoint**: `https://{project}.supabase.co/auth/v1/`
- **Methods**: Sign up, sign in, sign out, password reset
- **Configuration**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Database
- **Endpoint**: `https://{project}.supabase.co/rest/v1/`
- **Tables Used**:
  - `profiles`: User profiles and subscription status
  - `jobs`: Analysis job records
- **Configuration**: `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

#### Storage
- **Endpoint**: `https://{project}.supabase.co/storage/v1/`
- **Buckets**: (if using Supabase storage for videos)

**Integration Points:**
- Client-side: `lib/supabase/supabaseClient.ts`
- Server-side: `lib/supabase/supabaseServer.ts`
- Database operations: `lib/supabase/database.ts`

---

### Stripe

#### Checkout
- **Endpoint**: `https://api.stripe.com/v1/checkout/sessions`
- **Configuration**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

#### Customer Portal
- **Endpoint**: `https://api.stripe.com/v1/billing_portal/sessions`
- **Configuration**: `STRIPE_SECRET_KEY`

#### Webhooks
- **Endpoint**: `https://your-domain.com/api/webhook`
- **Configuration**: `STRIPE_WEBHOOK_SECRET`
- **Events**: See webhook route documentation above

**Integration Points:**
- Checkout: `lib/stripe/checkout.ts`
- Customer Portal: `lib/stripe/customerPortal.ts`
- Webhooks: `lib/stripe/webhooks.ts`

---

### AI Backend (Optional)

#### Video Analysis
- **Endpoint**: `{NEXT_PUBLIC_API_BASE_URL}/analyze`
- **Method**: `POST`
- **Request**: `multipart/form-data` with video files
- **Response**: `{ job_id: string }`

#### Job Status
- **Endpoint**: `{NEXT_PUBLIC_API_BASE_URL}/jobs/{jobId}`
- **Method**: `GET`
- **Response**: Job status and results

**Configuration:**
- `NEXT_PUBLIC_API_BASE_URL`: Frontend API base URL
- `AI_BACKEND_URL`: Server-side backend URL (optional)
- `AI_BACKEND_API_KEY`: Backend API key (optional)

**Integration Points:**
- API Client: `lib/api/client.ts`
- Analysis functions: `lib/api/analysis.ts`
- Proxy routes: `app/api/proxy/`

---

## Authentication Flow

### Client-Side Authentication
1. User signs up/logs in via Supabase Auth
2. Supabase returns access token
3. Token stored in browser session
4. Token included in API requests: `Authorization: Bearer <token>`

### Server-Side Authentication
1. API route receives request with `Authorization` header
2. Token validated with Supabase
3. User ID extracted from token
4. User context added to database queries

**Implementation:**
- Client: `lib/supabase/supabaseClient.ts`
- Server: `lib/supabase/supabaseServer.ts`

---

## Error Handling

### API Error Format
```typescript
{
  error: string;
  message?: string;
  statusCode?: number;
}
```

### Error Categories
- **Network Errors**: Connection failures, timeouts
- **Authentication Errors**: Invalid/missing tokens (401)
- **Authorization Errors**: Insufficient permissions (403)
- **Validation Errors**: Invalid input (400)
- **Server Errors**: Backend failures (500)

**Error Handling:**
- Client: `lib/utils/errorHandler.ts`
- API Client: `lib/api/client.ts`
- Components: `components/dashboard/ErrorDisplay.tsx`

---

## CORS Configuration

### Vercel Headers
Configured in `vercel.json`:
```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-ID, X-API-Key, Accept",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400"
}
```

### API Route CORS
All API routes include CORS headers:
- `/api/proxy/*`: Full CORS support
- `/api/*`: Standard CORS headers

---

## Rate Limiting

Currently not implemented. Consider adding:
- Per-user rate limits
- Per-IP rate limits
- API key rate limits (for backend)

---

## Security Considerations

### Implemented
- ✅ Authentication required for all API routes
- ✅ User context isolation (users can only access their own data)
- ✅ Webhook signature verification
- ✅ CORS headers configured
- ✅ Environment variables secured
- ✅ HTTPS enforced (Vercel)

### Best Practices
- ⚠️ Never expose service role keys to client
- ⚠️ Validate all user input
- ⚠️ Sanitize error messages
- ⚠️ Monitor for abuse
- ⚠️ Log authentication failures
- ⚠️ Implement rate limiting (future)

---

## Testing API Endpoints

### Local Testing
```bash
# Health check
curl http://localhost:3000/api/health

# With authentication
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/jobs
```

### Production Testing
```bash
# Health check
curl https://your-domain.com/api/health

# With authentication
curl -H "Authorization: Bearer <token>" https://your-domain.com/api/jobs
```

### Stripe Webhook Testing
```bash
# Local testing with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhook

# Send test event
stripe trigger checkout.session.completed
```

---

## Monitoring

### Vercel Function Logs
- View in Vercel Dashboard → Deployments → Function Logs
- Monitor execution times
- Check for errors

### Stripe Dashboard
- Monitor webhook deliveries
- Check payment success rates
- Review customer subscriptions

### Supabase Dashboard
- Monitor database queries
- Check authentication logs
- Review storage usage

---

## Troubleshooting

### Common Issues

**Issue**: CORS errors
- **Solution**: Check `vercel.json` headers and API route CORS configuration

**Issue**: Authentication fails
- **Solution**: Verify token format and Supabase configuration

**Issue**: Webhook not receiving events
- **Solution**: Check webhook URL and signing secret

**Issue**: Backend API errors
- **Solution**: Verify `NEXT_PUBLIC_API_BASE_URL` and backend availability

---

## Summary

The application integrates with:
1. **Supabase**: Authentication, database, storage
2. **Stripe**: Payments, subscriptions, webhooks
3. **AI Backend**: Video analysis (optional)

All integrations are secured with authentication, error handling, and proper CORS configuration. API routes are documented and tested for production use.
