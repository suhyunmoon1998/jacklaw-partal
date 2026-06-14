# GFROG Discovery Tool Implementation

## Overview
Added two integrated features to JackLaw Portal:
1. **Internal GFROG Builder** - For legal staff to create formal discovery interrogatory sets
2. **Client-Facing Intake Form** - Already exists at `/intake` (client-friendly questionnaire)

---

## FILES ADDED / MODIFIED

### New Files Created:

1. **`lib/gfrogData.ts`** (NEW)
   - Contains all GFROG section definitions and interrogatory data
   - 16 major sections (Identity, General Background, Insurance, Injuries, Property Damage, etc.)
   - Pre-defined presets:
     - "Common GFROG Starter Set"
     - "Employment Law Focused"
     - "Motor Vehicle Accident"
   - Helper functions:
     - `getSectionById()` - Get section by ID
     - `getInterrogatoryById()` - Get specific interrogatory
     - `getPresetById()` - Get preset by ID
     - `expandInterrogatoriesFromPreset()` - Expand range notation (e.g., "2.1-2.13")

2. **`app/admin/gfrog/page.tsx`** (NEW)
   - Internal GFROG builder tool page
   - Route: `/admin/gfrog`
   - Features:
     - Case information input (matter name, parties, set number, notes)
     - Quick-start preset selector
     - Full interrogatory selection checklist
     - Real-time preview panel
     - Copy-to-clipboard and print functions
     - Preview modal with formatted output

### Files Modified:

1. **`app/admin/page.tsx`** (MODIFIED)
   - Added "GFROG Builder" quick-access button
   - Button appears below header, links to `/admin/gfrog`
   - Styled with blue theme to differentiate from other admin functions

---

## ROUTING & NAVIGATION

### New Routes:
- **`/admin/gfrog`** - Internal GFROG Discovery Builder
  - Protected area (part of admin panel)
  - Requires admin authentication (same as main admin page)
  - Header matches admin styling with logo and back button

### Existing Client Routes (Unchanged):
- **`/intake`** - Client-facing intake questionnaire form
  - Plain-English, client-friendly
  - 18 sections with ~80 questions
  - Auto-saves drafts to localStorage
  - Supports English/Spanish

### Navigation Flow:
```
Admin Portal (/admin)
├── Clients tab
├── Intake Submissions tab
└── GFROG Builder button → /admin/gfrog
    ├── Create case information
    ├── Select interrogatories
    └── Generate/copy/print preview
```

---

## DATA STRUCTURE

### GFROG Sections (lib/gfrogData.ts)

16 major sections with numbered interrogatories:

1. **1.0 Identity of Persons**
   - 1.1: Identity of persons answering

2. **2.0 General Background—Individual**
   - 2.1-2.13: Personal info, residential history, education, convictions, etc.

3. **3.0 General Background—Business Entity**
   - 3.1-3.7: Organization info, ownership, directors, bankruptcy, etc.

4. **4.0 Insurance**
   - 4.1-4.2: Policy identification, coverage

5. **6.0 Physical, Mental, Emotional Injuries**
   - 6.1-6.7: Nature, symptoms, treatment, permanency

6. **7.0 Property Damage**
   - 7.1-7.3: Property ID, damage description, repair costs

7. **8.0 Loss of Income or Earning Capacity**
   - 8.1-8.8: Employment status, income loss, earning capacity

8. **9.0 Other Damages**
   - 9.1-9.2: Other damages and calculations

9. **10.0 Medical History**
   - 10.1-10.3: Prior conditions, treatment, current conditions

10. **11.0 Other Claims and Previous Claims**
    - 11.1-11.2: Prior claims/lawsuits

11. **12.0 Investigation—General**
    - 12.1-12.7: Investigators, witnesses, statements, reports, photos

12. **13.0 Investigation—Surveillance**
    - 13.1-13.2: Surveillance of party, reports

13. **14.0 Statutory or Regulatory Violations**
    - 14.1-14.2: Violations and consequences

14. **15.0 Denials and Affirmative Defenses**
    - 15.1: Specific denials and defenses

15. **16.0 Defendant's Contentions—Personal Injury**
    - 16.1-16.10: Liability, causation, breach, defenses, damages

16. **17.0 Responses to Request for Admissions**
    - 17.1: Responses

17. **20.0 How Incident Occurred—Motor Vehicle**
    - 20.1-20.11: Date, time, location, vehicle info, incident description

18. **50.0 Contract**
    - 50.1-50.6: Formation, terms, performance, breach, damages

### Presets (lib/gfrogData.ts)

**1. Common GFROG Starter Set**
- ~37 interrogatories
- Covers: Identity, General Info, Insurance, Income, Damages, Investigation, Defenses, Admissions

**2. Employment Law Focused**
- ~40 interrogatories
- Includes: Medical history, injuries (for harassment/discrimination cases)
- Excludes: Motor vehicle interrogatories

**3. Motor Vehicle Accident**
- ~45 interrogatories
- Heavy emphasis on: Motor vehicle sections (20.1-20.11)
- Includes: Injuries, property damage, investigation
- Excludes: Employment-specific sections

---

## USAGE

### For Legal Staff (Internal GFROG Tool)

1. **Navigate to GFROG Builder**
   - From Admin Portal, click "GFROG Builder" button
   - Or visit `/admin/gfrog` directly

2. **Fill Case Information**
   - Matter/Case Name (e.g., "Smith v. ABC Corporation")
   - Propounding Party (e.g., "Plaintiff")
   - Responding Party (e.g., "Defendant")
   - Set Number (defaults to 1)
   - Optional notes for additional instructions

