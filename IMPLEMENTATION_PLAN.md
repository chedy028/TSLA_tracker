# TSLA Tracker: Code Review & MCP Implementation Plan

## Executive Summary

After thorough code exploration, I've identified **8 critical issues** requiring immediate attention, plus recommendations on MCP server adoption for improved developer workflow with Vercel, Supabase, and Stripe.

**Verdict on MCPs**: ✅ **YES - Strongly Recommended** (details in Section 3)

---

## Section 1: Critical Issues Found (Priority Order)

### 🔴 CRITICAL - Fix Immediately

#### 1.1 XSS Vulnerability in Chat Component
**File**: `src/components/chat/InlineChatBox.jsx:72-74`

**Issue**: Uses `dangerouslySetInnerHTML` with AI-generated content without sanitization:
```javascript
<div className="message-text" dangerouslySetInnerHTML={{
  __html: formatMessage(msg.content)
}} />
```

The `formatMessage()` function only does basic string replacements (bold, line breaks, emojis) but doesn't sanitize HTML/script tags.

**Risk**: If Gemini API response is compromised or contains malicious HTML, it will execute in user's browser.

**Fix**: Install and use `DOMPurify` library to sanitize HTML before rendering.

---

#### 1.2 Broken Error Handling Freezes UI
**File**: `src/hooks/useStockData.js:147-151`

**Issue**: `Promise.all` has no try/catch, causing permanent loading state on failure:
```javascript
const fetchAll = useCallback(async () => {
  setLoading(true)
  await Promise.all([fetchQuote(), fetchCandles(selectedRange)])
  setLoading(false)  // ❌ Never reached if Promise.all rejects
}, [fetchQuote, fetchCandles, selectedRange])
```

**Impact**: Any network failure freezes the entire dashboard UI.

**Fix**: Wrap in try/catch/finally block.

---

#### 1.3 API Key Exposure in Browser Console
**File**: `src/lib/gemini.js:10`

**Issue**: Logs first 10 characters of Gemini API key to console:
```javascript
console.log('Gemini API key loaded:', apiKey.substring(0, 10) + '...')
```

**Risk**: Partial key exposure in production browser console.

**Fix**: Remove this log or gate it behind `import.meta.env.DEV` check.

---

#### 1.4 No Git Repository
**Current State**: Directory is NOT a git repository.

**Risks**:
- No version control
- No rollback capability
- No collaboration workflow
- No deployment history
- Risk of data loss

**Fix**: Initialize git repo immediately, add `.gitignore` for `.env` and `node_modules`, commit all code.

---

### 🟠 HIGH PRIORITY - Fix Soon

#### 1.5 Third-Party CORS Proxy Dependency
**Files**: `src/hooks/useStockData.js:30`, `src/hooks/useCompanyFinancials.js:6`

**Issue**: Hardcoded public CORS proxy `https://corsproxy.io/?`:
- Single point of failure (no SLA)
- No rate limiting protection
- Privacy concern (all Yahoo Finance requests route through third party)
- Not configurable (hardcoded string)

**Fix Options**:
1. Create Supabase edge function for stock data fetching (recommended)
2. Move to env variable at minimum
3. Use Yahoo Finance API directly if available

---

#### 1.6 Missing Profile Creation for New Users
**File**: `src/hooks/useAuth.jsx:20-28`

**Issue**: When profile fetch fails (new user signup), returns `null` but never creates profile:
```javascript
const safeGetProfile = async (userId) => {
  try {
    const profileData = await getProfile(userId)
    return profileData
  } catch (err) {
    console.warn('Profile fetch failed (may be new user):', err)
    return null  // ❌ New users stuck with null profile
  }
}
```

**Impact**: New users may not be able to use the app if RLS policies require profile row.

**Fix**: Detect new user and call `createProfile()` function.

---

#### 1.7 Subscription Polling Race Condition
**File**: `src/App.jsx:42-92`

**Issue**: After Stripe checkout, polls for subscription status update but:
- First `pollSubscription()` call not awaited
- No exponential backoff (polls every 3 seconds for 30 seconds)
- Stale closure issues with interval callback

