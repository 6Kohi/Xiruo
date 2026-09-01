export type VideoTagMatch = 'broad' | 'strict';

export interface VideoTagGroup {
  label: string;
  tags: string[];
}

export const videoTagGroups: VideoTagGroup[] = [
  {
    label: '影片属性',
    tags: ['无码', 'AI 解码', '中文字幕', '中文配音', '同人作品', '断面图', 'ASMR', '1080P', '60FPS'],
  },
  {
    label: '人物关系',
    tags: ['近亲', '姐', '妹', '母', '女儿', '师生', '情侣', '青梅竹马', '同事'],
  },
  {
    label: '角色设定',
    tags: ['JK', '御姐', '熟女', '人妻', '女教师', '女医生', '护士', 'OL', '偶像', '女仆', '魔女', '公主', '妖精', '吸血鬼', '兽娘', '魔法少女'],
  },
  {
    label: '外貌素材',
    tags: ['短发', '马尾', '双马尾', '丸子头', '巨乳', '贫乳', '黑皮肤', '眼镜娘', '兽耳', '尖耳朵', '白虎', '泳装', '丝袜', '和服'],
  },
  {
    label: '情境场所',
    tags: ['校园', '教室', '图书馆', '保健室', '体育仓库', '游泳池', '医院', '办公室', '浴室', '公共场所', '户外', '电车', '温泉'],
  },
];

export function buildVideoTagQuery(tags: string[], match: VideoTagMatch): string {
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  if (match === 'broad') return normalized.join(' ');
  return normalized.map((tag) => `"${tag.replaceAll('"', '')}"`).join(' ');
}
