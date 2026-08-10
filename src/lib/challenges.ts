export const PUB_GOLF_CHALLENGES: string[] = [
  "Order your drink in German.",
  "Cheers a stranger before you sit down.",
  "No pointing allowed this round — mime everything.",
  "Take the group's photo before the first sip.",
  "Say 'Prost!' to three different tables.",
  "Drink this one with your non-dominant hand.",
  "Learn the bartender's name.",
  "No sitting down for the first 5 minutes.",
  "Compliment a stranger's outfit.",
  "Hum a Bavarian oompah tune between sips.",
  "Trade seats with someone in your group.",
  "Everyone in the group toasts standing up.",
  "Describe this beer like a wine snob.",
  "No phones out until you've finished this round.",
  "Invent a nickname for the next stop.",
  "Ask a local for their favorite Munich secret.",
  "Give your best Bavarian 'Grüß Gott' to the room.",
  "Buy a round for someone who isn't in your group.",
  "Balance a coaster on your head for one photo.",
  "Whoever finishes last picks the next stop.",
];

export function pickRandomChallenge(): string {
  return PUB_GOLF_CHALLENGES[Math.floor(Math.random() * PUB_GOLF_CHALLENGES.length)];
}
