export const get_crossword_share_url = (slug: string) => {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'https://krida.thesanskritchannel.org');
  return `${base.replace(/\/$/, '')}/padajala/${encodeURIComponent(slug)}`;
};

export const get_general_share_msg = (
  name: string,
  slug: string,
  description: string | null | undefined
) => {
  const puzzle_url = get_crossword_share_url(slug);
  return [
    `✨ Play Crossword — a Sanskrit crossword puzzle from The Sanskrit Channel!`,
    '',
    `🎯 ${name}` + (description ? ` : ${description}` : ''),
    '',
    `🔗 Play now:`,
    puzzle_url,
    '',
    `📝 Solve Across & Down clues — challenge a friend!`
  ].join('\n');
};

export const get_achievement_share_msg = (
  name: string,
  description: string | null | undefined,
  time_taken: string,
  accuracy: number,
  slug: string
) => {
  const puzzle_url = get_crossword_share_url(slug);
  return [
    `✨ I just solved a Crossword — a Sanskrit crossword puzzle!`,
    '',
    `🎯 ${name}` + (description ? ` : ${description}` : ''),
    `⏱️ ${time_taken} · ${accuracy}% accuracy`,
    '',
    `💪 Think you can beat my score? Give it a try!`,
    '',
    `🔗 Play now:`,
    puzzle_url,
    '',
    `📝 Solve Across & Down clues — challenge a friend!`
  ].join('\n');
};