3. **Select Interrogatories**
   - Use quick-start presets (buttons at top)
   - Or manually select individual interrogatories
   - Use "Select All" / "Clear All" buttons
   - View real-time count in preview panel

4. **Generate & Export**
   - Click "Generate Preview" to see formatted output
   - In preview modal:
     - **Copy to Clipboard** - Copy plain text for pasting into documents
     - **Print** - Print-friendly version
     - **Close** - Return to builder

### For Clients (Intake Form - Existing)

1. **Access Intake Form**
   - Visit `/intake` from home portal
   - Enter email to save/load draft
   - Complete 18 sections of plain-English questions

2. **Submit to Admin**
   - Submit form
   - Admin receives notification
   - Appears in "Intake Submissions" tab in admin portal
   - Staff can review, add notes, and mark as reviewed

---

## EDITING & CUSTOMIZATION

### To Edit GFROG Interrogatory Questions:

**File:** `lib/gfrogData.ts`

In the `GFROG_SECTIONS` array, find the section and update the `label` field:

```typescript
{
  id: '8.1',
  number: '8.1',
  label: 'Employment status and history',  // ← Change this
  description?: 'Optional description'      // ← Or add context here
}
```

To add descriptions/explanations (currently optional):
```typescript
{
  id: '8.1',
  number: '8.1',
  label: 'Employment status and history',
  description: 'Include current and recent prior employment details'
}
```

### To Add New Interrogatory Sections:

1. Add new section object to `GFROG_SECTIONS`:
```typescript
{
  id: 'new-section-id',
  number: '21.0',
  title: 'New Section Title',
  interrogatories: [
    { id: '21.1', number: '21.1', label: 'Question about X' },
    { id: '21.2', number: '21.2', label: 'Question about Y' },
  ]
}
```

2. Use in presets by adding section IDs to the `sections` array

### To Add New Presets:

In `GFROG_PRESETS` array, add new preset:

```typescript
{
  id: 'my-custom-preset',
  name: 'My Custom Preset',
  description: 'Description of when to use this',
  sections: ['identity', 'general-individual', ...],
  interrogatories: [
    '1.1',
    '2.1', '2.2', '2.3',
    // Range notation works: '2.1-2.13'
  ]
}
```

### To Modify Intake Form Questions:

**Files:** 
- `lib/intakeFormData.ts` (English)
- `lib/intakeFormDataEs.ts` (Spanish)

Each section contains an array of questions. Modify any question object:

```typescript
{
  id: 'legal_name',
  label: 'Full Legal Name',  // ← Change question text
  type: 'text',              // ← Change input type
  required: false,           // ← Already removed by user
  placeholder: 'As it appears on your ID'
}
```

---

## TECHNICAL ARCHITECTURE

### Reusable Components & Patterns

**State Management:**
- Uses React hooks (useState) for local state
- No backend required (client-side only)
- localStorage for intake form persistence (existing pattern)

**Styling:**
- Matches existing JackLaw Portal design
- Tailwind CSS with gold/navy/gray theme
- Responsive grid layout (1 col mobile, 3 col desktop)
- Hover states, transitions, focus styles

**Data Architecture:**
- Data-driven configuration (not hardcoded into components)
- Easy to extend with new sections/interrogatories
- Reusable `expandInterrogatoriesFromPreset()` utility

**UI Patterns:**
- Modal for previews (matches existing submission detail modal)
- Tab-based navigation (matches admin page)
- Checkbox lists with select all/clear all (matches form builder pattern)
- Copy-to-clipboard with feedback (matches existing pattern)

---

## ASSUMPTIONS & NOTES

1. **No Backend Required** - Both features use localStorage and client-side state. Ready to integrate with a backend API later.

2. **GFROG Content** - The interrogatory labels use neutral descriptive text. Full official Judicial Council language can be added later without changing the data structure.

3. **Authentication** - GFROG tool is admin-only (same access level as existing admin page). The intake form is public/client-facing.

4. **Persistence** - GFROG sets are not persisted (built on-demand). Could add localStorage save/load for frequently-used sets if needed.

5. **Localization** - Currently English only. Can add Spanish translations to GFROG sections and interface following the existing i18n pattern.

6. **Export Formats** - Currently supports copy-to-clipboard and print. Could add PDF export using existing pattern if available.

---

## VERIFICATION CHECKLIST

✅ Build compiles successfully
✅ No TypeScript errors
✅ New route `/admin/gfrog` accessible
✅ GFROG data structure complete with 16 sections
✅ 3 presets defined and functional
✅ Integration with admin page via quick-access button
✅ Intake form unchanged and functional at `/intake`
✅ Both features share consistent styling and architecture
✅ localStorage used (matching existing project pattern)
✅ Responsive design (mobile/tablet/desktop)

---

## NEXT STEPS (OPTIONAL)

- Add ability to save/load frequently-used GFROG sets
- Export to PDF (if PDF library available)
- Add Spanish translations
- Connect to backend API for persistence
- Add email notification when GFROG set is created
- Add audit log for discovery requests
- Add template library for common case types

---

## CONTACT & SUPPORT

For questions about the GFROG tool or intake form, refer to:
- GFROG Data: `lib/gfrogData.ts`
- GFROG Page: `app/admin/gfrog/page.tsx`
- Admin Integration: `app/admin/page.tsx` (lines showing GFROG button)
- Intake Form: `app/intake/page.tsx`

