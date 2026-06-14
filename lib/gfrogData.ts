// GFROG (General Form Interrogatories) Discovery Tool Data
// For internal legal staff use in preparing formal discovery requests

export interface GFROGSection {
  id: string
  number: string
  title: string
  description?: string
  interrogatories: GFROGInterrogatory[]
}

export interface GFROGInterrogatory {
  id: string
  number: string
  label: string
  description?: string
}

export interface GFROGPreset {
  id: string
  name: string
  description: string
  sections: string[] // section IDs
  interrogatories: string[] // interrogatory IDs (e.g., "1.1", "2.1-2.13")
}

export const GFROG_SECTIONS: GFROGSection[] = [
  {
    id: 'identity',
    number: '1.0',
    title: 'Identity of Persons Answering These Interrogatories',
    interrogatories: [
      { id: '1.1', number: '1.1', label: 'Identity of persons answering' },
    ],
  },
  {
    id: 'general-individual',
    number: '2.0',
    title: 'General Background Information—Individual',
    interrogatories: [
      { id: '2.1', number: '2.1', label: 'Personal identifying information' },
      { id: '2.2', number: '2.2', label: 'Residential history' },
      { id: '2.3', number: '2.3', label: 'Employer information' },
      { id: '2.4', number: '2.4', label: 'Business entity information' },
      { id: '2.5', number: '2.5', label: 'Business name and address' },
      { id: '2.6', number: '2.6', label: 'Licensed professional information' },
      { id: '2.7', number: '2.7', label: 'Education and training' },
      { id: '2.8', number: '2.8', label: 'Conviction history' },
      { id: '2.9', number: '2.9', label: 'Bankruptcy history' },
      { id: '2.10', number: '2.10', label: 'Family relationships' },
      { id: '2.11', number: '2.11', label: 'Medical treatment history' },
      { id: '2.12', number: '2.12', label: 'Insurance information' },
      { id: '2.13', number: '2.13', label: 'Other information' },
    ],
  },
  {
    id: 'general-entity',
    number: '3.0',
    title: 'General Background Information—Business Entity',
    interrogatories: [
      { id: '3.1', number: '3.1', label: 'Organizational information' },
      { id: '3.2', number: '3.2', label: 'Principal place of business' },
      { id: '3.3', number: '3.3', label: 'Stockholders and ownership' },
      { id: '3.4', number: '3.4', label: 'Officers and directors' },
      { id: '3.5', number: '3.5', label: 'Parent and subsidiary entities' },
      { id: '3.6', number: '3.6', label: 'Insurance information' },
      { id: '3.7', number: '3.7', label: 'Bankruptcy history' },
    ],
  },
  {
    id: 'insurance',
    number: '4.0',
    title: 'Insurance',
    interrogatories: [
      { id: '4.1', number: '4.1', label: 'Insurance policy identification' },
      { id: '4.2', number: '4.2', label: 'Insurance coverage information' },
    ],
  },
  {
    id: 'injuries',
    number: '6.0',
    title: 'Physical, Mental, or Emotional Injuries',
    interrogatories: [
      { id: '6.1', number: '6.1', label: 'Nature of injuries' },
      { id: '6.2', number: '6.2', label: 'Symptoms and complaints' },
      { id: '6.3', number: '6.3', label: 'Medical treatment' },
      { id: '6.4', number: '6.4', label: 'Current condition' },
      { id: '6.5', number: '6.5', label: 'Permanency of injury' },
      { id: '6.6', number: '6.6', label: 'Medical authorization' },
      { id: '6.7', number: '6.7', label: 'Continuing medical care' },
    ],
  },
  {
    id: 'property-damage',
    number: '7.0',
    title: 'Property Damage',
    interrogatories: [
      { id: '7.1', number: '7.1', label: 'Property identification' },
      { id: '7.2', number: '7.2', label: 'Damage description' },
      { id: '7.3', number: '7.3', label: 'Repair or replacement cost' },
    ],
  },
  {
    id: 'lost-income',
    number: '8.0',
    title: 'Loss of Income or Earning Capacity',
    interrogatories: [
      { id: '8.1', number: '8.1', label: 'Employment status' },
      { id: '8.2', number: '8.2', label: 'Income history' },
      { id: '8.3', number: '8.3', label: 'Lost wages' },
      { id: '8.4', number: '8.4', label: 'Loss of earning capacity' },
      { id: '8.5', number: '8.5', label: 'Business income loss' },
      { id: '8.6', number: '8.6', label: 'Profit loss' },
      { id: '8.7', number: '8.7', label: 'Employee benefits loss' },
      { id: '8.8', number: '8.8', label: 'Calculation of damages' },
    ],
  },
  {
    id: 'other-damages',
    number: '9.0',
    title: 'Other Damages',
    interrogatories: [
      { id: '9.1', number: '9.1', label: 'Other damages' },
      { id: '9.2', number: '9.2', label: 'Calculation of other damages' },
    ],
  },
  {
    id: 'medical-history',
    number: '10.0',
    title: 'Medical History',
    interrogatories: [
      { id: '10.1', number: '10.1', label: 'Prior medical conditions' },
      { id: '10.2', number: '10.2', label: 'Prior medical treatment' },
      { id: '10.3', number: '10.3', label: 'Current medical conditions' },
    ],
  },
  {
    id: 'prior-claims',
    number: '11.0',
    title: 'Other Claims and Previous Claims',
    interrogatories: [
      { id: '11.1', number: '11.1', label: 'Prior similar claims or lawsuits' },
      { id: '11.2', number: '11.2', label: 'Other pending claims or lawsuits' },
    ],
  },
  {
    id: 'investigation-general',
    number: '12.0',
    title: 'Investigation—General',
    interrogatories: [
      { id: '12.1', number: '12.1', label: 'Investigation persons' },
      { id: '12.2', number: '12.2', label: 'Witnesses' },
      { id: '12.3', number: '12.3', label: 'Witness statements' },
      { id: '12.4', number: '12.4', label: 'Investigation reports' },
      { id: '12.5', number: '12.5', label: 'Photographs and diagrams' },
      { id: '12.6', number: '12.6', label: 'Scene inspection' },
      { id: '12.7', number: '12.7', label: 'Reconstruction or tests' },
    ],
  },
  {
    id: 'investigation-surveillance',
    number: '13.0',
    title: 'Investigation—Surveillance',
    interrogatories: [
      { id: '13.1', number: '13.1', label: 'Surveillance of plaintiff' },
      { id: '13.2', number: '13.2', label: 'Surveillance reports' },
    ],
  },
  {
    id: 'statutory-violations',
    number: '14.0',
    title: 'Statutory or Regulatory Violations',
    interrogatories: [
      { id: '14.1', number: '14.1', label: 'Statutory or regulatory violations' },
      { id: '14.2', number: '14.2', label: 'Violation consequences' },
    ],
  },
  {
    id: 'denials-defenses',
    number: '15.0',
    title: 'Denials and Special or Affirmative Defenses',
    interrogatories: [
      { id: '15.1', number: '15.1', label: 'Specific denials and affirmative defenses' },
    ],
  },
  {
    id: 'defendant-contentions',
    number: '16.0',
    title: "Defendant's Contentions—Personal Injury",
    interrogatories: [
      { id: '16.1', number: '16.1', label: 'Contention regarding liability' },
      { id: '16.2', number: '16.2', label: 'Causation' },
      { id: '16.3', number: '16.3', label: 'Proximate cause' },
      { id: '16.4', number: '16.4', label: 'Duty of care' },
      { id: '16.5', number: '16.5', label: 'Breach of duty' },
      { id: '16.6', number: '16.6', label: 'Failure to warn' },
      { id: '16.7', number: '16.7', label: 'Defective condition' },
      { id: '16.8', number: '16.8', label: 'Assumption of risk' },
      { id: '16.9', number: '16.9', label: 'Comparative negligence' },
      { id: '16.10', number: '16.10', label: 'Damages mitigation' },
    ],
  },
  {
    id: 'admissions',
    number: '17.0',
    title: 'Responses to Request for Admissions',
    interrogatories: [
      { id: '17.1', number: '17.1', label: 'Responses to request for admissions' },
    ],
  },
  {
    id: 'motor-vehicle',
    number: '20.0',
    title: 'How the Incident Occurred—Motor Vehicle',
    interrogatories: [
      { id: '20.1', number: '20.1', label: 'Date, time, and location of incident' },
      { id: '20.2', number: '20.2', label: 'Plaintiff vehicle information' },
      { id: '20.3', number: '20.3', label: 'Other vehicle information' },
      { id: '20.4', number: '20.4', label: 'Incident description' },
      { id: '20.5', number: '20.5', label: 'Visibility and weather conditions' },
      { id: '20.6', number: '20.6', label: 'Plaintiff actions before incident' },
      { id: '20.7', number: '20.7', label: 'Defendant actions before incident' },
      { id: '20.8', number: '20.8', label: 'Plaintiff actions during incident' },
      { id: '20.9', number: '20.9', label: 'Defendant actions during incident' },
      { id: '20.10', number: '20.10', label: 'Vehicle damage' },
      { id: '20.11', number: '20.11', label: 'Incident causation' },
    ],
  },
  {
    id: 'contract',
    number: '50.0',
    title: 'Contract',
    interrogatories: [
      { id: '50.1', number: '50.1', label: 'Contract formation' },
      { id: '50.2', number: '50.2', label: 'Contract terms and conditions' },
      { id: '50.3', number: '50.3', label: 'Contract performance' },
      { id: '50.4', number: '50.4', label: 'Breach of contract' },
      { id: '50.5', number: '50.5', label: 'Damages' },
      { id: '50.6', number: '50.6', label: 'Mitigation of damages' },
    ],
  },
]

