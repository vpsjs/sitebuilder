/** 轻量 i18n 字典：API 错误消息多语言 */

type Lang = 'zh' | 'en';
type Key =
  | 'siteNotFound' | 'draftEmpty' | 'noPermission' | 'invalidCredentials'
  | 'duplicateSlug' | 'objectNotFound' | 'invalidImage';

const dictionary: Record<Lang, Record<Key, string>> = {
  zh: {
    siteNotFound: '站点不存在或尚未发布',
    draftEmpty: '草稿为空，无法发布',
    noPermission: '无权访问',
    invalidCredentials: '邮箱或密码错误',
    duplicateSlug: '标识已存在',
    objectNotFound: '对象不存在',
    invalidImage: '仅支持图片',
  },
  en: {
    siteNotFound: 'Site not found or not published',
    draftEmpty: 'Draft is empty, cannot publish',
    noPermission: 'No permission',
    invalidCredentials: 'Invalid email or password',
    duplicateSlug: 'Slug already exists',
    objectNotFound: 'Object not found',
    invalidImage: 'Images only',
  },
};

/** 从 Accept-Language 头解析语言 */
export function langOf(header?: string): Lang {
  return header?.toLowerCase().startsWith('en') ? 'en' : 'zh';
}

export function t(key: Key, lang: Lang = 'zh'): string {
  return dictionary[lang][key];
}