**Impact**: Users may see "subscription taking longer than expected" even when webhook succeeded.

**Fix**: Properly await first call, add exponential backoff, refactor interval logic.

---

#### 1.8 Alert Spam Risk (No Deduplication)
**Files**: `supabase/functions/send-alerts/index.ts`

**Issue**: Price/valuation alerts checked on cron schedule (every 15 min) but:
- No deduplication logic
- Will send email every 15 minutes while condition is true
- No "cooldown period" after sending alert

**Impact**: Users could receive 96 emails per day for same alert condition.

**Fix**: Add `last_sent_at` timestamp to `alert_settings` table, skip if sent within last 24 hours.

---

### 🟡 MEDIUM PRIORITY

#### 1.9 Hardcoded Values Should Be Config
- **Pricing**: `$1.99` intro (first month), then `$9.99/mo` — configured in `src/lib/stripe.js` and `src/components/landing/PricingSection.jsx`
- **Financial fallback data**: Q4 2024 TTM revenue/shares in `src/hooks/useCompanyFinancials.js:12-16`
- **Gemini model name**: `gemini-2.0-flash` hardcoded in `src/lib/gemini.js:208`
- **CORS proxy URL**: Hardcoded in 2 files

**Fix**: Move all to `src/config/constants.js` or environment variables.

---

#### 1.10 Dead Code
**File**: `src/App_new.jsx`

**Issue**:
- Alternate version of App.jsx with different routing structure
- Has 13 broken imports (uses default imports for named exports)
- Not referenced in `main.jsx` (App.jsx is active)
- Purpose unclear

**Options**:
1. Delete if unused/abandoned
2. Fix imports if it's a work-in-progress feature branch
3. Clarify purpose and document

---

#### 1.11 Excessive Console Logging (45+ instances)
- API key prefixes logged (`src/lib/gemini.js:10`)
- Checkout session data logged (`src/lib/stripe.js:62,80`)
- Auth flow logged throughout `src/hooks/useAuth.jsx`
- OAuth URLs logged (`src/lib/supabase.js:24-26`)

**Issue**: Helpful for debugging but may leak sensitive data in production builds.

**Fix**: Add `VITE_DEBUG_LOGGING` env var, gate all logs behind `import.meta.env.DEV || debugLogging` check.

---

## Section 2: Missing Configuration

### Environment Variables to Add
```bash
# New variables needed:
VITE_CORS_PROXY_URL=https://corsproxy.io/?
VITE_GEMINI_MODEL_NAME=gemini-2.0-flash
VITE_DEBUG_LOGGING=false

# For edge functions:
YAHOO_FINANCE_API_KEY=<if switching from CORS proxy>
```

### Vite Config Enhancements
**File**: `vite.config.js`

Currently minimal. Should add:
- Source map configuration (disable in production)
- Build optimizations
- Security headers
- Environment variable handling
- Error page configuration

---

## Section 3: MCP Server Implementation Recommendation

### What are MCPs (Model Context Protocol)?

MCPs are Claude-compatible servers that give me (Claude Code) direct access to external services like Supabase, Stripe, and Vercel. Think of them as "superpowers" that let me:
- Deploy edge functions without manual CLI commands
- Query your database directly
- Check Stripe webhook logs
- Manage environment variables
- View deployment logs

### Current Workflow (Manual)
```bash
# You have to manually run:
supabase functions deploy send-alerts
supabase secrets set RESEND_API_KEY=xxx
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
vercel env add VITE_STRIPE_PRICE_ID production
vercel deploy --prod
```

### With MCPs (Automated)
```
You: "Deploy the updated send-alerts function"
Claude: [Uses Supabase MCP to deploy automatically]

You: "Check why the webhook isn't working"
Claude: [Uses Stripe MCP to view recent webhook events, logs, and errors]

You: "What's in production right now?"
Claude: [Uses Vercel MCP to show deployed commit, env vars, build logs]
```

---

### 🎯 MCP Recommendation: **YES - Install All Three**

