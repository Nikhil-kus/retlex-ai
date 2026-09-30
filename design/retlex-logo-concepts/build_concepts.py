from pathlib import Path
p=Path('design/retlex-logo-concepts')
marks={
'a': '<path fill-rule="evenodd" d="M48 224V40Q48 24 64 24H136C184 24 216 52 216 96C216 126 201 148 177 159L224 224H171L127 164H92V224ZM92 64V132L116 112H136C159 112 172 107 172 88C172 72 159 64 136 64Z"/>',
'b': '<path fill-rule="evenodd" d="M64 24H192Q216 24 216 48V176Q216 200 192 200H104L40 232V48Q40 24 64 24ZM80 68V96H176V68ZM80 128V156H144V128Z"/>',
'c': '<path d="M32 104V72Q32 32 72 32H152V72H80Q72 72 72 80V104ZM224 152V184Q224 224 184 224H104V184H176Q184 184 184 176V152Z"/><rect x="32" y="128" width="40" height="64" rx="20"/><rect x="108" y="96" width="40" height="64" rx="20"/><rect x="184" y="64" width="40" height="64" rx="20"/>'
}
for key,body in marks.items():
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="#151B24"><title>Retlex AI concept {key.upper()}</title>{body}</svg>'
 (p/f'{key}-v1.svg').write_text(svg)
 # Exploratory typography intentionally remains live text.
 (p/f'{key}-lockup.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 256"><g transform="translate(0 24) scale(.8)" fill="#151B24">{body}</g><text x="235" y="158" font-family="Segoe UI,Arial,sans-serif" font-size="112" font-weight="600" letter-spacing="-4" fill="#151B24">Retlex <tspan font-size="64" letter-spacing="0">AI</tspan></text></svg>')
(p/'design-notes.md').write_text('''# Retlex AI concept study

## Product grounding
Reviewed src/app/page.tsx, src/app/billing/page.tsx, src/lib/voice-parser.ts, src/components/pages/BillingPageContent.tsx, WorkerPageContent.tsx, UnpaidPageContent.tsx, and src/lib/whatsapp-utils.ts.
The app supports shop-specific billing; Hindi speech recognition; Hindi, English and transliterated quantity parsing; weighted goods; paid/unpaid bills; WhatsApp bill handoff; and a worker order queue. These observations describe code, not an end-to-end runtime test.

## Brief
A calm, approachable, dependable identity for Indian kirana owners and staff. Primary context: phone home screen and billing header. Secondary: shared bills. Preserve the exact name Retlex AI. Assumption: no established proprietary logo must be retained. Existing UI uses indigo and rounded corners.
Avoid robot heads, AI sparkles, stock microphones, rupee badges, shields and generic rising arrows. Voice is the input; a completed everyday shop transaction is the promise.

## Explored ideas and scores
Scores are clarity / distinction / simplicity / relevance / small-size strength, each out of 5.
1. Speaking R: speech-shaped counter inside a strong R. 5/4/5/5/5. Selected.
2. Spoken slip: one speech silhouette with two ledger cuts. 5/3/5/5/5. Selected.
3. Counter rhythm: three speech beats between opposing counter corners. 4/4/4/4/4. Selected.
4. Rupee microphone: 4/2/3/5/3. Too literal.
5. Storefront waveform: 4/3/2/5/2. Too many details.
6. Checkmark receipt: 5/2/4/4/4. Generic.
7. R/X ligature: 3/4/3/3/3. Name harder to read.
8. Ledger leaf: 3/3/5/2/5. Suggests sustainability.
9. Speech basket: 4/2/3/4/3. Suggests shopping marketplace.
10. Stacked bill monogram: 3/3/3/4/3. Too many overlapping planes.

## Construction
256-unit grid, filled shapes, true negative spaces, no raster effects. A: 44-unit stem, rounded bowl, 45-degree speech notch in counter. B: rounded slip with broad 28-unit ledger cuts and one speech tail. C: 40-unit counter corners and three 40-unit speech beats; opposing forms imply a two-way counter exchange. Inspect at 16, 32 and 64 pixels.

## Suggested colors
A: deep teal #087F78, warm ivory #F7F5EF, ink #172B35. Calm and approachable; recommended.
B: indigo #4056B8, cloud #F3F5FC, ink #1D2945. Closest to the current product UI.
C: deep blue #205A86, pale sky #EDF5FA, optional warm amber #E7AE4E. Stable, with a friendly accent. Amber is decorative, not small text on white.
These are proposed design associations, not guarantees of users' emotional response.

## Scope
Concepts only. Segoe UI is a local presentation font, not a bundled or outlined production wordmark. Final typography and font licensing should be resolved for the selected direction. Library references studied for construction: Patreon, Framer, Pagekit; speech-mark search used to avoid familiar phone-in-bubble approaches. No trademark clearance performed.
''',encoding='utf-8')
