I want to make antigravity create maintmena from scratch. 

# Maintmena Mobile App, Real-Time Home Services Dispatch Platform (Saudi Arabia) 

MaintMENA is a real-time service matching platform that connects customers with verified maintenance professionals instantly — similar to how Uber matches riders with drivers, but for home and facility services.

Instead of browsing provider listings, users submit a request and MaintMENA automatically matches them with the best available provider based on:

-   Location proximity
    
-   Provider availability (online state)
    
-   Service category specialization
    
-   Historical performance & reputation
    
-   Real-time demand conditions
    

---

## Core Product Model

```markdown
Buyer submits service request
        ↓
MaintMENA matching engine evaluates providers
        ↓
Best provider receives opportunity
        ↓
Provider accepts job
        ↓
Live job lifecycle tracking
        ↓
Assigned/Scheduled → In Route → In Progress → Completed & Paid (Seller enters price, buyer confirms, then QR code verification, seller scans QR code that appears on buyer's screen) → Rating (for both sides) → Job Closed
```

## 👥 Platform Sides

---

### 🟢 Buyer Side

#### Key Capabilities

-   Service category and sub-category selection  
    
-   Location confirmation (Map-based)
    
-   Schedule selection (ASAP or Future Time Slot)
    
-   Issue description + photo upload
    
-   Real-time provider matching
    
-   Job tracking
    
-   Ratings & feedback

#### Other Screens (bottom nav)

-   Home (described above)
    
-   Activity (Briefly lists previous requests, even cancelled ones. Shows a more detailed view with a map view for latest activity)
    
-   Messages 
    
-   Profile (includes all necessary account details, history, settings, help, and a log out button)
     

---

### 🟠 Seller (Service Provider) Side

#### Key Capabilities

-   Online / Offline availability toggle
    
-   Real-time opportunity feed

-   Demand heat indicators
    
-   Estimated earnings forecasting
    
-   Service radius control
    
-   Fast accept workflow 
    
