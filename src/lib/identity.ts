// Resolves how an artist is presented: a studio (if they belong to one) or
// their own business/trading name is the "business"; their personal name shows
// alongside. Format: "Business · Artist name" (or just the name if no business).

export function businessName(opts: {
  studioName?: string | null;
  businessName?: string | null;
}): string | null {
  return opts.studioName?.trim() || opts.businessName?.trim() || null;
}

export function identityLabel(opts: {
  artistName: string;
  studioName?: string | null;
  businessName?: string | null;
}): string {
  const biz = businessName(opts);
  return biz ? `${biz} · ${opts.artistName}` : opts.artistName;
}
