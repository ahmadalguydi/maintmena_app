# MaintMENA Future Ideas

Documented potential features and revenue streams for future implementation.

---

## 1. Seller QR Sticker (Marketing + Revenue)

**Concept:** Physical QR code stickers that sellers can purchase through the app and place anywhere — on their vehicle, business card, work uniform, or even leave at completed job sites.

**How it works:**
- Seller purchases a batch of personalized QR stickers from the MaintMENA store (e.g., 50 stickers for 30 SAR)
- Each sticker encodes a unique deep-link URL: `maintmena.com/s/{seller_slug}`
- When anyone scans the sticker, they see the seller's full public profile — avatar, trust level, ratings, reviews, service categories, and a prominent "Request This Provider" button
- The scan triggers a direct-to-seller request flow, bypassing normal dispatch matching — the buyer specifically chose this seller
- Analytics dashboard for the seller: how many scans, how many converted to requests

**Revenue model:**
- Sticker purchase revenue (recurring as sellers reorder)
- Increased platform adoption — every sticker is a physical ad for MaintMENA
- Sellers become marketing agents: they distribute stickers to satisfied customers, neighbors, building managers
- Higher conversion: a buyer who scans a sticker already has social proof (someone recommended this seller)

**Why it works psychologically:**
- Sellers feel ownership and agency over their customer acquisition
- Buyers trust a recommendation from a physical encounter more than an algorithm
- The sticker on a fixed appliance acts as a "warranty seal" — builds long-term trust

**Implementation notes:**
- Needs: seller public profile page (shareable URL), QR generation, sticker order system, deep-link routing
- Consider partnering with a local Saudi print shop for fulfillment
- Start with digital QR (seller shares image) before physical sticker fulfillment

---

## 2. WhatsApp-Native Sharing Cards

**Concept:** When a buyer has a great experience with a seller, they can tap "Share on WhatsApp" and the app generates a beautifully branded image card — not just a link — that auto-formats for WhatsApp sharing.

**How it works:**
- After a completed job (especially 4-5 star reviews), show a "Share with friends" prompt
- The app generates a visual card image containing:
  - Seller's avatar and name
  - Trust level badge (e.g., "Expert" with star)
  - Rating (e.g., 4.8 stars from 23 reviews)
  - Service category icons they offer
  - MaintMENA branding frame
  - A short deep-link URL at the bottom
- Card is optimized for WhatsApp preview (1200x630 or square format)
- Deep link opens the app to that seller's profile or directly to a new request pre-assigned to them

**Why it works for Saudi market:**
- WhatsApp is the primary communication tool in Saudi Arabia
- Saudis heavily rely on personal recommendations for home services
- A visual card is more shareable and trustworthy than a plain URL
- This is how Careem and Uber grew organically in the Saudi market

**Revenue potential:**
- Organic user acquisition at zero marketing cost
- Each share is a trusted recommendation with built-in social proof
- Sellers with more shares get more direct requests, increasing platform stickiness

---

## 3. Maintenance Subscriptions

**Concept:** Offer recurring maintenance plans instead of one-off requests. Buyers subscribe to regular check-ups for their home systems.

**Example plans:**
- AC Maintenance Plan: inspection + cleaning every 3 months — 899 SAR/year
- Plumbing Check-up: quarterly pipe and fixture inspection — 599 SAR/year
- Full Home Care: monthly visit covering AC, plumbing, electrical — 1,899 SAR/year

**How it works:**
- Buyer subscribes from a card on BuyerHome: "حماية بيتك على مدار السنة" (Protect your home year-round)
- System auto-schedules maintenance visits based on the plan cadence
- Assigns the same seller when possible (relationship continuity)
- Buyer gets reminders before each visit, can reschedule within a window
- If the seller finds issues during a check-up, they can create a follow-up request at a discounted rate

**Revenue model:**
- Subscription revenue with predictable monthly cashflow
- Higher LTV per buyer (annual vs one-time)
- Sellers get guaranteed recurring income — reduces churn
- MaintMENA takes a platform fee on each subscription

**Saudi market fit:**
- AC maintenance is mandatory in Riyadh's climate (45°C+ summers)
- Many homeowners forget routine maintenance until something breaks — subscriptions prevent that
- Villa owners (target demographic) typically have 4-8 AC units that all need regular servicing

---

## 4. Seller Boost (Priority Matching)

**Concept:** Sellers can pay a weekly fee to get priority positioning in the dispatch wave matching algorithm.

**How it works:**
- Seller activates "Boost" from their home screen for 20-50 SAR/week
- Boosted sellers appear first in wave dispatch for their categories and service areas
- Show ROI metrics: "Boosted sellers earn 40% more per week on average"
- Visual indicator on the seller's profile: "Priority Provider" badge
- Boost is non-exclusive — multiple sellers in the same area can boost

**Revenue model:**
- Pure margin revenue (no fulfillment cost)
- Self-selecting: only active, motivated sellers will boost, improving match quality
- Creates a positive feedback loop: boost → more jobs → more reviews → higher trust → more organic jobs

**Pricing tiers:**
- Basic Boost (20 SAR/week): priority in standard dispatch waves
- Pro Boost (50 SAR/week): priority + featured placement in buyer search results
- Category Boost (30 SAR/week per category): priority only for specific service categories

**Safeguards:**
- Boosted sellers must maintain a minimum rating (3.5+) to prevent pay-to-win degradation
- Display transparency: buyers should not feel they're getting a worse match because someone paid more
- The algorithm still prioritizes proximity and skill match — boost is a tiebreaker, not an override
