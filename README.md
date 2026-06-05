# JACKLAW Client Onboarding Portal

**Law Offices of Jack D. Josephson, APC** — California Employment Law

A mobile-first client onboarding portal built with Next.js 14, TypeScript, and Tailwind CSS.

---

## Quick Start

```bash
cd jacklaw-portal
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Login Credentials

| Client | Phone Number | Case Type |
|--------|-------------|-----------|
| Client A | `555-0001` | Wage & Hour |
| Client B | `555-0002` | Wrongful Termination |

After entering a phone number, a mock 6-digit verification code is displayed on screen (development mode only).

**Admin Panel:** Visit `/admin` — password: `admin2024`

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Login — enter phone number |
| `/verify` | OTP verification (mock) |
| `/dashboard` | Client dashboard with case status |
| `/questionnaire` | 20-section employment intake form |
| `/documents` | Document upload interface |
| `/submitted` | Confirmation page |
| `/admin` | Internal admin review panel |

---

## Project Structure

```
jacklaw-portal/
├── app/                   # Next.js App Router pages
│   ├── page.tsx           # Login
│   ├── verify/            # OTP verification
│   ├── dashboard/         # Client dashboard
│   ├── questionnaire/     # 20-section intake form
│   ├── documents/         # Document upload
│   ├── submitted/         # Thank you page
│   └── admin/             # Admin review panel
├── components/
│   └── Header.tsx         # Shared navigation header
├── lib/
│   ├── auth.ts            # Auth utilities + localStorage helpers
│   ├── mockData.ts        # Mock clients and document categories
│   └── questionnaireData.ts  # All 20 questionnaire sections
└── types/
    └── index.ts           # TypeScript type definitions
```

---

## Security Notes (Read Before Production)

This is a **development prototype** using mock authentication and browser localStorage.
Before real client use, the following MUST be implemented:

### Authentication
- Replace mock phone lookup with a secure database query (never expose client existence to the frontend)
- Implement real SMS OTP via **Twilio Verify**, **AWS SNS**, or **Firebase Auth**
- Use **httpOnly cookies** for session tokens — not localStorage
- Add rate limiting on OTP attempts (e.g., max 5 per hour per phone)
- Add CSRF protection on all form submissions

### Data Storage
- Store all client data in an encrypted backend database (PostgreSQL with RLS, or equivalent)
- Use **Supabase**, **PlanetScale**, or a custom Node.js/Python API
- Never store attorney-client privileged information in browser localStorage in production

### File Storage
- Upload files to **AWS S3** or **Google Cloud Storage** with server-side encryption (AES-256)
- Use pre-signed URLs with short expiry (15 minutes) for file access
- Implement malware scanning (ClamAV or AWS Macie) before storing files
- Restrict file access to authenticated clients and authorized firm staff only

### Admin Panel
- Replace the mock password with **Clerk**, **Auth0**, or an internal SSO provider
- Implement role-based access control (RBAC) — attorneys vs. staff vs. paralegal
- Add audit logging for all admin actions (who viewed what, when)
- Host admin panel on a separate subdomain with IP allowlisting if possible

### Legal / Compliance
- All data is subject to California attorney-client privilege
- Comply with the California State Bar's rules on client data and technology
- Consider a Business Associate Agreement (BAA) with all service providers
- Add a Terms of Use and Privacy Policy before going live
- Consult with a cybersecurity attorney regarding obligations under CCPA

### Deployment
- Use **Vercel**, **AWS Amplify**, or a dedicated server with HTTPS enforced
- Set `Content-Security-Policy`, `X-Frame-Options`, and other security headers
- Enable `robots: noindex, nofollow` (already set in layout.tsx) to prevent indexing
- Use environment variables for all secrets — never hardcode credentials

---

## Adding Real Clients

Replace the `MOCK_CLIENTS` array in `lib/mockData.ts` with an API call:

```typescript
// lib/mockData.ts → replace with:
export async function findClientByPhone(phone: string) {
  const response = await fetch('/api/clients/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
    credentials: 'include',
  })
  return response.ok ? response.json() : null
}
```

---

## Spanish Language Support

The portal is English-only for now. To add Spanish:
1. Install `next-intl` or `next-i18next`
2. Create translation files in `/messages/en.json` and `/messages/es.json`
3. Add a language toggle to the Header component
4. All questionnaire questions have been written in plain, accessible English suitable for translation

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (mobile-first)
- **State:** React hooks + localStorage (prototype only)
- **Fonts:** Inter (Google Fonts)

---

*Law Offices of Jack D. Josephson, APC · California Employment Law · Attorney-Client Confidential*
