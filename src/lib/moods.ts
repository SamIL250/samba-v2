export type MoodGender = "female" | "male";

export const PARTNER_MOODS = {
  happy: {
    label: "Happy",
    blurb: "Feeling bright",
    illustrations: {
      female: "/brand/moods/happy.png",
      male: "/brand/moods/happy-male.png",
    },
  },
  chilling: {
    label: "Chilling",
    blurb: "Taking it easy",
    illustrations: {
      female: "/brand/moods/chilling.png",
      male: "/brand/moods/chilling-male.png",
    },
  },
  sad: {
    label: "Sad",
    blurb: "Could use a soft note",
    illustrations: {
      female: "/brand/moods/sad.png",
      male: "/brand/moods/sad-male.png",
    },
  },
  sleeping: {
    label: "Sleeping",
    blurb: "Catching rest",
    illustrations: {
      female: "/brand/moods/sleeping.png",
      male: "/brand/moods/sleeping-male.png",
    },
  },
  working: {
    label: "Working",
    blurb: "In the zone",
    illustrations: {
      female: "/brand/moods/working.png",
      male: "/brand/moods/working-male.png",
    },
  },
  sports: {
    label: "Sports",
    blurb: "Moving the body",
    illustrations: {
      female: "/brand/moods/sports.png",
      male: "/brand/moods/sports-male.png",
    },
  },
  intimate: {
    label: "Intimate",
    blurb: "Feeling close",
    illustrations: {
      female: "/brand/moods/intimate.png",
      male: "/brand/moods/intimate-male.png",
    },
  },
  missing: {
    label: "Missing you",
    blurb: "Thinking of you",
    illustrations: {
      female: "/brand/moods/missing.png",
      male: "/brand/moods/missing-male.png",
    },
  },
  cooking: {
    label: "Cooking",
    blurb: "In the kitchen",
    illustrations: {
      female: "/brand/moods/cooking.png",
      male: "/brand/moods/cooking-male.png",
    },
  },
  cleaning: {
    label: "Cleaning",
    blurb: "Tidying up",
    illustrations: {
      female: "/brand/moods/cleaning.png",
      male: "/brand/moods/cleaning-male.png",
    },
  },
  studying: {
    label: "Studying",
    blurb: "Head in books",
    illustrations: {
      female: "/brand/moods/studying.png",
      male: "/brand/moods/studying-male.png",
    },
  },
  sick: {
    label: "Sick",
    blurb: "Under the weather",
    illustrations: {
      female: "/brand/moods/sick.png",
      male: "/brand/moods/sick-male.png",
    },
  },
} as const;

export type PartnerMoodKey = keyof typeof PARTNER_MOODS;

export function isPartnerMoodKey(value: string): value is PartnerMoodKey {
  return value in PARTNER_MOODS;
}

export function isMoodGender(value: string): value is MoodGender {
  return value === "female" || value === "male";
}

export function partnerMoodMeta(key: PartnerMoodKey) {
  return PARTNER_MOODS[key];
}

export function partnerMoodIllustration(
  key: PartnerMoodKey,
  gender: MoodGender = "female",
) {
  return PARTNER_MOODS[key].illustrations[gender];
}
