# Drive folders — Lakeshore REP Edit

Root for every client handoff:

**[DELIVERED CLIENT ASSETS (by Property)](https://drive.google.com/drive/folders/1b2MWM0J9XfEOxpCl1He22t-qj0Dcb-_A)**

One folder per listing, named like the others: `{Street, City, ST ZIP}`.

## This listing

| | |
|---|---|
| Slug | `11477_N_250_W_Sumava_Resorts_IN_46379` |
| Property | [11477 N 250 W, Sumava Resorts, IN 46379](https://drive.google.com/drive/folders/1f1fjqYf90fvSHttSihs6ByibUf3DzEcT) |
| Input (card) | [SD card dump](https://drive.google.com/drive/folders/1G5xcyW85h6mbZ48IpEsc1KjN61kU_ffS) — Sony + `DJI Drone Card Dump/` |
| Output | [Grok_2K](https://drive.google.com/drive/folders/1OH2U6-b-VCyxk60rI-xhUN0BULYFr7vW) inside that property folder |
| Original MLS | `MLS Listing Photos/` — leave it. Do not overwrite. |
| Floor plans | `2D Floor Plans (by unit)/` |

Cuba Casa drops extras in **Grok_2K**.

## Convention

```
DELIVERED CLIENT ASSETS (by Property)/
  11477 N 250 W, Sumava Resorts, IN 46379/
    MLS Listing Photos/          original handoff (read-only)
    2D Floor Plans (by unit)/
    Grok_2K/                     pipeline export
      {slug}_001_MLS.jpg
      …
      {slug}_048_MLS.jpg
      {slug}_050_VT.jpg
      {slug}_051_VT.jpg
```

**Input** stays a separate card dump (`_SA9*.JPG` + optional DJI folder). Watch with `scripts/watch_inbox.py`, push stills into that property’s `Grok_2K`.

Stills: `{slug}_{nnn}_MLS.jpg`. Twilights: `{slug}_{nnn}_VT.jpg`. Never `51` / `052`. No lot outline.

**Download zip** (this preview): `{slug}.zip`.
