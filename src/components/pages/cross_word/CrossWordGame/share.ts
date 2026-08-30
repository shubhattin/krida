export const get_crossword_share_url = (slug: string) => {
  const base =
    import.meta.env.VITE_SITE_URL ??
    (import.meta.env.SSR
      ? 'https://krida.thesanskritchannel.org'
      : window.location.origin);
  return `${base.replace(/\/$/, '')}/padajala/${encodeURIComponent(slug)}`;
};

export const get_general_share_msg = (name: string, slug: string, description: string) => {
  const puzzle_url = get_crossword_share_url(slug);
  return [
    `✨ Play Padajāla — a Sanskrit Crossword puzzle`,
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
  description: string,
  time_taken: string,
  accuracy: number,
  slug: string
) => {
  const puzzle_url = get_crossword_share_url(slug);
  return [
    `✨ I just solved a Padajāla — a Sanskrit Crossword puzzle!`,
    '',
    `🎯 ${name}` + (description ? ` : ${description}` : ''),
    `⏱️ ${time_taken} · ${accuracy}% accuracy`,
    '',
    `💪 Think you can beat my score? Give it a try!`,
    '',
    `🔗 Play now:`,
    puzzle_url,
    '',
    `📝 Solve Across & Down clues!`
  ].join('\n');
};
