import type { VoiceCandidate } from './voice-product-matcher';

type ReviewItem = {
  productId?: string | null;
  confidence?: string;
  matchReason?: string;
  matchCandidateDetails?: VoiceCandidate<unknown>[];
};

export function canCorrectProductByVoice(item: ReviewItem | undefined): boolean {
  if (!item || (item.productId && item.confidence !== 'low')) return false;
  if (item.matchReason === 'Choose the brand or pack size') return false;

  // A missing selection is not necessarily failed recognition. A reliable name
  // can still need a brand, pack size, or price choice from the suggestions.
  const recognizedIdentity = item.matchCandidateDetails?.some(candidate =>
    candidate.missingTokens.length === 0 && candidate.coverage >= 0.85 && candidate.score >= 0.72);
  return !recognizedIdentity;
}
