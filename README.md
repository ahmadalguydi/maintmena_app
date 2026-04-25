# MaintMENA

On-demand maintenance dispatch for Saudi Arabia.

MaintMENA is an Uber-like maintenance app. Customers submit a maintenance request, MaintMENA dispatches a verified professional, and both sides track the job through assignment, arrival, work, completion, approval, and review.

## Product Model

- Customers request maintenance service from the app.
- Pros receive dispatched jobs based on role, service coverage, availability, and operational rules.
- Admins monitor users, jobs, reports, disputes, dispatch, demand, financials, and service quality.
- The app is bilingual and built for web plus Capacitor mobile shells.

## Tech Stack

- React 18, TypeScript, Vite
- Supabase auth, database, realtime, and edge functions
- TanStack Query
- React Router
- Tailwind CSS and shadcn/Radix UI
- Capacitor for native mobile features

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

## Product Guardrails

Older content-library and lead-generation surfaces are intentionally retired and should not be reintroduced into product copy or routes.
