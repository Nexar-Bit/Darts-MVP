# Backend Solutions Summary

## Quick Reference

Two solutions to fix the 30-second headers timeout issue:

1. **Configure CORS** → Enable direct uploads from frontend (Recommended)
2. **Return 202 Accepted** → Process files asynchronously

---

## Solution 1: Configure CORS (Recommended)

**Best for:** Immediate fix, better performance, no proxy needed

**What it does:**
- Allows browser to upload directly to backend
- Bypasses Next.js proxy entirely
- No timeout limitations

**See:** `BACKEND_CORS_SETUP.md` for detailed instructions

**Quick Start:**
1. Add CORS middleware to your backend
2. Update frontend to use direct upload endpoint
3. Test with browser console

**Time to implement:** 15-30 minutes

---

## Solution 2: Return 202 Accepted

**Best for:** Long-running processing, better user experience

**What it does:**
- Backend accepts upload quickly
- Returns 202 Accepted immediately
- Processes files in background
- Client polls for status

**See:** `BACKEND_202_ACCEPTED_SETUP.md` for detailed instructions

**Quick Start:**
1. Modify upload endpoint to return 202
2. Queue job for background processing
3. Update status endpoint for polling
4. Update frontend to handle 202 response

**Time to implement:** 1-2 hours (depending on queue setup)

---

## Which Solution Should You Use?

### Use CORS (Solution 1) if:
- ✅ You want the quickest fix
- ✅ Your backend can handle uploads quickly
- ✅ You want better performance (no proxy hop)
- ✅ You're comfortable configuring CORS

### Use 202 Accepted (Solution 2) if:
- ✅ Your processing takes a long time (>30 seconds)
- ✅ You want better user experience (immediate feedback)
- ✅ You already have a queue system (Celery, Bull, etc.)
- ✅ You want to scale processing across workers

### Use Both (Recommended):
- ✅ Configure CORS for direct uploads
- ✅ Return 202 Accepted for immediate response
- ✅ Process asynchronously in background
- ✅ Best of both worlds!

---

## Implementation Checklist

### CORS Configuration
- [ ] Identify backend technology (FastAPI, Express, nginx, etc.)
- [ ] Add CORS middleware/configuration
- [ ] Set allowed origins (production + development)
- [ ] Configure allowed headers and methods
- [ ] Test preflight requests (OPTIONS)
- [ ] Update frontend to use direct upload
- [ ] Test with browser console
- [ ] Deploy and verify

### 202 Accepted Implementation
- [ ] Modify upload endpoint to save files quickly
- [ ] Return 202 Accepted with job_id
- [ ] Set up background task queue (Celery, Bull, etc.)
- [ ] Implement job status storage (DB/Redis)
- [ ] Create status endpoint (GET /status/{job_id})
- [ ] Update frontend to handle 202 response
- [ ] Implement status polling
- [ ] Test end-to-end flow

---

## Testing

### Test CORS
```bash
# Test preflight
curl -X OPTIONS https://api.prodartscoach.com/upload \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should return 204 with CORS headers
```

### Test 202 Accepted
```bash
# Upload file
curl -X POST https://api.prodartscoach.com/upload \
  -F "side_video=@test.mp4" \
  -F "user_id=test" \
  -F "job_id=test-123" \
  -v

# Should return 202 Accepted
# Then poll status
curl https://api.prodartscoach.com/status/test-123
```

---

## Next Steps

1. **Read the detailed guides:**
   - `BACKEND_CORS_SETUP.md` - CORS configuration
   - `BACKEND_202_ACCEPTED_SETUP.md` - Async processing

2. **Choose your approach:**
   - Quick fix → CORS only
   - Best solution → Both CORS + 202 Accepted

3. **Implement and test:**
   - Start with CORS (easier)
   - Add 202 Accepted if needed

4. **Update frontend:**
   - Switch to direct uploads
   - Handle 202 responses
   - Implement status polling

---

## Support

If you need help:
1. Check the detailed guides
2. Review code examples
3. Test with curl first
4. Check browser console for CORS errors
5. Verify backend logs
