# MaintMENA - Industrial Intelligence & Marketplace Platform

**Production-Ready Deployment Guide**

## 🎯 Platform Overview

MaintMENA is a two-pillar platform for MENA facilities management:

### Intelligence Pillar
- **Signals**: Early maintenance opportunities and industry movements
- **Tenders**: Official procurement opportunities with deadlines
- **Briefs**: Weekly intelligence reports with actionable insights

### Marketplace Pillar
- **RFQ Posting**: Buyers post maintenance requests
- **Quote Management**: Vendors submit competitive bids
- **Vendor Profiles**: Verified service providers with ratings

---

## 💰 Subscription Tiers

| Tier | Price | Intelligence | Marketplace | Key Features |
|------|-------|--------------|-------------|--------------|
| **Free** (Trial) | 14 days | Limited preview | View only | Onboarding & exploration |
| **Basic** | $9/mo | 10 signals, 5 tenders, 3 briefs/week | 3 RFQs/month | Essential access |
| **Premium** | $39/mo | Unlimited | Unlimited | Full platform + analytics |
| **Team** | Custom | Unlimited + white-label | Multi-user | Dedicated support |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Lovable Cloud account (Supabase backend included)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables (Auto-configured)
```
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
VITE_SUPABASE_PROJECT_ID=<auto-configured>
```

---

## 📊 Database Schema

### Core Tables
- `profiles` - User information and preferences
- `subscriptions` - Subscription tiers and trial management
- `user_roles` - Role-based access (buyer/seller/admin)
- `signals` - Early maintenance opportunities
- `tenders` - Official procurement opportunities
- `briefs` - Weekly intelligence reports
- `maintenance_requests` - Buyer RFQ posts
- `quote_submissions` - Vendor quotes/bids
- `messages` - In-platform messaging
- `notifications` - User notifications
- `tracked_items` - Saved signals/tenders
- `calendar_events` - Deadline tracking

### Sample Data Included
- 5 realistic signals with deadlines
- 5 active tenders across categories
- 1 weekly intelligence brief
- Active 14-day trial subscription

---

## 🎨 Design System

### Color Tokens (HSL)
```css
--accent: Primary brand color (intelligence)
--accent-2: Secondary brand color (marketplace)
--ink: Main text color
--paper: Background color
--muted: Subtle backgrounds
--rule: Border colors
```

### Component Structure
- All colors use semantic tokens from `index.css`
- Tailwind config extends with design system
- shadcn/ui components customized per brand
- Responsive breakpoints: sm, md, lg, xl

---

## 🔐 Authentication & Security

### User Onboarding Flow
1. **Role Selection**: Buyer vs. Seller
2. **Interest Selection**: Intelligence, Marketplace, or Both
3. **Auto-Trial**: 14-day professional access
4. **Redirect**: Based on role and interests

### Row Level Security (RLS)
- All tables have RLS enabled
- Buyers see their RFQs and received quotes
- Sellers see public RFQs and their quotes
- Admins have full access via `has_role()` function

### Access Control
- `AccessGate` component for feature gating
- `LockedContent` for upgrade prompts
- Subscription checks via `useSubscription` hook
- Trial countdown banner for active trials

---

## 📱 Key Features Implemented

### Phase 1-2: Foundation ✅
- [x] 4-tier pricing structure
- [x] Two-pillar landing page
- [x] Onboarding flow with role/interest selection
- [x] Trial countdown banner
- [x] Access gates per subscription tier
- [x] Sample data (signals, tenders, briefs)

### Phase 3-4: Core Features ✅
- [x] Unified dashboard (Intelligence + Marketplace)
- [x] Empty states with CTAs
- [x] Loading skeletons
- [x] Filter bar (search, location, urgency, category)
- [x] Quote comparison table
- [x] Vendor tracking/bookmarking

### Performance Optimizations ✅
- [x] Lazy loading components
- [x] Skeleton loading states
- [x] Optimized re-renders with React.memo
- [x] Efficient database queries
- [x] Real-time subscriptions for live updates

---

## 🧪 Testing Checklist

### Pre-Launch Testing
- [ ] **Auth Flow**: Signup → Onboarding → Dashboard
- [ ] **Trial Experience**: 14-day countdown, upgrade prompts
- [ ] **Intelligence**: View signals, tenders, briefs
- [ ] **Marketplace (Buyer)**: Post RFQ, receive quotes, compare
- [ ] **Marketplace (Seller)**: Browse RFQs, submit quotes
- [ ] **Subscription**: Upgrade/downgrade, access gating
- [ ] **Mobile**: All pages responsive, touch-friendly
- [ ] **RTL**: Arabic language support
- [ ] **Performance**: Lighthouse score 90+

---

## 📈 Analytics & Monitoring

### Key Metrics to Track
- Trial-to-paid conversion rate
- Daily active users (Intelligence vs Marketplace)
- RFQ posting frequency
- Quote submission rate
- Signals/tenders viewed per user
- Upgrade trigger points

### Recommended Tools
- Google Analytics 4 for user behavior
- Sentry for error tracking
- Supabase Analytics for database queries
- Vercel/Cloudflare Analytics for performance

---

## 🔄 Deployment

### Build & Deploy
```bash
# Build for production
npm run build

# Deploy via Lovable
Click "Publish" button in top right
```

### Custom Domain Setup
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. SSL auto-configured

### Post-Deployment
- [ ] Test all authentication flows
- [ ] Verify subscription webhooks (if using Stripe)
- [ ] Check email deliverability
- [ ] Monitor error logs (first 24 hours)
- [ ] Set up analytics tracking
- [ ] Enable uptime monitoring

---

## 🛠 Maintenance

### Weekly Tasks
- Review new user onboarding completion rates
- Check trial-to-paid conversion
- Monitor error rates and fix critical issues
- Update sample signals/tenders with fresh data

### Monthly Tasks
- Analyze subscription churn
- Review feature usage (Intelligence vs Marketplace)
- Update content (briefs, signals, tenders)
- Performance audit (Lighthouse)

### Quarterly Tasks
- User satisfaction survey
- Competitive analysis
- Feature prioritization review
- Pricing strategy review

---

## 📚 Resources

### Documentation
- [Lovable Docs](https://docs.lovable.dev)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Support
- Lovable Discord: [Join Community](https://discord.gg/lovable)
- Email: support@maintmena.com (configure in Contact page)

---

## 🎯 Roadmap (Future Enhancements)

### Intelligence Enhancements
- [ ] PDF export for briefs
- [ ] Email digest subscriptions
- [ ] Advanced analytics dashboard
- [ ] Custom alert filters
- [ ] Tender submission kit builder

### Marketplace Enhancements
- [ ] Vendor verification badges
- [ ] Escrow payment integration
- [ ] Project milestone tracking
- [ ] Review & rating system
- [ ] Auto-bid matching (AI)

### Platform Features
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations
- [ ] White-label for enterprise
- [ ] Multi-language (beyond EN/AR)
- [ ] Video tutorials & help center

---

## 📝 License & Credits

Built with:
- ⚛️ React 18 + TypeScript
- 🎨 Tailwind CSS + shadcn/ui
- 🔥 Supabase (via Lovable Cloud)
- 🎭 Framer Motion
- 📊 Recharts
- 🔍 React Query

---

**Ready for Production Deployment** ✨

All phases completed except final content polish and real customer data.
Platform is fully functional with sample data and ready to onboard real users.
