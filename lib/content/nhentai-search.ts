export type NhentaiSearchNamespace = 'tag' | 'artist' | 'parody' | 'character' | 'group' | 'language' | 'category';

export interface NhentaiSearchOperator {
  key: NhentaiSearchNamespace | 'pages' | 'favorites' | 'uploaded' | 'title' | 'jtitle';
  syntax: string;
  label: string;
  hint: string;
  kind: 'catalog' | 'number' | 'text';
}

export interface NhentaiSearchSuggestion {
  type: NhentaiSearchNamespace;
  name: string;
  count?: string;
  description?: string;
}

export const nhentaiSearchSnapshot = {
  source: 'nhentai.net browser search suggestions',
  capturedAt: '2026-09-01',
} as const;

export const nhentaiSearchOperators: NhentaiSearchOperator[] = [
  { key: 'tag', syntax: 'tag:…', label: '标签', hint: '按内容标签筛选', kind: 'catalog' },
  { key: 'artist', syntax: 'artist:…', label: '作者', hint: '按作者筛选', kind: 'catalog' },
  { key: 'parody', syntax: 'parody:…', label: '原作', hint: '按原作筛选', kind: 'catalog' },
  { key: 'character', syntax: 'character:…', label: '角色', hint: '按角色筛选', kind: 'catalog' },
  { key: 'group', syntax: 'group:…', label: '社团', hint: '按社团筛选', kind: 'catalog' },
  { key: 'language', syntax: 'language:…', label: '语言', hint: '按语言筛选', kind: 'catalog' },
  { key: 'category', syntax: 'category:…', label: '分类', hint: '按作品分类筛选', kind: 'catalog' },
  { key: 'pages', syntax: 'pages:N', label: '页数', hint: '按页数筛选，例如 pages:20', kind: 'number' },
  { key: 'favorites', syntax: 'favorites:N', label: '收藏数', hint: '按收藏数量筛选', kind: 'number' },
  { key: 'uploaded', syntax: 'uploaded:Nd', label: '上传时间', hint: '最近 N 天，例如 uploaded:7d', kind: 'number' },
  { key: 'title', syntax: 'title:"…"', label: '标题', hint: '搜索英文或展示标题', kind: 'text' },
  { key: 'jtitle', syntax: 'jtitle:"…"', label: '日文标题', hint: '搜索日文标题', kind: 'text' },
];

export const nhentaiSearchSuggestions: NhentaiSearchSuggestion[] = [
  { type: 'tag', name: 'big breasts', count: '232.2k', description: 'Female characters with notably large, heavy, or exaggerated breasts.' },
  { type: 'tag', name: 'sole female', count: '201.3k', description: 'Galleries featuring a singular female participant in sexual content.' },
  { type: 'tag', name: 'sole male', count: '180.3k', description: 'Galleries featuring a singular male participant in sexual content.' },
  { type: 'tag', name: 'group', count: '123.6k', description: 'Three or more characters engaging in sexual activity together.' },
  { type: 'tag', name: 'anal', count: '122.3k' },
  { type: 'tag', name: 'nakadashi', count: '121.5k', description: 'The act of ejaculating inside a partner.' },
  { type: 'tag', name: 'lolicon', count: '112.8k', description: 'Attraction towards young or young-looking fictional female characters.' },
  { type: 'tag', name: 'stockings', count: '112.5k' },
  { type: 'tag', name: 'blowjob', count: '106.6k', description: 'Oral sex performed on a penis by another character.' },
  { type: 'tag', name: 'schoolgirl uniform', count: '91.7k' },
  { type: 'artist', name: 'ankoman', count: '1.1k' },
  { type: 'artist', name: 'crimson', count: '1.0k' },
  { type: 'artist', name: 'saigado', count: '775' },
  { type: 'artist', name: 'inochi wazuka', count: '676' },
  { type: 'artist', name: 'itaba hiroshi', count: '664' },
  { type: 'artist', name: 'takasugi kou', count: '628' },
  { type: 'artist', name: 'sanbun kyoden', count: '602' },
  { type: 'artist', name: 'bai asuka', count: '588' },
  { type: 'artist', name: 'osuwaani', count: '587' },
  { type: 'artist', name: 'nakajima yuka', count: '579' },
  { type: 'parody', name: 'original', count: '152.3k' },
  { type: 'parody', name: 'touhou project', count: '23.2k' },
  { type: 'parody', name: 'kantai collection', count: '19.4k' },
  { type: 'parody', name: 'fate grand order', count: '17.3k' },
  { type: 'parody', name: 'the idolmaster', count: '16.9k' },
  { type: 'parody', name: 'blue archive', count: '14.6k' },
  { type: 'parody', name: 'granblue fantasy', count: '4.6k' },
  { type: 'parody', name: 'genshin impact', count: '4.4k' },
  { type: 'parody', name: 'pokemon', count: '4.2k' },
  { type: 'parody', name: 'azur lane', count: '4.1k' },
  { type: 'language', name: 'english' },
  { type: 'language', name: 'japanese' },
  { type: 'language', name: 'chinese' },
  { type: 'category', name: 'doujinshi' },
  { type: 'category', name: 'manga' },
  { type: 'category', name: 'artistcg' },
  { type: 'category', name: 'gamecg' },
  { type: 'category', name: 'western' },
];

const catalogPattern = /(?:^|\s)(tag|artist|parody|character|group|language|category):(?:"([^"]*)|([^\s]*))$/i;

export function activeNhentaiCatalogToken(query: string) {
  const match = query.match(catalogPattern);
  if (!match || match.index === undefined) return undefined;
  return {
    type: match[1].toLowerCase() as NhentaiSearchNamespace,
    term: (match[2] ?? match[3] ?? '').toLowerCase(),
    start: match.index + (match[0].startsWith(' ') ? 1 : 0),
  };
}

export function searchNhentaiSuggestions(query: string, limit = 10) {
  const token = activeNhentaiCatalogToken(query);
  if (!token) return [];
  return nhentaiSearchSuggestions
    .filter((item) => item.type === token.type && (!token.term || item.name.includes(token.term)))
    .slice(0, limit);
}

export function appendNhentaiOperator(query: string, operator: NhentaiSearchOperator) {
  const prefix = query.trim();
  const value = operator.kind === 'text' ? `${operator.key}:"` : `${operator.key}:`;
  return prefix ? `${prefix} ${value}` : value;
}

export function applyNhentaiSuggestion(query: string, suggestion: NhentaiSearchSuggestion) {
  const token = activeNhentaiCatalogToken(query);
  const replacement = `${suggestion.type}:"${suggestion.name}"`;
  if (!token) return query.trim() ? `${query.trim()} ${replacement} ` : `${replacement} `;
  return `${query.slice(0, token.start)}${replacement} `;
}
