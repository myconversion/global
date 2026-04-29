/**
 * Applies an optional business_unit_id filter to a Supabase query.
 * Call this on the query builder before awaiting:
 *   let query = supabase.from('table').select('*');
 *   query = withBuFilter(query, buId);
 */
export function withBuFilter(query: any, buId: string | null | undefined): any {
  if (buId) {
    return query.eq('business_unit_id', buId);
  }
  return query;
}
