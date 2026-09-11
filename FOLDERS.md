# Drive folders — Lakeshore REP Edit

Official connections. Every listing uses these two roots.

| Role | Folder | ID |
|---|---|---|
| **INBOX** | [Card dumps](https://drive.google.com/drive/folders/1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ) | `1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ` |
| **OUTBOX** | [Delivered client stills](https://drive.google.com/drive/folders/1-W86toL_viRDEoyXX5JMR0ab68g2x62G) | `1-W86toL_viRDEoyXX5JMR0ab68g2x62G` |

One folder per listing, named `{Street, City, ST ZIP}`.

## Live listings

| Listing | INBOX | OUTBOX |
|---|---|---|
| 1642 Flag Ct, Crown Point, IN 46307 | [card](https://drive.google.com/drive/folders/1cCkhmwbjaEx5E7MAlFKi5oeOZBo_HNq-) | [TEST RESULTS](https://drive.google.com/drive/folders/1NErlIfipK_xQf4aLN-uPRDSTajkUE687) |
| 405 N Main St, Wanatah, IN 46390 | [card](https://drive.google.com/drive/folders/1V1so2_Xvn5CX2w3PLLGyY-YlcT3gF3i5) | [gold delivery](https://drive.google.com/drive/folders/1QRP9oHkTO7w9AZI6xCvvo0G_wueiI6KA) · [TEST RESULTS](https://drive.google.com/drive/folders/1ZLHr3r042GHv2emYRoVU_z515Ync49PE) |

Wanatah OUTBOX is the gold Imagine look (hand-finished). Match that grade at true 2K.

## Convention

```
INBOX/
  {Street, City, ST ZIP}/
    _SA9*.JPG                 Sony card (read-only)
    *.ARW                     ignore — JPEG stills only
    DJI Drone Card Dump/      optional

OUTBOX/
  {Street, City, ST ZIP}/
    {slug}_001_MLS.jpg
    …
    {slug}_0nn_VT.jpg
```

Stills: `{slug}_{nnn}_MLS.jpg`. Twilights: `{slug}_{nnn}_VT.jpg`. Never `51` / `052`. No lot outline. No music zip. No Hermes zip in the client folder.

**Input** stays the INBOX card dump. Watch with `scripts/watch_inbox.py`, push keepers into that listing’s OUTBOX folder.

The website ingests a dropped card and links these two folders. It does not stream 12 MB JPEGs through the gate.
