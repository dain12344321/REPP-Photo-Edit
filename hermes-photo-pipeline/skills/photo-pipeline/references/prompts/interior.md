# interior_v1

## base
You are given three bracketed exposures of the same interior real-estate photo,
ordered darkest to brightest. Merge them into ONE natural HDR-style photograph.

Requirements:
- Blend exposures for even, realistic lighting: open shadows gently, keep
  highlight detail, recover the view through every window from the darker
  frames. Window views must be the REAL view from these photos, never invented.
- Neutral, accurate white balance; mixed lighting corrected toward neutral.
  Whites are white. No orange interior glow, no blue window cast.
- Preserve the scene exactly: same furniture, decor, fixtures, wall art,
  reflections, and room geometry. Add nothing. Remove nothing. Do not
  straighten, relight with new sources, restyle, or declutter.
- Vertical lines stay vertical. No halos at window frames or edges. No HDR
  grunge, no oversaturation. Fine textures (wood grain, fabric, countertop)
  stay crisp and photographic.
- Any readable text, screens, or artwork must remain unchanged and legible.
- Result: bright, clean, professional MLS listing photo that looks like a
  single well-exposed capture by a professional photographer, not an AI edit.

## strict
(Use on retry after a QA failure.)
Everything in `base`, plus: this is a forensic-fidelity task. Reproduce the
middle exposure's content pixel-for-pixel in structure; change ONLY tonality,
color balance, and window/highlight/shadow detail using the other two frames.
If any element is uncertain, copy it from the middle frame unchanged. Do not
redraw edges, patterns, text, or reflections. Output the same framing and
aspect ratio as the input.

## provider notes
- nano-banana-2: attach frames dark→bright as three inline images before the
  prompt; request aspect to match source, long edge per edit_request.
- gpt-image-2: use images/edits with the three frames as reference images;
  omit input_fidelity (always high; passing it errors).