| MCP Server | Value | Priority | Reason |
|------------|-------|----------|---------|
| **Supabase MCP** | ⭐⭐⭐⭐⭐ | CRITICAL | You have 5 edge functions + migrations. Manual deployment is error-prone. I can deploy, query tables, check RLS policies, view function logs. |
| **Stripe MCP** | ⭐⭐⭐⭐☆ | HIGH | Payment issues are hard to debug. I can inspect webhook events, check subscription status, verify prices, see failed charges. |
| **Vercel MCP** | ⭐⭐⭐⭐☆ | HIGH | Currently no git repo. MCP lets me deploy, manage env vars, view build logs, rollback deployments. |

---

### MCP Installation Steps

#### 3.1 Install Supabase MCP
```bash
# Add to your MCP settings (~/.config/claude-code/mcp_settings.json):
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

**Features I'll gain**:
- Deploy edge functions: `deploy_function(name, code)`
- Query database: `query(sql)`
- Manage secrets: `set_secret(key, value)`
- View function logs: `get_function_logs(name)`
- Run migrations: `run_migration(sql)`

**Use cases for your project**:
- Fix alert spam by querying `alert_history` table
- Investigate missing profiles in `profiles` table
- Deploy updated edge functions after fixes
- Check webhook execution logs

---

#### 3.2 Install Stripe MCP
```bash
# Add to MCP settings:
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-stripe"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_live_..."
      }
    }
  }
}
```

**Features I'll gain**:
- List webhook events: `list_events(type)`
- Get subscription details: `get_subscription(id)`
- View customer info: `get_customer(id)`
- Check product/price configs: `get_price(id)`
- Inspect failed charges: `list_charges(status=failed)`

**Use cases for your project**:
- Debug subscription sync delays (check webhook delivery)
- Verify intro pricing ($1.99 first month, then $9.99/mo) price ID is correct
- Investigate failed payments
- Confirm webhook signature validation

---

#### 3.3 Install Vercel MCP
```bash
# Add to MCP settings:
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-vercel"],
      "env": {
        "VERCEL_TOKEN": "your-vercel-token"
      }
    }
  }
}
```

**Features I'll gain**:
- Deploy project: `deploy()`
- Manage env vars: `set_env(key, value, target)`
- View deployments: `list_deployments()`
- Check build logs: `get_deployment_logs(id)`
- Rollback: `promote_deployment(id)`

**Use cases for your project**:
- Once we set up git, deploy directly from Claude Code
- Update environment variables without Vercel dashboard
- Check production build errors
- Rollback if deployment breaks

---

### What MCPs Won't Help With

MCPs are **developer workflow tools**, not app architecture fixes. They won't:
- Fix the XSS vulnerability (still need code changes)
- Handle CORS proxy issue (still need backend solution)
- Solve alert spam (still need schema migration)
- Create git repo (I can do this with Bash tool)

**But they will make fixing these issues 10x faster** by letting me:
- Deploy fixes immediately
- Query database to verify fixes work
- Check logs to debug issues
- Manage secrets securely

---

## Section 4: Recommended Implementation Order

### Phase 1: Critical Stability Fixes (Day 1)
**Goal**: Make app stable and secure

1. ✅ Initialize git repository
   - Add `.gitignore` (exclude `.env`, `node_modules`, `dist`)
   - Initial commit of all code
   - Create `.env.example` template

2. 🔒 Fix XSS vulnerability
   - Install `dompurify`: `npm install dompurify`
   - Update `InlineChatBox.jsx` to sanitize HTML
   - Test with malicious payloads

3. 🐛 Fix UI freeze bug
   - Add try/catch/finally to `useStockData.js` `fetchAll()`
   - Test network failure scenarios

4. 🔑 Remove API key logging
   - Delete or gate behind `import.meta.env.DEV` check

**Estimated impact**: App becomes production-ready and secure.

---

### Phase 2: Install MCP Servers (Day 1-2)
**Goal**: Enable direct service management from Claude Code

1. Install Supabase MCP
2. Install Stripe MCP
3. Install Vercel MCP
4. Test each MCP with basic commands

**Estimated impact**: Development velocity increases 5-10x for deployments and debugging.

---

### Phase 3: High Priority Fixes (Day 2-3)
**Goal**: Improve reliability and user experience

1. 🌐 Fix CORS proxy dependency
   - Option A: Create Supabase edge function `fetch-stock-data` (recommended)
   - Option B: Move to env variable as stopgap

2. 👤 Fix new user profile creation
   - Add `createProfile()` call in `safeGetProfile()` on first login
   - Test with new OAuth signup

3. 🔄 Fix subscription polling race condition
   - Await first `pollSubscription()` call
   - Add exponential backoff
   - Add timeout of 60 seconds

4. 📧 Fix alert spam
   - Add `last_sent_at` column to `alert_settings` table
   - Update `send-alerts` edge function to check last send time
   - Skip if sent within 24 hours
   - Deploy updated function (using Supabase MCP!)

**Estimated impact**: Users have smooth signup and payment flow, no alert spam.

---

### Phase 4: Code Quality Improvements (Day 3-4)
**Goal**: Clean codebase, reduce technical debt

1. 📋 Move hardcoded values to config
   - Create comprehensive `src/config/constants.js`
   - Update all references
   - Document in CLAUDE.md

2. 🗑️ Remove dead code
   - Delete `App_new.jsx` (or fix and document purpose)
   - Remove unused `useSubscription.js` if confirmed dead

3. 🔇 Add debug logging flag
   - Add `VITE_DEBUG_LOGGING` env var
   - Gate all `console.log` calls behind flag
   - Update `.env.example`

4. ⚙️ Enhance Vite config
   - Disable source maps in production
   - Add build optimizations
   - Configure security headers

**Estimated impact**: Cleaner codebase, easier maintenance, better security.

---

### Phase 5: Testing & Documentation (Day 4-5)
**Goal**: Ensure fixes work and document changes

1. 🧪 Test all critical fixes
   - XSS sanitization with malicious inputs
   - Network failure handling
   - New user signup flow
   - Subscription sync after Stripe checkout
   - Alert deduplication

2. 📝 Update documentation
   - Document MCP setup in PRODUCTION_SETUP.md
   - Update CLAUDE.md with new env vars
   - Add troubleshooting guide
   - Document alert deduplication logic

3. 🚀 Deploy to production
   - Use Vercel MCP to deploy with new env vars
   - Monitor for errors
   - Test payment flow end-to-end

**Estimated impact**: Confidence in production stability, easier onboarding for future developers.

---

## Section 5: Files That Will Be Modified

### Phase 1 (Critical)
```
.gitignore                                    [CREATE]
.env.example                                  [CREATE]
src/components/chat/InlineChatBox.jsx         [EDIT] - Add DOMPurify
src/hooks/useStockData.js                     [EDIT] - Add try/catch
src/lib/gemini.js                             [EDIT] - Remove key logging
package.json                                  [EDIT] - Add dompurify
```

### Phase 2 (MCPs)
```
~/.config/claude-code/mcp_settings.json       [EDIT] - Add 3 MCP servers
```

### Phase 3 (High Priority)
```
supabase/functions/fetch-stock-data/          [CREATE] - New edge function
src/hooks/useStockData.js                     [EDIT] - Use new endpoint
src/hooks/useCompanyFinancials.js             [EDIT] - Use new endpoint
src/hooks/useAuth.jsx                         [EDIT] - Add profile creation
src/App.jsx                                   [EDIT] - Fix polling
supabase/migrations/002_add_alert_timestamps.sql [CREATE]
supabase/functions/send-alerts/index.ts       [EDIT] - Add deduplication
```

### Phase 4 (Code Quality)
```
src/config/constants.js                       [EDIT] - Add all hardcoded values
src/lib/stripe.js                             [EDIT] - Use constants
src/components/landing/PricingSection.jsx     [EDIT] - Use constants
src/lib/gemini.js                             [EDIT] - Use constants
src/App_new.jsx                               [DELETE]
src/hooks/useSubscription.js                  [DELETE if unused]
vite.config.js                                [EDIT] - Add security config
```

### Phase 5 (Documentation)
```
PRODUCTION_SETUP.md                           [EDIT] - Add MCP instructions
CLAUDE.md                                     [EDIT] - Update env vars
TROUBLESHOOTING.md                            [CREATE]
.env.example                                  [EDIT] - Add new vars
```

---

## Section 6: Permissions Needed

### Tool Permissions Required
- **Bash**: For git operations, npm installs, directory listing
- **Edit**: For modifying existing files
- **Write**: For creating new files (migrations, edge functions, configs)
- **Read**: For reading code to understand context
- **Glob/Grep**: For searching codebase

### External Permissions Required (from you)
- Supabase service role key (for MCP)
- Stripe secret key (for MCP)
- Vercel API token (for MCP)

---

## Section 7: Risks & Mitigation

### Risk 1: Breaking Production
**Mitigation**:
- All changes tested locally first
- Git repo allows instant rollback
- Use Vercel preview deployments before promoting to production
- Keep existing code as fallback during transitions

### Risk 2: MCP Configuration Issues
**Mitigation**:
- Test each MCP individually after installation
- Fall back to manual CLI if MCP fails
- MCPs are additive (don't break existing workflows)

### Risk 3: Database Migration Failures
**Mitigation**:
- Test migrations on Supabase staging project first
- Migrations are additive (add columns, don't drop)
- Can rollback via Supabase dashboard if needed

### Risk 4: Stripe Webhook Disruption
**Mitigation**:
- Test webhook changes with Stripe CLI locally
- Use Stripe test mode for validation
- Monitor webhook logs after deployment

---

## Section 8: Success Metrics

### After Phase 1
- ✅ No XSS warnings in security audit tools
- ✅ Stock data loads successfully after network errors
- ✅ No API keys visible in production console
- ✅ Git history shows all files committed

### After Phase 2
- ✅ Can deploy edge functions from Claude Code
- ✅ Can query Supabase database from Claude Code
- ✅ Can view Stripe events from Claude Code
- ✅ Can deploy to Vercel from Claude Code

### After Phase 3
- ✅ New users can sign up and use app immediately
- ✅ Subscription status syncs within 10 seconds of Stripe checkout
- ✅ Users receive max 1 alert per condition per 24 hours
- ✅ Stock data loads without third-party CORS proxy

### After Phase 4
- ✅ Zero hardcoded URLs or API keys in code
- ✅ Production console has zero debug logs
- ✅ Codebase has zero dead/unused files
- ✅ Vite build produces optimized, secure bundle

### After Phase 5
- ✅ All tests pass (XSS, network errors, signup, payments, alerts)
- ✅ Documentation is complete and accurate
- ✅ Production deployment successful with no errors
- ✅ End-to-end user flow works (signup → upgrade → alerts)

---

## Section 9: Open Questions

Before starting implementation, I need clarification on:

1. **App_new.jsx**: Should I delete it, or is it a work-in-progress feature?
2. **Current issues**: You mentioned having issues with the system — what specifically is broken right now? This will help me prioritize fixes.
3. **CORS proxy**: Would you prefer:
   - Option A: Supabase edge function (more control, better privacy)
   - Option B: Keep corsproxy.io but move to env var (quick fix)
4. **MCP priorities**: If you can only install one MCP initially, which is most urgent? (Supabase, Stripe, or Vercel)
5. **Production status**: Is this app live with paying customers? If yes, I'll add extra caution around payment/webhook changes.

---

## Conclusion

**TL;DR Recommendation:**

✅ **YES to MCPs** — Install all three (Supabase, Stripe, Vercel). They will 10x development speed and make debugging much easier.

🔴 **Critical fixes needed NOW**:
1. Initialize git repo
2. Fix XSS vulnerability
3. Fix UI freeze bug
4. Remove API key logging

🟠 **High priority fixes** (this week):
5. Fix CORS proxy dependency
6. Fix new user profile creation
7. Fix subscription polling
8. Fix alert spam

📈 **Expected outcomes**:
- Stable, secure production app
- 10x faster development workflow with MCPs
- Clean, maintainable codebase
- Proper version control with git

**Total estimated time**: 4-5 days for all phases, or 1 day for just Phase 1 + Phase 2 (critical fixes + MCPs).

Let me know which issues you want to tackle first, or if you have specific problems you're experiencing right now that should be prioritized!