export const GFROG_PRESETS: GFROGPreset[] = [
  {
    id: 'common-starter',
    name: 'Common GFROG Starter Set',
    description: 'Frequently used interrogatory groups for employment and personal injury cases',
    sections: ['identity', 'general-individual', 'general-entity', 'insurance', 'lost-income', 'other-damages', 'prior-claims', 'investigation-general', 'statutory-violations', 'denials-defenses', 'admissions'],
    interrogatories: [
      '1.1',
      '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13',
      '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7',
      '4.1', '4.2',
      '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8',
      '9.1', '9.2',
      '11.1', '11.2',
      '12.1', '12.2', '12.3', '12.4', '12.5', '12.6', '12.7',
      '14.1', '14.2',
      '15.1',
      '17.1',
    ],
  },
  {
    id: 'employment',
    name: 'Employment Law Focused',
    description: 'Tailored for employment discrimination and wrongful termination cases',
    sections: ['identity', 'general-individual', 'general-entity', 'insurance', 'lost-income', 'injuries', 'medical-history', 'prior-claims', 'investigation-general', 'denials-defenses', 'admissions'],
    interrogatories: [
      '1.1',
      '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13',
      '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7',
      '4.1', '4.2',
      '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7',
      '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8',
      '10.1', '10.2', '10.3',
      '11.1', '11.2',
      '12.1', '12.2', '12.3', '12.4', '12.5', '12.6', '12.7',
      '15.1',
      '17.1',
    ],
  },
  {
    id: 'motor-vehicle',
    name: 'Motor Vehicle Accident',
    description: 'Focused on motor vehicle accident discovery',
    sections: ['identity', 'general-individual', 'insurance', 'injuries', 'property-damage', 'lost-income', 'investigation-general', 'motor-vehicle', 'denials-defenses'],
    interrogatories: [
      '1.1',
      '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13',
      '4.1', '4.2',
      '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7',
      '7.1', '7.2', '7.3',
      '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8',
      '12.1', '12.2', '12.3', '12.4', '12.5', '12.6', '12.7',
      '20.1', '20.2', '20.3', '20.4', '20.5', '20.6', '20.7', '20.8', '20.9', '20.10', '20.11',
      '15.1',
    ],
  },
]

