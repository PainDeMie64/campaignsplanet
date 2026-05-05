export function campaignGroupLabel(campaign) {
  return campaign?.category ?? campaign?.group ?? campaign?.environment ?? 'Official';
}