-   Reputation growth Leveling system with incentivizing rewards (such as badges that appear on seller summary card, which shows up for buyers who have been assigned that seller, achievements that show up for buyers in the seller's profile, and more)

#### Other Screens (bottom nav)

-   Home (described above)
    
-   Wallet (shows billing, earnings throughout months, reputation/rating/level, recent activity and ratings received from these activities if available)
    
-   Messages 
    
-   Profile (includes all necessary account details, services provided & location, portfolio gallery, certifications, history, settings, help, and a log out button)
     


## MaintMENA — UI/UX Design Guidelines Plan (Agent Spec)

**Purpose:** Create MaintMENA a mobile app with a scalable, production-grade UI architecture and a polished, behavior-aware UX system.

---

### 1) What is MaintMENA (Product Context for the Agent)

MaintMENA is a **mobile-first home services marketplace** (Uber-like service request app) for local service categories such as:

- Plumbing
- Electrical
- AC / Cooling
- Cleaning
- Handyman
- Appliance repair
- Painting
- Landscaping

It serves **two primary user roles**:

1. **Buyer / Customer**
   - Requests a technician/service provider
   - Chooses ASAP or scheduled service
   - Selects location
   - Tracks request and booking
   - Communicates with provider
   - Needs trust, clarity, and speed

2. **Seller / Provider (Technician / Pro)**
   - Goes online/offline to accept requests
   - Sees nearby demand insights
   - Receives jobs
   - Tracks earnings / wallet / performance
   - Builds reputation and visibility

The app should feel:
- **fast**
- **clear**
- **trustworthy**
- **premium but practical**
- **Saudi-local and modern**
- **pleasant to use repeatedly (not just functional)**

---

### 2) Product UX Goals (Non-Negotiable)

The UI/UX must optimize for:

#### A) Trust
Users should feel safe and confident using the marketplace.
- clear location confirmation
- transparent job/request status
- professional visual system
- predictable flows
- visible support/help pathways


---

#### B) Speed
Requesting or accepting work should feel quick and low-friction.
- minimal decision fatigue
- obvious next action
- progressive disclosure
- responsive UI feedback

---

#### C) Clarity
Every screen must answer:
- **What is happening now?**
- **What should I do next?**
- **What can I expect next?**

Avoid vague statuses and generic CTAs.

---

#### D) Marketplace Reality
The UX must support real marketplace dynamics:
- uncertain pricing
- variable provider availability
- matching delays
- cancellations
- disputes/assistance (future-ready)
- seller online/offline supply behavior

---

#### E) Delight Through Polish (Microinteraction Quality)
The app should feel **alive, responsive, and high-quality**, especially in repeated daily use.

This requires:
- thoughtful microanimations
- tactile button/press feedback
- smooth transitions
- state-change animations (request sent, online/offline, loading → content)
- subtle motion that improves confidence and perceived quality

---

### 3) UX Strategy: Two Distinct App Experiences (Shared Language)

The app should support **role-based UX** with one coherent design system.

### 3.1 Buyer UX (Requesting Services)
Buyer experience should feel:
- guided
- low-anxiety
- task-oriented
- trust-first

Key UX themes:
- request quickly
- confirm location confidently
- understand status at every step
- communicate safely and clearly

### 3.2 Seller UX (Provider Dashboard & Job Acceptance)
Seller experience should feel:
- operational
- motivating
- earnings-aware
- easy to scan quickly

Key UX themes:
- online/offline clarity
- local demand visibility
- actionable opportunity suggestions
- progress and performance cues
- confidence in next best action

---

### 4) Visual Direction (MaintMENA Style Baseline)

Use the current MaintMENA aesthetic as the baseline:
- warm premium neutrals
- soft surfaces/cards
- rounded UI shapes
- strong CTA buttons
- calm white/off-white backgrounds
- rich **orangey-brown brand accent**
- clean hierarchy and spacing
- practical premium feel (not flashy startup gimmick)

### 4.1 Brand Feel
The brand should feel:
- **local and trustworthy**
- **warm and premium**
- **clean and modern**
- **operationally serious**
- **friendly but not playful/childish**

Avoid:
- overly colorful “delivery app” style
- loud gradients on every screen
- generic blue fintech look
- harsh monochrome black-heavy UI
- cluttered, crowded dashboards

---

### 5) Core Design Principles (Must Guide Every Screen)

#### 5.1 Show the Next Best Action
Every major screen should have a clear dominant action.

Examples:
- `Confirm Location`
- `Get Started`
- `Go Online`
- `View Details`
- `Enable Plumbing`

---

#### 5.2 Reduce Cognitive Load
Use progressive disclosure and chunking.
Prefer:
- cards
- grouped sections
- short labels
- visual hierarchy
- step-by-step flows

Avoid presenting too many equal choices at once.

---

#### 5.3 Make State Visible
Status is central to a marketplace UX.
State should be visually obvious:
- offline / online
- request sent
- searching / matching
- high demand / steady
- completed / pending
- error / retry

Status should not be buried in small text.

---

#### 5.4 Trust Must Be Embedded in the Flow
Trust is not a separate legal page — it is a UX quality.
Embed trust through:
- clear confirmations
- precise status messaging
- predictable navigation
- transparent expectations
- visible support/help access
- clean visual discipline

---

#### 5.5 Local Context First
Design for Saudi users:
- city/area mental models
- bilingual Arabic/English support
- RTL readiness from day one
- localized copy and formatting
- culturally clear confirmations and labels

---

#### 5.6 Behavioral Design Thinking (Required)
The UI/UX should be designed using psychology/behavioral principles to improve usability, trust, and conversion.

Think about:
- **friction placement** (where to reduce vs where to slow users down)
- **choice overload** (limit options when users are stressed)
- **progress visibility** (reduce uncertainty)
- **loss aversion** (e.g., don’t make users feel they “lost” their request progress)
- **commitment momentum** (small easy steps before larger asks like sign-up)
- **social proof cues** (where appropriate and truthful)
- **confidence cues** (map confirmation, response expectations, clear next step)

> Learn from high-retention apps people enjoy using (ride-hailing, food delivery, banking, commerce, marketplace apps) — but adapt patterns to MaintMENA’s context, not blindly copy visuals.

---

### 6) Information Architecture (Top-Level)

Build **role-based navigation shells**.

### 6.1 Buyer App IA (Suggested)
Bottom navigation (example):
- **Home**
- **Activity**
- **Messages**
- **Profile**

### 6.2 Seller App IA (Suggested)
Bottom navigation (example):
- **Home**
- **Wallet**
- **Messages**
- **Profile**

Seller Home is an **operations dashboard**, not a marketing home screen.

---

### 7) Key User Journeys to Design First (Priority Flows)

Build these before visual polish on secondary screens.

### 7.1 Buyer Core Flow

The platform is built on a scheduled-first model. Every job has a `scheduled_for` timestamp. ASAP jobs are simply scheduled jobs where `scheduled_for = now` with a tighter dispatch timeout window. There is no separate code path.

1. Open app / home
2. Confirm or select location (map-based)
3. Choose service category and subcategory
4. Choose time — the time selector presents "As soon as possible" as the first and default option, followed by future time slots. Both choices produce the same job record structure.
5. Enter problem description + optional photo upload
6. Submit request
7. Request sent confirmation — for ASAP jobs this transitions immediately to matching; for future slots it shows a scheduled confirmation state with the locked time
8. Matching / provider search status (for ASAP) or scheduled holding state (for future slots)
9. Provider assigned — buyer sees provider summary card
10. Job tracking & Communication: In Route → In Progress → Seller Marked Complete (seller adds price) (the buyer can communicate with the seller through the app, and the seller can communicate with the buyer through the app, a message and phone button shows up for buyers next to the assigned provider card)
11. Buyer approves price (or request support, button not very visible) and QR code shows up on buyer's device if price approved for seller to scan (alternative option for a 6-digit code is shown as an option to the buyer if QR code fails, meaning buyer can click a button to generate a 6-digit code instead)
12. Rating and review screen (both sides)
13. Job closed


### 7.2 Seller Core Flow (Go Online + Demand Awareness)

The seller's primary daily workflow is managing their upcoming scheduled jobs, not waiting online for live pings. The online/offline toggle remains relevant for ASAP job capture but is secondary to the scheduled queue.

1. Open seller home — default view is upcoming scheduled jobs queue, not a demand heatmap. A list of rising demand categories and areas are shown when offline or online (less importance when online).
2. See offline/online status clearly as a secondary control, dominant `Go Online` button if offline
3. Review upcoming job requests (with time, category, area, estimated value) (receive push notification for incoming requests)
4. Accept or decline scheduled offers within the configured response window
5. On day of job: mark In Route, then In Progress
6. Mark job complete and enter price,  optional image upload for proof — buyer scans seller's QR code (or 6-digit code)
7. Earnings and reputation update in wallet

### 7.3 Auth Gate / Conversion Flow (Progress-Preserving)
If user tries to book without account:
- allow guest buyer users to go throught the process till (6. Submit Request) after which a modal/bottom sheet should appear asking the user to fill in their email and password, phone number optional, to sign up and submit the request. (should be simple and fast, and feel seamless, shouldnt feel like an actual am creating an account)
- preserve entered request progress
- offer a not so obvious `Sign In` button

This must feel like **completing the booking**, not being blocked.

### 7.4 — Canonical Job Lifecycle State Machine (advice)

Every domain in this spec (matching, financials, disputes, UI) references job states. The following is the single source of truth. All domains must derive their behavior from this state machine rather than maintaining independent state assumptions.

**States:**
- `draft` — buyer has begun request entry but not submitted
- `submitted` — buyer submitted; awaiting dispatch
- `dispatching` — matching engine is actively sending offers to sellers
- `no_seller_found` — dispatch exhausted without acceptance; buyer notified
- `seller_assigned` — a seller accepted; job confirmed
- `scheduled_confirmed` — for future-time jobs: seller accepted and time slot is locked
- `in_route` — seller has marked themselves en route to the buyer location
- `in_progress` — seller has marked work as started
- `seller_marked_complete` — seller marked work done; awaiting buyer QR scan and confirmation
- `buyer_confirmed` — buyer scanned QR and confirmed completion; triggers financial record creation
- `disputed` — an active formal dispute is open against this job (does not overwrite completion facts)
- `closed` — all confirmations done, financial record created, ratings collected or window expired
- `cancelled` — job cancelled before seller_marked_complete; fault attribution recorded separately

**Transition rules:**
- Only forward transitions are permitted except `disputed`, which can overlay `buyer_confirmed` or `closed` without reverting them
- `cancelled` is reachable from any state before `seller_marked_complete`; cancellation fault must be recorded at time of cancellation
- `no_seller_found` may transition back to `submitted` if buyer chooses to retry
- Financial record creation is triggered exclusively by the `buyer_confirmed` transition
- The `disputed` overlay must not block `closed` transition unless explicitly configured (see disputes spec feature flags)

**Permitted actions per state (examples):**
- `dispatching` → seller can accept or decline offers; buyer can cancel
- `in_progress` → seller can mark complete; buyer can request assistance
- `seller_marked_complete` → buyer scans QR or raises issue; system starts confirmation timeout
- `buyer_confirmed` → ratings window opens; financial record created

Every screen in the buyer and seller apps must derive its displayed status and available actions from this state. Do not hardcode status labels independently per screen.

![example diagram of the state machine](image.png)

---

### 8) Screen Inventory

### 8.1 Buyer Screens (MVP)
- Home / request launcher
- Category picker (ASAP / Schedule)
- Location picker (map + bottom sheet confirmation)
- Request details form
- Request sent confirmation
- Request status / booking details
- Auth gate bottom sheet/modal
- Profile
- Help & Support
- Settings

### 8.2 Seller Screens (MVP)
- Dashboard (offline/online state) (offline should show Nearby demand map/list, use fallback numbers if no data is available)
- Opportunity suggestion card (`Enable Plumbing`) (while online and no job offers, show this card, should feel like a side upgrade not too much attention, should be dismissable)
- Job offers list / details (should show only 3 job offers at a time, if more than 3 job offers are available, show a button to view all job offers)
- Active jobs list (should show only 2 active jobs at a time, if more than 2 active jobs are available, show a button to view all active jobs)
- Job details/workflow
- Wallet / earnings overview
- Reputation/progress growth carousel card (should show only 1 card at a time, if more than 1 card is available, add it to the carousel)
- Profile / settings

### 8.3 Seller Onboarding Screens
The seller onboarding flow is trust-critical and feeds directly into matching eligibility. It must be completed before a seller can go online or receive any job offers.

- Welcome / role selection screen (seller vs buyer)
- Phone number entry + OTP verification
- Basic profile: name, profile photo, short bio
- Service categories selection — multi-select from the platform category list; this directly controls matching eligibility
- Service area configuration — city/district selection or map-based radius; required for proximity filtering in the matching engine
- Portfolio gallery upload (optional at signup, encourages completion later)
- Certifications entry (optional, shown on seller profile card visible to buyers post-match)
- Onboarding complete screen — clear explanation of what happens next (how offers arrive, how to go online, how earnings work)

**Onboarding UX rules:**
- Use progressive disclosure — do not present all fields on one screen
- Allow partial save so sellers can resume onboarding
- Show a completion progress indicator (e.g. "3 of 5 steps done")
- Category and area selection must mirror exactly the fields used by the matching eligibility layer; any mismatch means a seller onboards but never receives offers


### 8.4 Shared/Support Screens
- Notifications center
- Messages/chat
- Assistance / issue entry (future-ready)
- Permission prompts (location, notifications)
- Loading/skeleton states
- Empty states
- Error/retry states
- Offline/no network states

---

### 9) Layout & Spacing Rules (Global)

Implement these as reusable tokens.

### 9.1 Screen Layout Pattern
Most screens should follow:
- safe area top
- header/title region
- primary content sections/cards
- sticky/fixed bottom CTA when needed
- bottom navigation (role shell)

### 9.2 Spacing System (Recommended)
Use an 8pt-based spacing scale:
- `4, 8, 12, 16, 20, 24, 32, 40`

Recommended defaults:
- screen horizontal padding: `16–20`
- card padding: `16–20`
- section spacing: `16–24`
- internal row gaps: `8–12`

### 9.3 Shape Language (Rounded UI)
MaintMENA style is soft and rounded:
- cards: `20–28`
- buttons: `14–20`
- chips/pills: `999`
- icon containers: rounded-square/circle

Maintain consistency across buyer and seller apps.

---

### 10) Typography Guidelines

Typography should create strong hierarchy and quick scannability.

### 10.1 Hierarchy Levels (Conceptual)
- Hero metric (e.g., SAR range, earnings)
- Screen title
- Section title
- Card title
- Body
- Caption/helper
- Badge/chip label

### 10.2 Tone
- Headlines: direct, confident
- Body: calm, clear
- Helper text: reassuring and action-oriented
- Avoid jargon and legal-sounding text in primary flows

### 10.3 Arabic/English Readiness
The typographic system must support:
- Arabic + English
- RTL mirroring
- differing line heights
- wider/longer labels
- dynamic text scaling (where feasible)

### 10.4 Font Family
Use the following font family:
#### For Arabic
- Tajawal (Primary)
- Noto Sans Arabic (Secondary)
#### For English
- Google Sans (Primary)
- Inter (Secondary)

Do not hardcode exact text widths in components.

---

### 11) Color System (Brand + Functional Semantics)

The app should use a **warm orangey-brown primary brand color** similar to the current shared visuals.

> The AI agent must define **semantic tokens** and avoid hardcoding raw hex values everywhere.

### 11.1 Color Direction (Brand)
Use a palette centered around:
- **orangey-brown primary**
- warm neutrals
- off-white surfaces
- dark readable text
- soft tinted backgrounds for status cards/chips

#### Brand feel target
“Premium warm marketplace” — practical, modern, and memorable.

---

### 11.2 Semantic Color Tokens (Required)
Define tokens such as:
- `color.bg.app`
- `color.bg.surface`
- `color.bg.card`
- `color.bg.cardMuted`
- `color.text.primary`
- `color.text.secondary`
- `color.text.inverse`
- `color.brand.primary`  ← orangey-brown
- `color.brand.primaryPressed`
- `color.brand.soft`
- `color.border.subtle`
- `color.success`
- `color.success.soft`
- `color.warning`
- `color.warning.soft`
- `color.danger`
- `color.danger.soft`
- `color.info`
- `color.overlay.scrim`

### 11.3 Functional Color Usage Rules
Color should communicate state and importance:
- **offline** = muted neutral
- **online** = green/success
- **high demand** = red badge
- **steady** = neutral chip
- **rising demand** = green/positive
- **success confirmation** = green icon + soft green halo
- **primary action** = orangey-brown CTA

Avoid using the brand color for all badges and statuses.

---

### 12) Component System (Reusable UI Primitives)

The agent must build a reusable component library, not one-off screens.

### 12.1 Core Components (Required)
- Buttons (primary / secondary / ghost / destructive)
- Icon buttons
- Chips / status badges / pills
- Cards (base + variants)
- List rows
- Section headers
- Segmented controls (ASAP / Schedule)
- Toggles
- Bottom sheets
- Modals/dialogs
- Text inputs / text areas
- Tabs
- Progress bars
- Status indicators (dot + label)
- Skeleton loaders
- Toast/snackbar
- Empty/error state blocks

### 12.2 MaintMENA-Specific Components (Important)
- **Demand Insight Card**
- **Smart Tip / Opportunity Card**
- **Earnings Forecast Card**
- **Request Sent Confirmation Card**
- **Location Confirmation Bottom Sheet**
- **Request Progress Status Card**
- **Reputation Growth Card**
- **Wallet Summary Card**
- **Issue/Assistance Entry Card** (future-ready)

---

### 13) Button & CTA Rules (Very Important)

#### 13.1 One Primary CTA per Context
Do not create CTA competition.
Each screen/section should make the primary action obvious.

#### 13.2 CTA Hierarchy
- Primary = filled brand button (orangey-brown)
- Secondary = outlined or soft-fill
- Tertiary = text/ghost

#### 13.3 Copy Style (Action-First)
Prefer:
- `Confirm Location`
- `Get Started`
- `View Details`
- `Enable Plumbing`
- `Go Online`

Avoid generic labels like:
- `Submit`
- `Continue`
unless the next step is crystal clear.

---

### 14) Navigation Patterns

### 14.1 Bottom Navigation
Use bottom nav for role hubs.
Rules:
- 4–5 items max
- icon + label
- clear active state
- consistent ordering by role
- preserve tab state when possible

### 14.2 Header Navigation
Use simple mobile-native headers:
- back or close icon
- screen title
- optional actions (notifications/messages)

### 14.3 Bottom Sheets (Strongly Recommended)
Use bottom sheets for:
- auth gate
- location confirmation
- quick action flows
- supportive explanations
- edit/confirm steps

Why:
- mobile-native feel
- maintains context
- reduces navigation friction
- aligns with current MaintMENA interaction style

---

### 15) Map UX Guidelines (Key MaintMENA Feature)

Maps are central to trust and request accuracy.

### 15.1 Map Use Cases
- selecting request location
- confirming selected location
- previewing request location
- seller demand visualization (abstract hotspots/list overlays)
- future provider tracking

### 15.2 Map UX Rules
- Always pair map selection with a clear confirm action (`Confirm Location`)
- Use bottom sheet summary for selected area/city
- Keep controls minimal and obvious
- Preserve context (don’t hide user location selection info)
- Include easy close/back action

### 15.3 Privacy & Trust
- Show area/city labels where sufficient
- Avoid exposing unnecessary exact precision too early
- Use clear messaging around selected location confidence

---

### 16) Status, Feedback & Microinteractions (High Priority)

MaintMENA should feel smooth and polished through **microanimations and responsive feedback**.

### 16.1 Required Status Patterns
- offline / online
- request sent
- finding provider / matching
- high demand / steady
- completed / pending
- error / retry
- loading / syncing

### 16.2 Confirmation Design Pattern
Use strong success confirmations:
- success icon with soft halo
- concise title (`Request Sent`)
- clear “what happens next”
- expected response time hint
- primary CTA + secondary exit path

### 16.3 Informative Waiting States
When background work is happening:
- explain what is happening
- provide confidence cues
- avoid silent spinners

Examples:
- `Finding you the best provider...`
- `Most respond within 6 minutes`

---

### 16.4 Microanimation Principles (Required Focus)

Microanimations should improve:
- clarity
- confidence
- perceived speed
- delight
- habit-forming UX quality

#### Key moments to animate
- button press states (scale/opacity/ripple)
- segmented toggle switches (ASAP/Schedule)
- bottom sheet open/close
- card appearance (staggered reveal lightly)
- status changes (offline → online)
- request sent success transition
- progress bar updates (reputation/XP)
- carousel/pager indicators
- list insertions/removals
- skeleton → loaded content transition

#### Motion style target
- smooth
- subtle
- premium
- tactile
- fast enough to not slow task completion

#### Avoid
- decorative motion with no purpose
- long transitions
- excessive bounce
- repeated distracting animations in dashboards

---

### 16.5 “Nice Feel” Interaction Requirements (Behavior + Motion)
The agent must intentionally design for the feeling of:
- **immediate response** (every tap has feedback)
- **momentum** (next step appears naturally)
- **reassurance** (state changes are acknowledged)
- **control** (user never feels lost)
- **reward** (small positive cues for progress and completion)

This is especially important in:
- seller dashboard daily use
- buyer request submission
- auth conversion moments
- success/error recovery states

---

### 17) Trust & Conversion UX (Without Misleading Claims)

The app should build trust continuously **without claiming features that do not exist**.

### 17.1 Trust Messaging Placement
Trust/support messages can appear:
- on buyer request entry screens
- near location confirmation
- on request sent screen
- in support/help entry points
- in status tracking screens

#### Examples (safe and truthful)
- `Track your requests and bookings`
- `Communicate with technicians`
- `Clear request status updates`
- `Need help? We’re here to support`
- `Secure account access`


---

### 17.2 Auth Gate UX (Conversion-Focused)
When user tries to book without account:
- show a bottom sheet/modal
- preserve request progress
- explain practical value of signing up:
  - tracking requests
  - communication
  - saved details/history
- strong `Get Started` CTA
- easy `Sign In` path

This should feel like:
- continuing the request
not:
- being blocked by forced registration

---

### 18) Seller Motivation UX (Growth & Retention)

Seller UX should drive repeat engagement through useful, behavior-aware design.

### 18.1 Motivational Elements
Use meaningful motivation cues such as:
- nearby demand indicators
- category opportunity recommendations
- estimated earnings if online
- streaks/activity consistency
- reputation/progress growth
- “next tier” / lower-fee progress messaging (if applicable)

### 18.2 Behavioral Design Guidance
Apply psychology carefully:
- make opportunities visible (salience)
- reduce uncertainty with estimates
- reinforce positive routines (`Go Online`, streaks)
- surface actionable wins, not vanity metrics only
- avoid pressure-heavy manipulation or fake urgency

### 18.3 Seller Home Layout Pattern (Recommended)
Stack cards in this order:
1. Current status (online/offline toggle — secondary control)
2. Upcoming jobs queue (primary — scheduled jobs list with times and status)
3. New job offers awaiting response (if any pending)
4. Demand insight / area activity (contextual, collapsible)
5. Earnings summary (week-to-date)
6. Reputation/growth progress card (motivational, below the fold)

---

### 19) Accessibility & Usability Requirements (Must-Have)

### 19.1 Touch Targets
Minimum touch area:
- `44x44` pt/dp (or equivalent)

### 19.2 Contrast & Readability
Ensure strong contrast for:
- small captions
- chip labels
- disabled states
- brand buttons on light backgrounds
- status colors

### 19.3 Motion Sensitivity
Animations should be:
- smooth
- short
- non-blocking
- reduced where OS accessibility settings request reduced motion (if feasible)

### 19.4 Error Recovery
Critical flows must support:
- retry
- edit
- back
- support/help entry (where appropriate)

---

### 20) Motion System Guidelines (Implementation-Level)

Animation should be consistent, not ad hoc.

### 20.1 Motion Token Categories (Required)
Define motion tokens for:
- durations (`fast`, `medium`, `slow`)
- easing curves
- spring presets (if used)
- opacity transitions
- scale transitions
- sheet/modal transitions

### 20.2 Motion Usage Rules
- Use the same motion style across similar interactions
- Prioritize responsiveness over flourish
- Use spring/tactile motion carefully for buttons/toggles
- Use fade/slide for structural transitions (cards/sheets)

### 20.3 Microanimation QA Checklist
Every key screen should be reviewed for:
- tap feedback present?
- loading transition polished?
- success/error feedback visible?
- no janky layout jumps?
- no animation blocking input?

---

### 21) Content Design / Microcopy Guidelines

### 21.1 Tone of Voice
- clear
- supportive
- calm
- practical
- trustworthy
- respectful

Avoid:
- legal-heavy wording in core flows
- exaggerated claims
- vague system messages

### 21.2 Microcopy Rules
- explain what’s happening
- explain what happens next
- explain why a step is needed
- use active voice
- keep labels short and scannable

Examples:
- ✅ `Finding you the best provider...`
- ✅ `Most respond within 6 minutes`
- ✅ `Create a free account to track your request and chat with technicians.`

---

### 22) Localization (Arabic + English) Requirements

Design for bilingual Saudi usage from the start.

### 22.1 Required Capabilities
- English + Arabic text support
- RTL layout support
- mirrored UI where appropriate
- localized currency formatting (SAR)
- localized date/time
- variable text length tolerance

### 22.2 RTL-Safe Design Rules
- use logical start/end alignment in code
- avoid hardcoded left/right assumptions
- mirror navigation and directional icons where needed
- test bottom sheets, lists, chips, and CTAs in RTL

### 22.3 Translation-Friendly UI
- no fixed-width text traps
- allow wrapping for helper/subtitles
- no text baked into images
- avoid copy that depends on English word length

---

### 23) Design System Tokens (Implementation Requirement)

The agent must define a proper token system for React Native.

### 23.1 Token Categories
- Colors (semantic)
- Typography
- Spacing
- Radius
- Border widths
- Elevation/shadows
- Opacity
- Motion durations/easing
- Icon sizes
- Component sizing
- Z-index/layering

### 23.2 Rule: No Screen-Level Hardcoding
Do not hardcode styling values directly inside screens except for temporary prototyping.
Promote values into tokens and component variants.

This is required for:
- consistency
- reusability
- future theming
- role parity
- maintainability

---

### 24) Platform-Specific Build Guidance (React Native)

The agent must preserve UX parity and motion quality.

### 24.1 Architecture Expectations
Use:
- feature modules by domain
- shared design tokens
- reusable UI components
- state-driven rendering
- localization scaffolding
- motion presets/utilities

### 24.2 React Native UX Notes
- use theme provider + token system
- reusable primitives (Button/Card/Chip/BottomSheet)
- central animation helpers/presets
- support RTL-aware styles/layout
- avoid repeated inline styling and inconsistent motion curves

### 24.3 Map + Bottom Sheet Interop
- smooth map gestures
- stable bottom sheet drag behavior
- no gesture conflicts
- safe-area correct
- responsive on common device sizes

---

### 25) State-Driven UI Rules (Important for Real App Quality)

The app must be designed as **stateful product UI**, not static mockups.

### 25.1 Every Screen Must Define States
At minimum:
- loading
- empty
- normal
- error
- retry
- permission denied (if relevant)
- offline/no network (if relevant)

### 25.2 Example: Seller Demand Module States
- loading demand data
- no nearby demand data
- stale data warning
- normal demand list
- fetch error

### 25.3 Example: Request Sent Flow States
- request creating / syncing
- request created
- matching started
- still searching
- provider assigned
- request failed / retry

UI should reflect these states clearly and gracefully.

---

### 26) Analytics-Ready UX (Future Optimization)

Design interactions so they can be measured later.

### 26.1 Trackable UX Events (Examples)
- category selected
- ASAP vs Schedule selected
- location changed / confirmed
- request submitted
- auth gate shown
- auth gate CTA clicked
- seller went online
- seller went offline
- opportunity card CTA clicked
- earnings forecast card viewed
- request sent screen viewed
- support/help entry tapped

### 26.2 UX Rule
Critical actions should be explicit and event-trackable.
Avoid hidden gestures for primary actions.

---

### 27) Quality Bar (Definition of “Good” for This Rebuild)

The rebuild is successful when:

1. A new user can request a service quickly without confusion  
2. A seller can understand demand and go online confidently  
3. Every major screen has a clear next action  
4. Status and trust cues are visually obvious  
5. The app feels polished through responsive microinteractions  
6. The UI is component-based, tokenized, and production-scalable  
7. Arabic/English + RTL are built in from the start  
8. Trust messaging is truthful and does not imply unbuilt features  

---

### 28) Common Mistakes the Agent Must Avoid

- Building screens as isolated mockups with no shared system
- Mentioning features that do not exist (e.g., contracts/protection if not implemented)
- Overusing brand color so status meaning becomes unclear
- Hiding the primary CTA among multiple equal actions
- Designing only happy-path screens
- Ignoring loading/error/empty states
- Hardcoding English-only layouts
- Treating seller dashboard like a generic profile page
- Using motion as decoration instead of feedback
- Copying “popular apps” visually without understanding the behavioral reason patterns work

---

### 29) Deliverables the AI Agent Should Produce

#### A) UI/UX Spec Outputs
- screen map / flow map
- component inventory
- design token definitions (including motion)
- navigation architecture
- key screen state maps
- localization/RTL checklist
- behavioral UX notes per major flow (why certain patterns are used)

#### B) Implementation Outputs (Flutter or React Native)
- reusable design system components
- motion preset utilities
- role-based navigation shells
- buyer MVP screens
- seller MVP screens
- mock state models
- loading/empty/error variants
- theme setup and localization scaffolding

#### C) Documentation Outputs
- README (run/build instructions)
- folder structure explanation
- theming/token usage guide
- component usage examples
- motion usage guide
- future extension notes (matching, disputes, wallet, fees)

---

### 31) Final Instruction to the Agent (How to Think)

Do not think of MaintMENA as “screens to replicate.”

Think of it as a **trust-first, speed-first service marketplace system** that must feel:
- clear
- responsive
- premium
- behaviorally intelligent
- pleasant in repeated use

Build the UI/UX from scratch so future systems (matching engine, disputes/assistance, wallet, fees, trust scoring) can plug in without redesigning the app.

Design like the best apps people love using:
- smooth
- obvious
- confidence-building
- low-friction
- carefully paced

But keep it truthful to MaintMENA’s actual features and marketplace realities.

---

### 32) Suggested Next Companion Documents (Recommended)

After this UI/UX guidelines plan, generate:
1. **Design System Token Spec (Colors / Typography / Spacing / Radius / Motion)**
2. **Buyer Journey UX Spec (End-to-End)**
3. **Seller Dashboard UX Spec**
4. **Component Library Spec**
5. **Job Lifecycle UI State Spec**
6. **Assistance/Dispute UX Spec**
7. **Wallet/Earnings UX Data Spec**

### 33) Cold Start Strategy and Supply-Side Bootstrapping

The matching engine and buyer experience assume a pool of verified, online, available sellers exists. In the early launch period this assumption is false, and the product must not silently fail when the seller pool is thin or empty.

#### 33.1 Launch Sequencing Principle

Do not launch buyer-facing demand until minimum viable supply exists in a given city and category. Define a minimum supply threshold per category per city before that category is made visible to buyers. Categories or cities below threshold should be in a waitlist or "coming soon" state rather than showing real-time matching that always fails. (exception: plumbing and electrical work should be available from the start)

#### 33.2 Buyer-Facing Cold Start UX

When a buyer submits a request in a city or category with insufficient supply:
- Do not show the standard matching flow (spinning "finding provider") if there is near-certainty of failure
- Instead show a transparent waitlist state: "We're growing our network of providers in your area. Leave your request and we'll notify you when a provider is available."
- Capture the request as a demand signal even if it cannot be fulfilled immediately
- Send a notification when a match becomes possible

This is better for trust than running the full dispatch flow and returning `no_seller_found` repeatedly.

#### 33.3 Seller-Side Bootstrapping Tools (Operational Requirements)

The product needs lightweight operational tools to manually seed supply during launch:
- Admin ability to manually assign a job to a seller (bypassing the matching engine for ops-sourced sellers)
- Admin ability to flag a seller as "launch partner" to boost their matching exposure score during the seeding period
- A seller referral mechanism so early sellers can invite peers
- Configurable per-category and per-city visibility gates that ops can open as supply crosses thresholds

#### 33.4 Demand Signal Collection (Pre-Launch)

Before a category in a city goes live, collect demand signals passively:
- Allow users to submit "notify me" requests for unserved categories, also save the cities of these requests
- Use this data to prioritize which categories and cities to seed first, and show it in admin dashboard
- This also creates a warm buyer base to activate at launch rather than launching to zero users

#### 33.5 Metrics That Define "Ready to Launch" in a Market

A category per city combination is ready for live buyer matching when:
- Minimum N sellers are online during peak hours (N is configurable per category)
- Average offer response rate from those sellers exceeds a configured threshold in internal test runs
- The ops team has manually validated at least one end-to-end job in that city (turned online from admin-view)

These thresholds must be config-driven and visible in an ops dashboard. Do not hardcode launch criteria.


## MaintMENA — Pricing, Fee Rollout, and Billing Visibility Plan (Agent Spec)
 
> **Purpose:** Implement a clear, future-proof pricing + fee system rollout for MaintMENA without payment processing integration (initially free), while preserving billing UX visibility and collecting data for later monetization and fairness optimization.

---

### 1) Goal

Build a **pricing + fee architecture** that:

- starts with **no actual platform charges** (free period)
- keeps **billing UI visible** from day one
- stores **pricing signals** from jobs for future learning
- supports a later switch to:
  - **flat fee per job**
  - then **performance-based fee**
- avoids redesigning core data models when monetization starts

---

### 2) Non-Goals (Current Phase)

The current phase **does NOT** include:

- payment processing integration (Mada/STC Pay/Stripe/etc.)
- payment method tracking
- payment status workflows (paid/failed/refunded/etc.)
- escrow / partial payments / settlement rails
- tax/accounting-grade payout infrastructure

We are only tracking **job financial facts as reported by users** and displaying fee/billing UX.

---

### 3) Key Product Constraints (Must Respect)

### 3.1 Three money inputs only (current product reality)
The system currently has only these price inputs:

1. **Seller estimate at acceptance** (before work starts)
2. **Seller final amount after job completion**
3. **Buyer confirmed paid amount after completion**

Do **not** assume payment rails or external payment verification.

#### 3.2 Pricing uncertainty is high
Many jobs are hard to estimate before inspection. Therefore:

- do **not** force fake precision
- do **not** make early monetization depend on exact commissions
- do **not** punish sellers for inherently variable jobs

#### 3.3 Billing UI must be visible while fees are free
Even when `actual_fee = 0`, the UI should still show billing-related sections (wallet/earnings/fee lines), with clear “free for now” messaging.

---

### 4) High-Level Rollout Strategy

#### Phase 0 — Free (Data Collection + Billing Visibility)
- Platform fee charged = **SAR 0**
- Billing UI visible to all sellers
- System stores all pricing inputs + computes fee records
- Fee record exists, but `actual_fee_amount = 0`
- Optional: show simulated earnings from fees to the admins (only for admins) (not charged)

#### Phase 1 — Flat Fee Per Job
- Introduce a **single flat fee** for all sellers per job
- Prefer applying fee on **job completed**
- Keep logic simple and transparent

#### Phase 2 — Performance-Based Fee
- Fee becomes data-driven using seller performance + trust + pricing consistency
- Use collected historical data to tune fairness
- Roll out only after internal simulation and validation

---

### 5) Core Principles (Architecture + Product)

1. **Simple first, smarter later**
2. **Transparency over surprise**
3. **Fairness over fake precision**
4. **Never overwrite historical price inputs**
5. **Monetization should be a policy/config change, not a schema rewrite**
6. **Version all fee models**
7. **Use behavior + trust signals, not only job value**

---

### 6) Pricing Model (Current Data Capture)

Treat the three price inputs as **separate signals**, not one “price”.

#### Required price fields per job
- `seller_estimate_accept_amount`
- `seller_final_claim_amount`
- `buyer_confirmed_paid_amount`

These should be stored separately and never overwritten by each other.

#### Why this matters
This allows the platform to later derive:
- estimate accuracy
- uncertainty by category
- mismatch patterns
- price trust signals
- future fee fairness models

---

### 7) Buyer-Facing Price Display Strategy (No Historical Data Yet)

The system must **not** pretend to know exact expected prices when it does not.

#### Display modes (supported)
##### A) Inspection-based / high uncertainty jobs
Show:
- `Price after inspection`
- Optional wide range if configured

##### B) Lower uncertainty jobs
Show:
- `Estimated range: SAR X–Y`
- or `Starts from SAR X`

##### C) Unknown / custom jobs
Show:
- `Seller will provide estimate after reviewing details`

#### Do NOT show (for uncertain jobs)
- `Expected price: SAR 180` (fake precision, causes conflict)

#### Initial range source (bootstrapping)
Use a **manual category pricing band config**, not ML:
- category/subcategory-based min/max
- uncertainty level
- label mode (`range`, `inspection`, `starts_from`)

#### Ui/Ux design
created Ui/Ux designs throughout the app where the price shows up should properly accomodate any of these possibilites

---

### 8) Fee Strategy by Phase (Detailed)

#### 8.1 Phase 0 — Free but Billing-Ready

##### Behavior
- System computes a fee record for every completed/confirmed job
- `actual_fee_amount = 0`
- UI shows fee line as free/intro

##### Optional (recommended)
Compute and store:
- `simulated_fee_amount`
- `simulated_fee_basis`
for analytics and future tuning

##### Why
This “trains” the monetization model and validates the billing UI before charging users.

---

#### 8.2 Phase 1 — Flat Fee

##### Fee concept
A fixed SAR fee per eligible job (same for all sellers initially).

##### Preferred charge trigger (important)
Use **job completion + buyer confirmation** as the fee trigger.

**Recommended rule:**
Apply flat fee only when a job reaches a valid completed state.

---

#### 8.3 Phase 2 — Performance-Based Fee (for your context, this is to make you setup the architecture for it to be easily built in the future)

##### Goal
Adjust fees using seller performance and behavior (not just revenue).

##### Possible factors (future)
- completion consistency
- cancellation fault rate
- dispute rate
- response reliability
- estimate accuracy
- seller-vs-buyer price mismatch rate
- category-adjusted performance quality
- earnings per completed job (used carefully, not alone)

##### Important fairness rule
Do **not** base fee increases on “higher earnings per job” alone.  
Use earnings as one signal among trust + consistency signals.

---

### 9) Billing UI Visibility Requirements (Free Phase)

#### 9.1 Seller UI (must be visible even when free)
Show in job summary and wallet-like views:

- Gross amount (based on buyer-confirmed paid amount when available)
- Platform fee line:
  - `SAR 0 (Introductory period)` in Phase 0
- Net earnings


#### 9.2 Buyer UI
Buyer UI should focus on service pricing clarity, not platform fee mechanics.
Show:
- estimate range / inspection wording
- final confirmed amount (if relevant in post-job summary)
Do not introduce unnecessary buyer-facing “platform fee” concepts.

#### 9.3 Admin/Internal UI (important)
Internal reporting should support:
- simulated fees (Phase 0)
- category variance trends
- estimate vs confirmed trends
- seller pricing consistency
- fee impact simulations for future rollout

---

### 10) Data Model (Phase 0–1 Minimal Spec)

> These are **domain records**, not payment-processor settlement records.

#### 10.1 `job_financials` (1 row per job, created on eligible closure)
**Purpose:** Job-level financial summary + fee context + pricing signals

##### Required fields
- `id`
- `job_id` (unique)
- `seller_id`

##### Price inputs (source signals)
- `seller_estimate_accept_amount`
- `seller_final_claim_amount`
- `buyer_confirmed_paid_amount`

##### Fee outputs (current + future-proof)
- `fee_model_version`
- `fee_mode` (`free_intro`, `flat_fee`, `performance_fee`)
- `fee_trigger` (`buyer_confirmed_completion`, `accepted_job`, etc.)
- `actual_fee_amount`
- `simulated_fee_amount` (nullable)
- `provider_net_amount`

##### Derived pricing metrics (store or compute)
- `est_to_buyer_gap_amount`
- `est_to_buyer_gap_pct`
- `seller_to_buyer_gap_amount`
- `seller_to_buyer_gap_pct`
- `pricing_outcome_status` (`matched`, `minor_mismatch`, `major_mismatch`, `missing_confirmation`)

##### Audit/meta
- `calculated_at`
- `created_at`
- `updated_at`

---

#### 10.2 `fee_policy_versions` (config/version table)
**Purpose:** Freeze policy logic per time period

##### Fields
- `id` (e.g., `v1_free_intro`, `v2_flat_fee_15`, etc.)
- `fee_mode`
- `flat_fee_amount` (nullable)
- `performance_model_key` (nullable)
- `is_active`
- `starts_at`
- `ends_at` (nullable)
- `notes`

> Agent note: This allows future fee changes without rewriting historical job financials.

---

#### 10.3 `reputation_events` (optional now, strongly recommended)
**Purpose:** Record behavior/trust signals, including pricing behavior

##### Fields
- `id`
- `provider_id`
- `job_id`
- `event_type`
- `score_delta` (nullable if score system is not enabled yet)
- `reason`
- `metadata_json`
- `created_at`

##### Pricing-related events (examples)
- `ESTIMATE_ACCURATE`
- `ESTIMATE_MAJOR_UPLIFT`
- `SELLER_BUYER_PRICE_MATCH`
- `SELLER_BUYER_PRICE_MISMATCH`
- `BUYER_CONFIRMED_AMOUNT_MISSING`

---

#### 10.4 `category_pricing_bands` (manual bootstrap for estimate ranges)
**Purpose:** Buyer-facing estimate UX before enough real data exists

##### Fields
- `id`
- `category_id`
- `subcategory_id` (nullable)
- `city_id` (nullable, future)
- `display_mode` (`range`, `inspection`, `starts_from`)
- `min_amount` (nullable)
- `max_amount` (nullable)
- `starts_from_amount` (nullable)
- `uncertainty_level` (`low`, `medium`, `high`)
- `buyer_note` (nullable)
- `is_active`
- `created_at`
- `updated_at`

---

### 11) Domain Events / Flow (Implementation Behavior)

#### 11.1 Seller accepts job
When seller accepts:
- store `seller_estimate_accept_amount`
- optionally mark estimate confidence later (future field)
- no fee is charged here in Phase 0
- no fee should be finalized here in Phase 1 if using completion trigger

#### 11.2 Seller marks job finished
When seller marks finished:
- store `seller_final_claim_amount`
- job is not fully financially closed yet (buyer confirmation pending)

#### 11.3 Buyer confirms completion + paid amount
When buyer confirms:
- store `buyer_confirmed_paid_amount`
- trigger `job_financials` calculation/upsert
- apply current fee policy version
- create pricing/reputation events (optional but recommended)
- compute `provider_net_amount`

#### 11.4 Financial record creation trigger
Financial record should be created when all needed closure conditions are met (at minimum buyer confirmation in current plan).

---

### 12) Fee Calculation Rules (Current + Future-Proof)

#### 12.1 Fee basis (current recommendation)
For display/accounting in current plan:
- use `buyer_confirmed_paid_amount` as the gross reference when available

If buyer confirmation is missing:
- mark as `missing_confirmation`
- defer final fee record or create partial record depending on workflow design

#### 12.2 Phase 0 fee calculation
- `actual_fee_amount = 0`
- `provider_net_amount = buyer_confirmed_paid_amount`
- `simulated_fee_amount = calc_simulated_fee(policy, job)` (optional)

#### 12.3 Phase 1 flat fee calculation
- `actual_fee_amount = configured_flat_fee`
- `provider_net_amount = max(buyer_confirmed_paid_amount - actual_fee_amount, 0)`

> Agent note: Clamp at zero to avoid negative net values in edge cases.

#### 12.4 Phase 2 performance-based (placeholder)
- `actual_fee_amount = performance_fee_model(provider, job_context, policy_version)`
- do not implement live charging logic until simulation is validated

---

### 13) Feature Flags / Config Controls (Required)

Implement fee rollout via config/feature flags so product behavior changes without code rewrites.

#### Recommended flags
- `billing_ui_enabled` (default: true)
- `fee_mode` (`free_intro`, `flat_fee`, `performance_fee`)
- `flat_fee_amount` (numeric)
- `show_future_fee_preview` (bool)
- `buyer_price_display_mode_fallback` (`inspection`, `range`, etc.)
- `financial_record_requires_buyer_confirmation` (bool)

> Agent note: Prefer server-driven config (admin table/env-backed config) over hardcoded values.

---

### 14) UX Copy Requirements (Starter)

#### Seller wallet / earnings (Phase 0)
- **Platform Fee:** `SAR 0 (Introductory period)`
- **Net Earnings:** `[computed amount]`
- Optional: **Future Fee Preview:** `SAR X (not charged today)`

#### Buyer pricing
- **Estimated range:** `SAR X–Y`
- **Final price after inspection**
- or **Price after inspection** for high-uncertainty categories

#### Seller estimate prompt
- `Provide your best estimate. Final price can be updated after inspection if needed.`

---

### 15) Analytics / Data Collection Requirements (Critical for Phase 2)

The system must preserve enough data to support future fee optimization.

#### Collect per completed job
- all 3 price signals
- category/subcategory
- city/area (if available)
- seller id
- completion timestamps
- cancellation/dispute outcomes (if applicable)
- fee model version used
- simulated fee (Phase 0)
- actual fee (Phase 1+)

#### Future analysis goals
- estimate variance by category
- seller estimate accuracy distribution
- mismatch trends
- fair flat fee calibration
- performance fee simulation and retention risk analysis

---

### 16) Risks and Guardrails (Implementation + Product)

#### Risk: Fake price precision creates buyer distrust
**Guardrail:** Use inspection-based labels and ranges

#### Risk: Flat fee charged on bad cancellations feels unfair
**Guardrail:** Trigger fee on valid completion + buyer confirmation (preferred)

#### Risk: Future monetization feels like a surprise
**Guardrail:** Keep billing UI visible from day one with `SAR 0 intro` messaging

#### Risk: Performance fee appears arbitrary later
**Guardrail:** Version policies, preserve historical signals, document factors

#### Risk: Historical records break after policy changes
**Guardrail:** Store `fee_model_version` in `job_financials`, never recalc old rows blindly

---

### 17) Implementation Tasks (Agent Checklist)

#### Phase 0 (must implement now)
- [ ] Add `job_financials` table (or equivalent)
- [ ] Add `fee_policy_versions` table (or config equivalent)
- [ ] Add `category_pricing_bands` table/config
- [ ] Implement buyer pricing display logic (`inspection` / `range` / `starts_from`)
- [ ] Capture and persist the 3 price inputs separately
- [ ] Create financial record on buyer confirmation
- [ ] Compute Phase 0 financials (`actual_fee=0`)
- [ ] Render billing UI sections with free-phase messaging
- [ ] Add feature flags/config for fee mode + billing UI
- [ ] (Recommended) store `simulated_fee_amount`

#### Phase 1 prep (can be partially scaffolded now)
- [ ] Add flat fee config support
- [ ] Support `fee_mode=flat_fee`
- [ ] Ensure fee trigger is configurable (prefer buyer-confirmed completion)
- [ ] Add admin/internal analytics view for fee simulation

#### Phase 2 prep (do not fully implement yet)
- [ ] Scaffold performance fee model interface
- [ ] Add placeholders for provider performance metrics inputs
- [ ] Add reputation/pricing event recording hooks

---

## MaintMENA — Matching Engine Plan (Job Dispatch to Sellers) (Agent Spec)
 
> **Purpose:** Define how buyer job requests are matched and sent to sellers (providers) in a fair, scalable, trust-aware way for MaintMENA.

---

### 1) Goal

Build a **matching + dispatch engine** that decides:

- **which sellers** should receive a buyer’s job request
- **in what order / waves**
- **how long to wait**
- **what happens if no one responds**
- **how to avoid spam, unfair distribution, and low-quality matches**

The engine must work for an early-stage marketplace and evolve later without redesigning the entire flow.

---

### 2) Non-Goals (Current Phase)

The current phase does **NOT** require:

- route optimization / turn-by-turn maps dispatch
- dynamic surge pricing
- ML-based ranking
- real-time GPS tracking precision
- enterprise scheduling optimization
- auto-negotiation bots

We are building a strong **rule-based matching system first**.

---

### 3) Core Marketplace Reality (Must Respect)

MaintMENA is not simple taxi dispatch. Home/service jobs vary in:

- urgency
- uncertainty
- required skill
- inspection need
- time window flexibility
- trust sensitivity (buyers care who comes)

Therefore, matching should not be based on distance only.

The engine should optimize for:

1. **Service fit**
2. **Response likelihood**
3. **Reliability/trust**
4. **Fair seller opportunity**
5. **Buyer speed**
6. **Marketplace health** (avoid overloading top sellers only)

---

### 4) Matching Mental Model

The matching engine has 3 layers:

#### 4.1 Eligibility Layer
Who **can** receive this job at all?

Filter by:
- category / subcategory capability
- active status
- service area coverage
- availability (online/accepting jobs)
- account verification (if required)
- suspension / restrictions
- job type compatibility (emergency, scheduled, etc.)

#### 4.2 Ranking Layer
Among eligible sellers, who is the **best next set** to notify?

Score using rule-based ranking (weights configurable):
- distance/proximity
- response reliability
- completion reliability
- dispute/cancellation behavior
- recent workload
- fairness rotation / exposure balancing
- estimate accuracy / pricing trust (future)
- buyer preferences (future)

#### 4.3 Dispatch Strategy Layer
How do we send jobs?
- one-by-one
- small batch
- wave-based (recommended)
- escalation if no response

---

### 5) Recommended Early-Stage Dispatch Strategy (Wave-Based)

### Why wave-based?
It balances:
- speed for the buyer
- fairness for sellers
- notification noise control
- operational simplicity

#### Strategy Summary
1. Create eligible seller pool
2. Rank the pool
3. Send to **Wave 1** (top N sellers)
4. Wait for responses for a short timeout
5. If no acceptance → send **Wave 2**
6. Repeat until accepted or exhausted
7. Trigger fallback flow if no seller accepts

#### Recommended default
- **Wave 1:** 3 sellers
- **Wave 2:** next 5 sellers
- **Wave 3+:** wider radius / lower score threshold (configurable)

> Agent note: all wave sizes and timeouts must be config-driven.

---

### 6) Core Dispatch Principles (Important)

#### 6.1 Do not spam all sellers at once
Sending to everyone creates:
- seller fatigue
- low signal quality
- unfair advantage to fastest clickers only
- buyer confusion if many accept at once later

#### 6.2 Do not over-favor top sellers forever
If only the highest-rated sellers get all jobs:
- new sellers never build history
- marketplace supply stagnates
- top sellers become overloaded
- response rates may decline

#### 6.3 Reliability must matter more than star rating alone
A seller with slightly lower stars but:
- fast response
- low cancellation
- high completion consistency

may be a better match than a seller with high stars but poor operational behavior.

#### 6.4 Urgency changes the strategy
Emergency jobs should prioritize:
- speed + availability + distance

Scheduled jobs can prioritize:
- fit + reliability + fairness + calendar availability (future)

---

### 7) Inputs to the Matching Engine (Job Request Signals)

The engine receives a normalize# Buyer Active Job Card Expansion

The buyer's active job card (which shows the map and the "Provider accepted" badge) needs to become expandable to show real-time tracking (Timeline, ETA).

## Proposed Changes

### `src/components/mobile/RequestSummaryCard.tsx`
- Add an `isExpanded` state.
- Make the main card a `motion.div` that animates its layout.
- If `isProviderAssigned` is true, clicking the card will toggle `isExpanded` instead of immediately navigating to the tracking page (or we can add an expand chevron button so clicking the card itself can still navigate, or vice versa).
- Render `children` inside an `<AnimatePresence>` block that expands nicely.

### `src/components/mobile/ActiveRequestCard.tsx`
- Import and use the existing `TimelineTracker` component (or `JobProgressStepper`).
- Pass the timeline UI as `children` to `RequestSummaryCard`.
- Map the `request.status` into correct timeline steps (e.g. Scheduled, On Way, Work Started, Completed).
- Add a tiny "ETA: 15 mins" block if status is `on_the_way`.

## Verification Plan
1. Render the buyer home screen.
2. Observe the Active Request Card.
3. Click to expand and verify the timeline animation and design match the seller-side incoming request expansions.:

#### Required fields
- `job_id`
- `buyer_id`
- `category_id`
- `subcategory_id` (nullable)
- `location` (lat/lng OR area/city)
- `job_type` (`urgent`, `scheduled`, `standard`)
- `requested_time` (now / scheduled datetime)
- `created_at`

#### Optional but useful signals
- `budget_hint` (nullable)
- `description_text`
- `photo_count`
- `repeat_customer` (buyer has prior successful job history)

> Agent note: Matching engine should work even if optional fields are missing.
---

### 8) Seller State Required for Matching

The engine needs a seller/provider availability profile.

#### Required seller fields (or derived state)
- `seller_id`
- `active_status` (active / suspended / hidden)
- `is_accepting_jobs` (bool)
- `service_categories`
- `service_areas` (city/zone/polygon)
- `current_load` (active jobs count)
- `last_seen_at` / online presence signal
- `verification_status` (for now, make anyone who signs up automatically verified)

#### Reliability/trust metrics (cached)
- `response_rate`
- `acceptance_rate`
- `completion_rate`
- `cancellation_fault_rate`
- `dispute_rate`
- `avg_response_time`
- `trust_score_cached` (optional)
- `rating_avg` (optional but not primary)

#### Fairness/load metrics (cached or queryable)
- `jobs_sent_last_24h`
- `jobs_accepted_last_24h`
- `jobs_completed_last_7d`
- `recent_exposure_score`

---

### 9) Eligibility Filtering Rules (Phase 0/1)

A seller is eligible only if all required checks pass.

### 9.1 Hard filters (must pass)
- Seller is active and not suspended
- Seller is accepting jobs
- Seller supports job category/subcategory
- Seller serves buyer area/location
- Seller is not currently blocked for overload (if enabled)
- Seller is not already assigned to this job
- Seller is not in cooldown for buyer/job retries (anti-spam)

### 9.2 Optional hard filters (configurable)
- Verified-only sellers for certain categories
- Minimum trust score threshold for high-risk job categories
- Emergency-capable flag for urgent jobs
- Same-city requirement for early-stage operations

---

### 10) Ranking Model (Rule-Based, Configurable)

Use a weighted score to rank eligible sellers.

#### 10.1 Score structure (example)
`match_score = fit + reliability + responsiveness + proximity + fairness + load_balance + urgency_bonus`

#### 10.2 Suggested scoring components (initial)
##### A) Service fit score (high importance)
- category exact match
- subcategory exact match
- emergency capability match (if needed)

##### B) Reliability score (high importance)
- completion consistency
- low cancellation fault rate
- low dispute rate

##### C) Responsiveness score (high importance)
- fast response time percentile
- recent responsiveness
- online/recently active bonus

##### D) Proximity score (medium-high)
- distance to buyer location / service zone closeness
- for scheduled jobs, proximity can be lower weight

##### E) Fairness / exposure score (medium)
- boost sellers who have been under-exposed recently
- reduce overexposure of already heavily dispatched sellers

##### F) Load balance score (medium)
- avoid sellers at capacity
- slight penalty for high active workload

##### G) Urgency bonus (conditional)
- for urgent jobs, boost fast responders + close sellers

> Agent note: Keep all weights configurable via admin config.

---

### 11) Fairness Strategy (Critical for Marketplace Growth)

This is not only “nice to have”; it is core marketplace health.

#### 11.1 Problem to prevent
If the same top sellers get most requests:
- new sellers churn
- supply quality stops improving
- the marketplace becomes brittle

#### 11.2 Required fairness mechanisms (early-stage)
Implement at least one:
- **Exposure balancing bonus** (recommended)
- **Soft cap on sends per seller per time window**
- **Recent dispatch penalty** to avoid spam concentration

#### 11.3 Fairness rule philosophy
Fairness should be a **soft ranking factor**, not a hard rule that sends bad matches.
Never send a poor-quality seller just for fairness if a reliable seller is clearly better.

---

### 12) Dispatch Workflow (State Machine)

#### 12.1 Job dispatch states (recommended)
- `pending_match`
- `dispatching_wave_1`
- `dispatching_wave_2`
- `dispatching_wave_n`
- `seller_offer_sent`
- `awaiting_seller_response`
- `seller_accepted`
- `assignment_confirmed`
- `no_seller_found`
- `dispatch_expired`
- `dispatch_cancelled`

#### 12.2 Seller invitation/offer states
Per seller-job dispatch record:
- `sent`
- `delivered` (optional)
- `seen` (optional)
- `declined`
- `expired`
- `accepted`
- `auto_closed` (job accepted by another seller)
- `blocked_duplicate`

---

### 13) Core Tables / Records (Dispatch Domain)

> Naming can vary; preserve the concepts.

#### 13.1 `job_dispatch_sessions`
**Purpose:** One dispatch attempt lifecycle per buyer job request (or per rematch cycle)

##### Fields
- `id`
- `job_id`
- `dispatch_status`
- `current_wave_number`
- `eligible_count_initial`
- `accepted_seller_id` (nullable)
- `started_at`
- `ended_at` (nullable)
- `failure_reason` (nullable)
- `created_at`
- `updated_at`

---

#### 13.2 `job_dispatch_offers`
**Purpose:** Per seller invitation record (audit + analytics + anti-spam)

##### Fields
- `id`
- `dispatch_session_id`
- `job_id`
- `seller_id`
- `wave_number`
- `rank_position_at_send`
- `match_score_at_send`
- `offer_status` (`sent`, `declined`, `expired`, `accepted`, `auto_closed`)
- `sent_at`
- `expires_at`
- `responded_at` (nullable)
- `response_type` (`accept`, `decline`, `timeout`, null)
- `decline_reason` (nullable)
- `created_at`
- `updated_at`

> Agent note: This table is essential. It becomes your training data for response prediction later.

---

#### 13.3 `seller_match_snapshots` (optional now, recommended later)
**Purpose:** Freeze key metrics used in ranking at send-time for explainability and analytics

##### Fields
- `id`
- `job_dispatch_offer_id`
- `seller_id`
- `snapshot_json`
- `created_at`

---

#### 13.4 `matching_config` (or config service)
Configurable values:
- wave sizes
- wave timeout durations
- max dispatch radius/area expansion
- score weights
- hard filters
- urgency policies
- fairness controls

---

### 14) Dispatch Behavior (Detailed)

#### 14.1 On buyer job request creation
1. Normalize job request
2. Create `job_dispatch_session` with `pending_match`
3. Build eligible seller pool
4. Rank pool
5. Start Wave 1 dispatch
6. Set wave timeout
7. Listen for seller responses

#### 14.2 On seller accept
When first valid seller accepts:
1. Lock dispatch session (prevent race conditions)
2. Mark accepted seller
3. Confirm assignment
4. Auto-close outstanding offers (`auto_closed`)
5. Stop further waves

#### 14.3 On seller decline / timeout
- Update `job_dispatch_offers`
- If all offers in current wave are resolved/expired and no acceptance:
  - dispatch next wave
- If no eligible sellers remain:
  - mark `no_seller_found` and trigger fallback UX

---

### 15) Race Conditions and Concurrency (Must Handle)

This is a common failure point.

#### Problem
Multiple sellers may accept near-simultaneously.

#### Required solution
Use a server-side atomic assignment lock:
- first valid acceptance wins
- subsequent acceptances return “job already assigned”
- their offers become `auto_closed`

#### Implementation requirement
Do **not** rely on client-side timing only.  
Enforce this in backend transaction/DB lock logic.

---

### 16) Timeout and Expiry Rules

All timings must be config-driven.

#### Recommended initial defaults (example only)
- Offer expiry per wave: **60–120 sec** for urgent jobs
- Offer expiry per wave: **3–5 min** for standard jobs
- Scheduled jobs may allow longer response windows

#### Behavior on expiry
- mark offer as `expired`
- evaluate next wave
- eventually trigger `no_seller_found` fallback

---

### 17) Fallback Flows (If No Seller Accepts)

The engine must not silently fail.

#### Required fallback outcomes
- `no_seller_found` state with buyer-facing message
- option to:
  - retry dispatch
  - expand search area
  - switch to scheduled mode
  - leave request open / waitlist (future)
  - contact support (future)

#### Seller-side consideration
Avoid repeatedly sending the same ignored job to the same sellers in a short time window.

---

### 18) Matching Modes (Current + Future)

Support multiple modes even if only one is enabled now.

#### 18.1 `immediate_dispatch` (default)
Dispatch now in waves until accepted or exhausted.

#### 18.2 `scheduled_broadcast` (future)
For scheduled jobs, collect offers/proposals over a time window.

#### 18.3 `manual_review_queue` (future)
For edge cases/high-risk jobs, route to ops/admin review.

> Agent note: Design enum support now; implement only immediate dispatch.

---

### 19) Ranking Explainability (Recommended)

Store enough information to explain basic dispatch decisions internally.

#### Why
Useful for:
- debugging “why didn’t seller X get the job?”
- fairness audits
- future trust
- seller complaints resolution

#### Minimum explainability data
For each sent offer:
- score at send time
- wave number
- rank position
- key reason summary (optional string/json)

---

### 20) Anti-Abuse / Spam Controls (Early-Stage)

#### Seller-side controls
- cooldown after repeated no-response
- limit concurrent offers shown if seller is overloaded
- suppress sending same buyer duplicate requests too often

#### Buyer-side controls (basic)
- prevent rapid duplicate request spam
- dedupe near-identical requests within short window (optional)

---

### 21) Notification Architecture

Real-time notification delivery is a core product function, not a secondary concern. For a dispatch platform, a seller who misses a job offer because of a failed push notification is a direct marketplace failure.

#### 21.1 Notification Channels (Priority Order)

The system must support a configurable fallback chain per notification type. Not every notification uses every channel — the chain is triggered when the primary channel fails or goes unacknowledged within a defined window.

- Channel 1: In-app push notification (primary for all types)
- Channel 2: FCM/APNs device push (primary when app is backgrounded)

#### 21.2 Notification Types and Channel Mapping

Not all notifications warrant the full fallback chain. Classify by urgency:

- Critical (full chain, aggressive retry): job offer received, job assigned, QR confirmation requested, dispute opened, critical safety issue
- Standard (push only, no fallback): status updates, new message received, earnings update, rating received
- Informational (in-app only): weekly summary, reputation milestone, platform announcements

#### 21.3 Delivery Acknowledgement (Required for Critical Notifications)

For critical notifications, the system must track:

- `sent_at` — notification dispatched
- `delivered_at` — acknowledged by device/channel
- `opened_at` — user tapped/opened
- `expired_at` — notification window closed without response

If delivery is not acknowledged within a configurable window, trigger the next channel in the fallback chain. Do not re-send the same notification via the same channel.

#### 21.4 Job Offer Notification (Highest Priority)

Seller job offer notifications are time-critical. The offer expires if not acted on within the wave timeout. The notification must:

- Arrive within 5 seconds of dispatch (target SLA)
- Include enough context inline to allow accept/decline without opening the app (job category, area, rough time, estimated value)
- Support a quick-action reply (accept/decline directly from notification tray where platform allows)

#### 21.5 Domain Boundary

The notification service is a transport layer only. It receives events from other domains (matching engine, disputes, job lifecycle) and handles delivery. It does not make business logic decisions. The matching engine decides who gets a job offer — the notification service delivers that decision. This boundary must not be blurred.

#### 21.6 Notification Center UI

The in-app notification center (referenced in Section 8.3 Shared Screens) must:

- Group notifications by job (not chronologically by default)
- Show unread count in bottom nav badge
- Mark notifications as read on open, not on scroll
- Support deep links to the relevant screen for each notification type
- Persist notifications for at least 30 days

---

### 22) Notification Rules (Dispatch UX)

The dispatch engine should emit events; notification delivery can be handled by a separate service.

#### Events to emit
- `JOB_OFFER_SENT_TO_SELLER`
- `JOB_OFFER_EXPIRED`
- `SELLER_ACCEPTED_JOB`
- `SELLER_DECLINED_JOB`
- `JOB_ASSIGNED`
- `NO_SELLER_FOUND`

> Agent note: Keep matching logic separate from notification transport (push/SMS/WhatsApp/etc.).

---

### 23) Suggested Initial Scoring Weights (Placeholder Defaults)

> These are starting points; must be configurable and tunable.

- Service fit: **30%**
- Reliability: **25%**
- Responsiveness: **20%**
- Proximity: **15%**
- Fairness/exposure balancing: **5%**
- Load balancing: **5%**

#### Urgent job override
For urgent jobs, increase:
- proximity
- responsiveness

and reduce:
- fairness weight

---

### 24) Metrics to Track (Critical)

This engine lives or dies on metrics.

#### Buyer experience metrics
- time to first seller offer sent
- time to acceptance
- match success rate
- no-seller-found rate
- retry success rate

#### Seller marketplace metrics
- offer send rate per seller
- response rate to offers
- accept rate per offer
- decline reasons
- exposure fairness distribution

#### Ranking quality metrics
- acceptance rate by wave number
- completion rate by match score bucket
- dispute rate by match score bucket


---
