# exterior_v1

## base
You are given three bracketed exposures of the same exterior real-estate photo,
ordered darkest to brightest. Merge them into ONE natural HDR-style photograph.

Requirements:
- Balanced exposure across facade, landscaping, and sky: recover sky tone and
  cloud detail from the darker frames, open facade shadows from the brighter
  frames. Keep the EXISTING sky; do not replace it. Enhance only.
- True-to-life color: healthy but not neon grass, accurate siding/brick/roof
  color, clean whites on trim. No teal-and-orange grading.
- Preserve the property exactly: same structure, rooflines, windows, doors,
  driveway condition, cars, signs, wires, and landscaping. Add nothing, remove
  nothing, repair nothing.
- Straight verticals, crisp edges, no halos along the roofline or tree lines.
- Result: bright, inviting, professional MLS listing photo that reads as a
  single well-exposed capture.

## strict
Everything in `base`, plus: forensic fidelity. Structure comes from the middle
frame unchanged; use the bracket only for tonal and sky-detail recovery. Do not
redraw foliage, shingles, brickwork, or window reflections. Same framing and
aspect as input.

## sky_replacement variant (opt-in per set; forces disclosure)
As `base`, except: replace an overexposed, blown-out white sky with a realistic
partly-cloudy blue sky appropriate to the scene's lighting direction and time
of day, with plausible soft reflections only where sky was already reflected.
Everything below the skyline remains exactly as captured. This image will be
disclosed as digitally altered.

## provider notes
Same as interior.md.
