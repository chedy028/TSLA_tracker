# Landing Page Integration Guide

## Quick Setup

Add these changes to your `src/App.jsx`:

### 1. Add Import at the top of the file:

```jsx
import { LandingPage } from './components/landing';
```

### 2. Add Landing Page Route

In your Routes configuration, add a route for the landing page as the home route:

```jsx
<Routes>
  {/* Landing Page - Public home route */}
  <Route path="/" element={<LandingPage />} />

  {/* Your existing routes below */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/auth/callback" element={<AuthCallback />} />
  {/* ... other routes ... */}
</Routes>
```

### 3. Optional: Redirect authenticated users

If you want to redirect already logged-in users to the dashboard:

```jsx
<Route
  path="/"
  element={user ? <Navigate to="/dashboard" /> : <LandingPage />}
/>
```

## File Structure Created

```
src/components/landing/
├── index.js           # Exports all components
├── LandingPage.jsx    # Main container
├── LandingPage.css    # All styles
├── HeroSection.jsx    # Hero with CTAs
├── FeaturesSection.jsx # Feature grid
├── FeatureCard.jsx    # Individual feature card
├── PricingSection.jsx # Pricing comparison
└── FooterCTA.jsx      # Footer with CTA
```

## Testing

After integration, run:

```bash
npm run dev
```

Then visit `http://localhost:5173` to see the landing page.
