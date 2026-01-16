# Testing Implementation Guide

## Overview

This guide covers testing strategies and implementation for the Darts MVP application, including unit tests, integration tests, API tests, and end-to-end tests.

---

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [API Tests](#api-tests)
5. [Component Tests](#component-tests)
6. [E2E Tests](#e2e-tests)
7. [Manual Testing Checklist](#manual-testing-checklist)
8. [Test Data Setup](#test-data-setup)

---

## Testing Setup

### Required Dependencies

```bash
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  jest-environment-jsdom \
  @types/jest \
  ts-jest \
  msw \
  @playwright/test
```

### Jest Configuration

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### Jest Setup File

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Supabase client
jest.mock('@/lib/supabase/supabaseClient', () => ({
  createSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}))
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Unit Tests

### Example: Utility Functions

Create `lib/utils/__tests__/utils.test.ts`:

```typescript
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});
```

### Example: API Client

Create `lib/api/__tests__/client.test.ts`:

```typescript
import { apiClient, ApiError } from '@/lib/api/client';

// Mock fetch
global.fetch = jest.fn();

describe('apiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('makes GET request with correct headers', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('throws ApiError on failed request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
    });
  });

  describe('post', () => {
    it('makes POST request with body', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await apiClient.post('/test', { key: 'value' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'value' }),
        })
      );
      expect(result).toEqual({ success: true });
    });
  });
});
```

---

## Integration Tests

### Example: API Routes

Create `app/api/analyze/__tests__/route.test.ts`:

```typescript
import { POST } from '@/app/api/analyze/route';
import { NextRequest } from 'next/server';
import { createSupabaseServerClientWithAuth } from '@/lib/supabase/supabaseServer';

jest.mock('@/lib/supabase/supabaseServer');

describe('/api/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without authorization header', async () => {
    const request = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('returns 403 for unpaid users', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockProfile = { is_paid: false };

    (createSupabaseServerClientWithAuth as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    });

    // Mock profile fetch
    const mockSupabaseServer = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      })),
    };

    const request = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    // Mock FormData
    const formData = new FormData();
    formData.append('side_video', new Blob(['test'], { type: 'video/mp4' }), 'test.mp4');

    // This test would need more setup for FormData handling
    // For now, it demonstrates the structure
  });
});
```

---

## API Tests

### Using MSW (Mock Service Worker)

Create `__mocks__/handlers.ts`:

```typescript
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/analyze', async (req, res, ctx) => {
    const formData = await req.formData();
    const sideVideo = formData.get('side_video');

    if (!sideVideo) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'No video file provided' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({ job_id: 'test-job-id' })
    );
  }),

  rest.get('/api/jobs/:jobId', (req, res, ctx) => {
    const { jobId } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        job_id: jobId,
        status: 'done',
        progress: 1,
        result: {
          overlay_url: '/test-overlay.mp4',
        },
      })
    );
  }),
];
```

Create `__mocks__/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Update `jest.setup.js`:

```javascript
import { server } from './__mocks__/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Component Tests

### Example: Button Component

Create `components/ui/__tests__/Button.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
    // Check for loading spinner
  });
});
```

### Example: UploadCard Component

Create `components/dashboard/__tests__/UploadCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadCard from '@/components/dashboard/UploadCard';
import { validateUploadFile } from '@/components/dashboard/UploadCard';

describe('UploadCard', () => {
  it('renders upload area when no file selected', () => {
    render(
      <UploadCard
        label="Test Video"
        hint="Upload a video"
        file={null}
        setFile={jest.fn()}
        busy={false}
        validate={validateUploadFile}
      />
    );

    expect(screen.getByText('Test Video')).toBeInTheDocument();
    expect(screen.getByText('Upload a video')).toBeInTheDocument();
  });

  it('shows file name when file is selected', () => {
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    render(
      <UploadCard
        label="Test Video"
        hint="Upload a video"
        file={file}
        setFile={jest.fn()}
        busy={false}
        validate={validateUploadFile}
      />
    );

    expect(screen.getByText('test.mp4')).toBeInTheDocument();
  });

  it('validates file size', async () => {
    const largeFile = new File(['x'.repeat(500 * 1024 * 1024)], 'large.mp4', {
      type: 'video/mp4',
    });

    const result = await validateUploadFile(largeFile);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('too large');
  });
});
```

---

## E2E Tests

### Playwright Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example E2E Test

Create `e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('user redirected to pricing if not paid', async ({ page }) => {
    // Setup: Login as unpaid user
    await page.goto('/login');
    // ... login steps
    
    await page.goto('/dashboard/analyze');
    await expect(page).toHaveURL(/\/pricing/);
  });
});
```

Create `e2e/upload.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Video Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login as paid user
    await page.goto('/login');
    // ... login steps
  });

  test('user can upload video', async ({ page }) => {
    await page.goto('/dashboard/analyze');
    
    // Create a test video file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake video content'),
    });
    
    await page.click('button:has-text("Start Analysis")');
    
    // Wait for job to be created
    await expect(page.locator('text=Processing')).toBeVisible();
  });
});
```

---

## Manual Testing Checklist

### Authentication & Authorization

- [ ] User can register new account
- [ ] User can login with email/password
- [ ] User can logout
- [ ] Unauthenticated user redirected to login
- [ ] Unpaid user redirected to pricing
- [ ] Paid user can access dashboard
- [ ] User can access billing page without payment

### Video Upload

- [ ] User can select video file
- [ ] User can drag and drop video
- [ ] File validation works (size, type, duration)
- [ ] Error messages display correctly
- [ ] Upload progress shows during upload
- [ ] Job ID returned after upload

### Analysis Flow

- [ ] Job status updates correctly
- [ ] Progress messages display
- [ ] Analysis completes successfully
- [ ] Results display correctly
- [ ] Error handling works for failed jobs
- [ ] User can cancel analysis

### Results Display

- [ ] Video overlay displays correctly
- [ ] Scorecard shows all metrics
- [ ] Coaching plan displays correctly
- [ ] PDF download works
- [ ] Previous results comparison works

### Job History

- [ ] Job list displays correctly
- [ ] Filtering by status works
- [ ] Search functionality works
- [ ] Pagination works
- [ ] Delete functionality works
- [ ] Click to view details works

### Billing & Subscription

- [ ] Pricing page displays correctly
- [ ] User can purchase starter plan
- [ ] User can purchase monthly plan
- [ ] Stripe checkout works
- [ ] Webhook updates profile correctly
- [ ] Customer portal works
- [ ] Usage limits enforced correctly

---

## Test Data Setup

### Test Users

Create `tests/fixtures/users.ts`:

```typescript
export const testUsers = {
  unpaid: {
    email: 'unpaid@test.com',
    password: 'test123',
    is_paid: false,
  },
  paid: {
    email: 'paid@test.com',
    password: 'test123',
    is_paid: true,
    plan_type: 'monthly',
    analysis_limit: 12,
  },
};
```

### Database Seeds

Create `tests/fixtures/seed.sql`:

```sql
-- Insert test users
INSERT INTO auth.users (id, email, encrypted_password)
VALUES 
  ('test-user-unpaid', 'unpaid@test.com', 'encrypted-password'),
  ('test-user-paid', 'paid@test.com', 'encrypted-password');

-- Insert test profiles
INSERT INTO profiles (id, email, is_paid)
VALUES 
  ('test-user-unpaid', 'unpaid@test.com', false),
  ('test-user-paid', 'paid@test.com', true);
```

---

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- UploadCard.test.tsx
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- auth.spec.ts
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Summary

This testing guide provides:

1. **Unit Tests** - Test individual functions and utilities
2. **Integration Tests** - Test API routes and database interactions
3. **Component Tests** - Test React components in isolation
4. **E2E Tests** - Test complete user flows
5. **Manual Testing Checklist** - Comprehensive manual test cases
6. **CI/CD Integration** - Automated testing in pipelines

Start with unit tests for critical functions, then add integration tests for API routes, component tests for UI, and E2E tests for complete flows.
