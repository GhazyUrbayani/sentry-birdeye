import type { TokenSnapshot, TokenScanRecord } from '@/types';

export async function generateAIBrief(
  snapshot: TokenSnapshot,
  score: TokenScanRecord['score'],
  grade: TokenScanRecord['grade']
): Promise<string | null> {
  const apiKey = process.env['GENAI_API_KEY'];
  if (!apiKey) return null;

  const prompt = `You are an expert Solana pre-trade intelligence AI. 
Analyze the following token metrics and provide a 1-sentence (max 15 words) sharp, "degen-style" summary of the risk.
Token: ${snapshot.identity.symbol || 'UNKNOWN'} (${snapshot.identity.address})
Liquidity: ${snapshot.market.liquidity ?? 'Unknown'}
Top 10 Holders: ${snapshot.holders.top10HolderPct ? snapshot.holders.top10HolderPct + '%' : 'Unknown'}
Mint Disabled: ${snapshot.security.mintAuthorityDisabled}
Freeze Disabled: ${snapshot.security.freezeAuthorityDisabled}
Calculated Grade: ${grade} (Score: ${score}/100)

If it's a RUG, be blunt. If SAFE, sound optimistic but cautious. Keep it short, max 15 words. No markdown, just text.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.warn('AI API Error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('AI Request Failed:', err);
    return null;
  }
}
