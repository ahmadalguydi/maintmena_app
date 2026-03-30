const unavailableRelations = new Map<string, number>();
const RELATION_UNAVAILABLE_TTL_MS = 2 * 60 * 1000;

const normalizeRelationName = (relationName: string) => relationName.trim().toLowerCase();

const buildErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return '';
  const e = error as { message?: string; details?: string; hint?: string };
  return [e.message, e.details, e.hint].filter(Boolean).join(' ').toLowerCase();
};

export const isMissingSupabaseRelationError = (error: unknown, relationName: string) => {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; code?: string };

  const message = buildErrorMessage(error);
  const relation = normalizeRelationName(relationName);
  const hasNamedRelation = relation.length > 0;

  return (
    e.status === 404 ||
    e.code === 'PGRST205' ||
    (hasNamedRelation &&
      message.includes(relation) &&
      (message.includes('not found') ||
        message.includes('could not find') ||
        message.includes('schema cache') ||
        message.includes('relation')))
  );
};

export const rememberMissingSupabaseRelation = (error: unknown, relationName: string) => {
  if (isMissingSupabaseRelationError(error, relationName)) {
    unavailableRelations.set(normalizeRelationName(relationName), Date.now());
    return true;
  }

  return false;
};

export const isSupabaseRelationKnownUnavailable = (relationName: string) =>
  (() => {
    const key = normalizeRelationName(relationName);
    const timestamp = unavailableRelations.get(key);

    if (!timestamp) return false;
    if ((Date.now() - timestamp) > RELATION_UNAVAILABLE_TTL_MS) {
      unavailableRelations.delete(key);
      return false;
    }

    return true;
  })();

export const markSupabaseRelationAvailable = (relationName: string) => {
  unavailableRelations.delete(normalizeRelationName(relationName));
};

export const clearKnownUnavailableSupabaseRelations = () => {
  unavailableRelations.clear();
};