export function getSectionById(id: string): GFROGSection | undefined {
  return GFROG_SECTIONS.find(s => s.id === id)
}

export function getInterrogatoryById(sectionId: string, interrogatoryId: string): GFROGInterrogatory | undefined {
  const section = getSectionById(sectionId)
  return section?.interrogatories.find(i => i.id === interrogatoryId)
}

export function getPresetById(id: string): GFROGPreset | undefined {
  return GFROG_PRESETS.find(p => p.id === id)
}

export function expandInterrogatoriesFromPreset(preset: GFROGPreset): Array<{section: GFROGSection; interrogatory: GFROGInterrogatory}> {
  const result: Array<{section: GFROGSection; interrogatory: GFROGInterrogatory}> = []

  // Map interrogatory numbers (like "2.1-2.13") to actual interrogatories
  for (const num of preset.interrogatories) {
    if (num.includes('-')) {
      // Range like "2.1-2.13"
      const [start, end] = num.split('-')
      const [sectionNum] = start.split('.')
      const section = GFROG_SECTIONS.find(s => s.number.startsWith(sectionNum))
      if (section) {
        const startNum = parseInt(start.split('.')[1])
        const endNum = parseInt(end)
        for (let i = startNum; i <= endNum; i++) {
          const interrog = section.interrogatories.find(ir => ir.number === `${sectionNum}.${i}`)
          if (interrog) {
            result.push({ section, interrogatory: interrog })
          }
        }
      }
    } else {
      // Single like "1.1"
      const [sectionNum] = num.split('.')
      const section = GFROG_SECTIONS.find(s => s.number.startsWith(sectionNum))
      if (section) {
        const interrog = section.interrogatories.find(ir => ir.number === num)
        if (interrog) {
          result.push({ section, interrogatory: interrog })
        }
      }
    }
  }

  return result
}
