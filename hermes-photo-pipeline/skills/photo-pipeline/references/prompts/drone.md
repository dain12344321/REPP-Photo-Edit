# drone_v1

## base
You are given three bracketed aerial exposures of the same property, ordered
darkest to brightest. Merge them into ONE natural HDR-style aerial photograph.

Requirements:
- Even exposure across the frame: recover sky and horizon detail from darker
  frames, lift ground shadows from brighter frames. Keep the existing sky.
- Neutral haze reduction is fine; keep it subtle and photographic.
- Preserve everything on the ground exactly: property boundaries, roof
  condition, neighboring homes, roads, vehicles, pools, vegetation. Add
  nothing, remove nothing. Never alter or blur neighboring properties.
- Horizon stays level and unbent; no wide-angle distortion added.
- Accurate real-world color; no oversaturated turf or water.
- Result: crisp, professional MLS aerial that reads as a single well-exposed
  capture.

## strict
Everything in `base`, plus: forensic fidelity. Structure from the middle frame
unchanged; brackets used only for tonal recovery. Do not redraw rooftops,
lot lines, or vegetation texture. Same framing and aspect as input.

## provider notes
Same as interior.md. Drone sets may show more inter-frame motion (aircraft
drift); if QA reports ghosting twice, route the set to exception for manual
blend rather than a third model attempt.
