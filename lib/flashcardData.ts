import { FlashcardDeck } from '@/types'

export const FLASHCARD_DECKS: FlashcardDeck[] = [
  {
    id: 'gfrogs-101',
    title: 'General Form Interrogatories (GFROGs)',
    description: 'Essential discovery questions used in California civil litigation',
    createdAt: '2024-01-15',
    cards: [
      {
        id: 'gfrog-1',
        front: 'What does GFROGs stand for?',
        back: 'General Form Interrogatories — standardized discovery questions used in California civil cases.',
      },
      {
        id: 'gfrog-2',
        front: 'What is the primary purpose of GFROGs?',
        back: 'To obtain standardized discovery information efficiently by providing a uniform set of questions that parties can ask each other during litigation.',
      },
      {
        id: 'gfrog-3',
        front: 'What types of information do GFROGs typically request?',
        back: 'Background facts, witness information, document identification, damages calculations, liability facts, and details about incidents or events at issue in the case.',
      },
      {
        id: 'gfrog-4',
        front: 'Are GFROGs mandatory or optional?',
        back: 'GFROGs are permitted under California Code of Civil Procedure § 33.010 and are commonly used in most civil cases, though parties may agree to modify or supplement them.',
      },
      {
        id: 'gfrog-5',
        front: 'What is a common employment-related GFROG?',
        back: 'State the name, address, and telephone number of your present employer or place of self-employment, and describe your employment history for the relevant period.',
      },
      {
        id: 'gfrog-6',
        front: 'What does Form Interrogatory 12.1 generally request?',
        back: 'Information about witnesses who have knowledge of the incidents, events, or transactions at issue, including their names, addresses, phone numbers, and what they witnessed.',
      },
      {
        id: 'gfrog-7',
        front: 'How many standard GFROGs are available for use?',
        back: 'There are approximately 20 form interrogatories in the standard form, though the exact number and content depend on the type of case (personal injury, employment, contract, etc.).',
      },
      {
        id: 'gfrog-8',
        front: 'Can a party object to a GFROG?',
        back: 'Yes. A party can object to GFROGs on grounds such as privilege, trade secrets, undue burden, or if the question is not relevant to the case.',
      },
      {
        id: 'gfrog-9',
        front: 'What is the typical deadline for responding to GFROGs?',
        back: 'Responses are typically due within 30 days of service, unless the parties agree otherwise or the court sets a different deadline.',
      },
      {
        id: 'gfrog-10',
        front: 'Why are GFROGs useful in employment law cases?',
        back: 'They provide a structured way to gather foundational information about employment dates, pay, hours worked, witnesses, and relevant documents — all critical in wage and discrimination claims.',
      },
      {
        id: 'gfrog-11',
        front: 'What information might GFROGs request about damages?',
        back: 'Information about lost wages, medical expenses, lost benefits, pain and suffering, emotional distress, and other damages the party claims to have suffered.',
      },
      {
        id: 'gfrog-12',
        front: 'Are responses to GFROGs verified?',
        back: 'Yes. Responses must be verified (signed under oath) by the party or authorized representative, subject to penalties of perjury if the information is false.',
      },
      {
        id: 'gfrog-13',
        front: 'What is the difference between GFROGs and interrogatories?',
        back: 'GFROGs are standardized form interrogatories created for broad use in California civil cases, while custom interrogatories are tailored by attorneys for a specific case.',
      },
      {
        id: 'gfrog-14',
        front: 'Can GFROGs be supplemented?',
        back: 'Yes. A party must supplement responses to GFROGs if they obtain new information that makes prior responses incomplete or inaccurate.',
      },
      {
        id: 'gfrog-15',
        front: 'What is Form Interrogatory 2.1 typically about?',
        back: 'Identification of documents — asking the responding party to describe all documents in their possession, custody, or control related to the subject matter of the case.',
      },
    ],
  },
]

export function getDeckById(deckId: string): FlashcardDeck | undefined {
  return FLASHCARD_DECKS.find(d => d.id === deckId)
}

export function getAllDecks(): FlashcardDeck[] {
  return FLASHCARD_DECKS
}
