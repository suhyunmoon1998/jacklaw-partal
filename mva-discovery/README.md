# ⚖️ Labor Law Discovery Generator

AI-powered interrogatory generator and formal response drafting tool for employment law cases.

**Supports:**
- Discrimination cases (race, gender, age, disability, etc.)
- Wage & hour violations (overtime, meal breaks, minimum wage)
- Wrongful termination
- Harassment & retaliation
- FMLA violations
- And more...

## Quick Start

### 1. Setup

```bash
# Root directory
npm install

# Copy environment file
cp .env.example .env

# Add your Anthropic API key to .env
```

### 2. Run

```bash
npm run dev
```

The app starts on:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

### 3. Workflow

1. **Enter Case Info** - Client name, case type, employment dates, case summary
2. **Generate Interrogatories** - AI generates labor law-specific discovery questions
3. **Client Answers** - Client provides plain-language answers
4. **Formal Responses** - AI converts answers into formal interrogatory responses
5. **Export** - Copy, download, or print the finalized responses

## Features

✅ **Smart Interrogatory Generation**
- Automatically generates California CCP §2030.210 interrogatories
- Tailored to specific labor law issues (discrimination, wage violations, retaliation, etc.)
- Includes relevance explanations for each interrogatory

✅ **AI-Powered Response Drafting**
- Converts client's plain-language answers into formal legal language
- Preserves all factual content exactly
- Supports standard objection postures (standard, minimal, protective, privacy-focused)

✅ **Multi-Step Workflow**
- Step 1: Case information & issues
- Step 2: Interrogatory selection & generation
- Step 3: Client answers in plain language
- Step 4: Formal response review & export

✅ **Export Options**
- Copy to clipboard (for pasting into Word/Google Docs)
- Download as text file
- Print-friendly format

## Architecture

### Backend (Express.js)
- `server/index.js` - Express server with CORS
- `server/routes/generate.js` - POST `/api/generate-interrogatories`
- `server/routes/respond.js` - POST `/api/generate-responses`

### Frontend (React + Vite)
- `client/src/App.jsx` - Main app with state management
- `client/src/components/StepBar.jsx` - Step indicator
- `client/src/components/Step1CaseInfo.jsx` - Case information input
- `client/src/components/Step2Interrogatories.jsx` - Interrogatory generation & selection
- `client/src/components/Step3ClientAnswers.jsx` - Client answer collection
- `client/src/components/Step4DraftResponses.jsx` - Response display & export

### AI Integration
- Uses Claude Sonnet 4.6 via Anthropic API
- All API calls are server-side (API key never exposed to client)
- Supports smart filtering mode (recommended interrogatories based on case facts)

## Configuration

### Environment Variables
```
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```

### Customization

**To add case types**, edit `client/src/components/Step1CaseInfo.jsx`:
```javascript
const CASE_TYPES = [
  'Your new case type',
  // ...
]
```

**To add reported issues**, edit the same file:
```javascript
const ISSUES = [
  'Your new issue area',
  // ...
]
```

**To adjust AI behavior**, edit `server/routes/generate.js` and `server/routes/respond.js`:
- Modify the system prompt to change response style
- Adjust max_tokens for longer/shorter responses
- Change the model to claude-opus-4-1 or another Claude model

## Development

### Project Structure
```
labor-discovery-generator/
├── server/
│   ├── index.js
│   ├── routes/
│   │   ├── generate.js
│   │   └── respond.js
│   └── db.js (optional for future persistence)
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           ├── StepBar.jsx
│           ├── Step1CaseInfo.jsx
│           ├── Step2Interrogatories.jsx
│           ├── Step3ClientAnswers.jsx
│           └── Step4DraftResponses.jsx
├── package.json
├── .env.example
└── README.md
```

### Scripts
- `npm run dev` - Start both server and client
- `npm run server` - Start server only (port 3001)
- `npm run client` - Start Vite dev server only (port 5173)
- `npm run build` - Build client for production

## Important Notes

⚠️ **Attorney Review Required**
This tool generates AI drafts. **All responses must be reviewed and approved by a licensed attorney** before filing with the court. AI may hallucinate, misinterpret facts, or miss nuances of your case.

📋 **California CCP §2030.210**
Responses follow California discovery format. Adjust if serving in other jurisdictions.

🔒 **No Data Persistence**
By default, data is NOT saved anywhere. Each session is fresh. Add database persistence if you need to save cases.

## License

Created for legal practice support. Use at your own risk and in compliance with your jurisdiction's discovery rules.
