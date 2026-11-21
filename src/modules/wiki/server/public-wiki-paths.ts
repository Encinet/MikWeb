import { routing } from '../../../shared/i18n/routing';
import { loadWikiSectionDocuments, WikiContentValidationError } from './load-wiki-documents';

export function isWikiSectionId(id: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(id);
}

export async function getPublicWikiSectionParams() {
  const sectionsByLocale = await Promise.all(
    routing.locales.map(async (locale) => {
      const documents = await loadWikiSectionDocuments(locale, 'public');
      return documents.map(({ section, sourcePath }) => {
        if (!isWikiSectionId(section.id)) {
          throw new WikiContentValidationError(`Invalid public Wiki section ID: ${sourcePath}`);
        }
        return { locale, id: section.id };
      });
    }),
  );
  return sectionsByLocale.flat();
}
