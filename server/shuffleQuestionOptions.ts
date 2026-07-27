export function shuffleQuestionOptions(
  optionsEn: string[],
  optionsEs: string[],
  correctAnswer: number,
  rng: () => number = Math.random,
): { optionsEn: string[]; optionsEs: string[]; correctAnswer: number } {
  const n = optionsEn.length;
  const order = Array.from({ length: n }, (_, i) => i);

  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return {
    optionsEn: order.map((i) => optionsEn[i]),
    optionsEs: order.map((i) => optionsEs[i]),
    correctAnswer: order.indexOf(correctAnswer),
  };
}
