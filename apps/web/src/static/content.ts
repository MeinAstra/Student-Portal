// Verbatim passages selected from the earliest available exported portal draft.
// The private source comparison and editorial exclusions are documented outside this repository.
export type Passage = { heading: string; paragraphs?: string[]; items?: string[] };
export type OriginalPage = { id: string; title: string; sections: Passage[] };

export const originalPages: OriginalPage[] = [
  {
    id: "health",
    title: "Health & Emergency Resources",
    sections: [
      {
        heading: "Purpose",
        paragraphs: ["This resource is an awareness and navigation guide for secondary-school students. It helps a student answer three questions:"],
        items: ["Is this urgent?", "What safe action can I take now?", "Who can provide the right help?"]
      },
      {
        heading: "You Do Not Have to Carry It Alone",
        paragraphs: [
          "Stress, sadness, anxiety, anger, numbness, and difficult periods are human experiences. Support becomes especially important when the burden feels heavy, continues, gets worse, or interferes with safety, sleep, eating, school, relationships, or activities you normally value."
        ]
      },
      { heading: "Friends and classmates can:", items: ["Listen without judging", "Keep you company and help you feel less alone", "Help you contact an adult or professional", "Walk with you to the counseling or health office"] },
      { heading: "Friends cannot be expected to:", items: ["Diagnose or provide therapy", "Keep a secret when someone may be unsafe", "Be available at all times", "Carry responsibility for another person's survival or recovery"] },
      {
        heading: "How to Support a Friend Responsibly",
        paragraphs: [
          "Say: \"I am glad you told me.\" \"You deserve support.\" \"I can go with you.\" Ask directly if they are in immediate danger when you are worried. Listen more than you investigate. Do not demand details, debate their feelings, diagnose them, or make yourself their only support.",
          "Set a kind boundary: \"I care about you, and this is bigger than what I can handle alone. Let's bring in someone trained.\" Safety overrides secrecy when someone may be harmed."
        ]
      },
      {
        heading: "Consent and Bodily Autonomy",
        paragraphs: [
          "Everyone has the right to set boundaries around their body, personal space, relationships, images, and private information. Consent should be freely given, specific, informed, and reversible. Silence, freezing, pressure, manipulation, intoxication, fear, or a past \"yes\" is not current consent. A person can change their mind at any time."
        ]
      },
      {
        heading: "Health Information Without Shame",
        paragraphs: [
          "A diagnosis is health information, not a moral judgment. Do not shame, joke about, expose, or speculate about another person's mental health, body, disability, gender, sexual orientation, infection, medication, or care.",
          "Accurate, age-appropriate health education does not require students to disclose personal experiences. Students should know where to obtain confidential, nonjudgmental clinical advice; understand that privacy rules for minors differ by location; avoid sharing intimate images; respect every \"no\"; and never pressure someone to disclose a diagnosis or history."
        ]
      },
      {
        heading: "For Students",
        paragraphs: [
          "Your health profile should not be public or visible in a general student directory. Share the minimum needed with the right person. Before entering sensitive information, check:"
        ],
        items: ["Who can see it?", "Why is it needed?", "How long is it kept?", "Can I correct or delete it?", "Will a parent/guardian be notified, and under what rules?", "What happens if someone may be in danger?"]
      },
      { heading: "", paragraphs: ["Do not store passwords, photographs of prescriptions, detailed therapy notes, or unnecessary diagnostic history in a general portal profile."] },
      {
        heading: "For Portal Owners",
        items: [
          "Collect only information with a defined safety purpose",
          "Use role-based access; students see their own data, and only authorized health/safeguarding staff see what their role requires",
          "Keep an access log and a clear correction/deletion process",
          "Separate ordinary portal content from sensitive health records",
          "Encrypt data in transit and at rest; do not place sensitive data in analytics, email previews, or notification text",
          "Publish a plain-language privacy notice and retention period",
          "State the limits of confidentiality, including urgent safety and legal/safeguarding duties",
          "Do not add symptom diagnosis, risk scoring, or AI analysis without clinical, legal, privacy, and school approval"
        ]
      }
    ]
  },
  {
    id: "wellbeing",
    title: "Psychology & Well-being",
    sections: [
      {
        heading: "Preparing for Your Conversation (Optional)",
        paragraphs: [
          "You do not need to wait until a problem becomes a crisis before asking for support.",
          "You do not need to prepare a formal document or explain everything perfectly before asking for help. When contacting the counseling center, you may briefly share:"
        ]
      },
      {
        heading: "1. What has been happening?",
        paragraphs: ["Examples:"],
        items: [
          "— \"I have been feeling stressed recently.\"",
          "— \"I have difficulty focusing in class.\"",
          "— \"Something happened that made me uncomfortable.\"",
          "— \"I have been worried about something and I don't know how to handle it.\""
        ]
      },
      {
        heading: "2. How is it affecting you?",
        paragraphs: ["You may describe changes you have noticed:"],
        items: ["— Sleep", "— Mood", "— Concentration", "— Relationships", "— School life", "— Daily activities"]
      },
      { heading: "", paragraphs: ["Example:", "\"I used to enjoy this activity, but recently I don't feel interested anymore.\""] },
      {
        heading: "3. What kind of support are you looking for?",
        paragraphs: ["You can say:"],
        items: [
          "— \"I want someone to listen.\"",
          "— \"I want advice on how to handle this situation.\"",
          "— \"I want to understand my feelings better.\"",
          "— \"I am not sure what I need, but I know I need support.\""
        ]
      },
      {
        heading: "4. What information should you avoid sharing publicly?",
        paragraphs: ["For your privacy:"],
        items: [
          "— Do not write sensitive personal details in public forms or places visible to other students.",
          "— If you need to discuss personal experiences, health information, family situations, or safety concerns, please communicate directly with the counselor or appropriate staff."
        ]
      }
    ]
  },
  {
    id: "safety",
    title: "Community Safety",
    sections: [
      {
        heading: "You can ask for help before you have the right label.",
        paragraphs: ["If something felt threatening, humiliating, sexual, discriminatory, coercive, or unsafe, speak with a trusted adult. You do not need perfect proof, witnesses, or a complete memory before asking for support."]
      },
      {
        heading: "The Community Standard",
        paragraphs: [
          "A safe school is built through everyday conduct and through a reliable response when someone is harmed.",
          "You will not agree with every opinion, school decision, teaching style, or classmate. Respect means handling disagreement without humiliation, intimidation, pressure, exclusion, or personal abuse. You may criticize an idea or decision. You may not turn a person into a target.",
          "Students deserve safety, fair treatment, and a meaningful opportunity to be heard. Teachers and staff deserve to work without harassment or personal abuse. A person's role changes their responsibilities, not their basic dignity.",
          "Intent helps explain an action, but it does not erase its impact. A person can cause harm without planning to. Once a boundary is communicated or discomfort is clear, continuing is a choice."
        ]
      },
      {
        heading: "Know the Differences",
        paragraphs: ["Labels can help us respond, but they must never become barriers to support. A situation may fit more than one category."]
      },
      {
        heading: "Boundaries & Consent",
        paragraphs: [
          "A boundary is a limit that protects physical space, privacy, personal information, comfort, identity, or emotional wellbeing.",
          "Consent is a clear and voluntary agreement to a particular action. Pressure, fear, manipulation, intoxication, incapacity, or an authority imbalance can make genuine agreement impossible. Consent can be withdrawn at any time."
        ]
      },
      {
        heading: "Harassment",
        paragraphs: [
          "Harassment is not made harmless by calling it a joke, tradition, rumor, compliment, or private conversation.",
          "Bullying definitions usually emphasize repetition and a power imbalance. Harassment, sexual misconduct, threats, assault, discriminatory conduct, or another serious breach may require action after one incident. Do not assume \"it only happened once\" means it should be ignored."
        ]
      },
      {
        heading: "Discrimination & Identity-Based Harm",
        paragraphs: [
          "Differences between people must never become reasons for humiliation, exclusion, inferior treatment, or abuse.",
          "Questions about identity can be respectful when the other person is willing to discuss them. No student owes classmates personal explanations, private information, or permission to debate their identity.",
          "Assuming that someone is naturally less capable, dangerous, dishonest, unintelligent, overly emotional, or responsible for the actions of a group can shape exclusion and unequal treatment."
        ]
      },
      {
        heading: "Bullying, Groups & Power",
        paragraphs: [
          "Bullying involves unwanted aggression, a power imbalance, and repetition or a strong likelihood that the behavior will be repeated."
        ],
        items: [
          "social influence, popularity, seniority, or control of a group;",
          "greater physical size, strength, numbers, or access to weapons;",
          "authority, leadership, special access, or control of opportunities;",
          "knowledge of private information, images, passwords, or secrets;",
          "language ability, confidence, wealth, technology access, or social connections."
        ]
      },
      { heading: "Why students may not report", paragraphs: ["A student may fear retaliation, loss of friends, being called weak, not being believed, losing device access, exposing private information, or making the situation bigger. Adults should respond calmly and should not blame a student for waiting."] },
      {
        heading: "Violence, Threats & Coercion",
        paragraphs: [
          "Violence can be physical, sexual, psychological, or technology-facilitated. Threats and coercion can cause serious harm even when no physical injury occurs.",
          "Coercion can involve threats, blackmail, persistence after refusal, social punishment, authority, money, grades, access, secrets, emotional manipulation, or exploiting intoxication or vulnerability."
        ]
      },
      {
        heading: "Online Harm & Digital Boundaries",
        paragraphs: [
          "Online behavior affects real people. Private groups, anonymous accounts, gaming spaces, and disappearing messages do not remove responsibility.",
          "Content may disappear or be unsafe to capture. Report what you remember. A student should never be required to keep viewing harmful material in order to prove what happened."
        ]
      },
      {
        heading: "Respond, Witness & Take Responsibility",
        paragraphs: [
          "There is no single perfect reaction. Choose the safest next step available to you.",
          "Name what you did. Recognize the impact. Avoid excuses. Explain the specific change you will make. Respect that the other person may not want contact or immediate forgiveness."
        ]
      }
    ]
  },
  {
    id: "daily-life",
    title: "Daily Life Help",
    sections: [
      { heading: "Housing & Accommodation", items: ["Dormitory rules and regulations", "Room maintenance requests", "Roommate conflict resolution", "Housing contract information"] },
      { heading: "Dining Services", items: ["Meal plan information", "Cafeteria hours and menus", "Dietary accommodations", "Food allergy support"] },
      { heading: "Transportation", items: ["Campus shuttle schedule", "Public transport passes", "Bike rental program", "Parking permits"] },
      { heading: "Technology Support", items: ["WiFi access and troubleshooting", "School email setup", "Learning platform support", "Device recommendations"] },
      { heading: "Mail & Packages", items: ["Package pickup procedures", "Mail forwarding services", "Shipping guidelines", "Lost package assistance"] },
      { heading: "Maintenance & Repairs", items: ["Report facility issues", "Emergency maintenance", "Equipment requests", "Cleaning services"] }
    ]
  }
];
