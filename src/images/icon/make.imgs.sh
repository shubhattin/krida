#!/usr/bin/env bash
# Regenerates every app icon / favicon under public/ from the sources in src/images/icon/<id>/.
# Run from anywhere: `bash src/images/icon/make.imgs.sh`
#
# Outputs per id (Krida is the site-wide default, so it owns the root paths):
#   krida   → public/favicon.ico, public/img/icon_{128,512,128_no_pad}.png  (manifest + root layout)
#   <game>  → public/<game>.favicon.ico, public/img/<game>_icons/icon_{128,512,128_no_pad}.png
# Padajāla's set (public/img/padajala_icons) predates this script and is left untouched.
set -euo pipefail
cd "$(dirname "$0")/../../.."

SRC=src/images/icon

# Generated icons are a rounded-square plate on a white canvas. Cut the plate out (crop to its
# bounding box, inset a little to drop the soft edge/shadow) and mask it with a rounded square so the
# outside is transparent. Bounding boxes were measured with:
#   magick original.png -colorspace gray -negate -threshold 3% -format '%@' info:
cut_plate() { # <id> <x> <y> <width>
  local id=$1 x=$2 y=$3 w=$4
  local inset=$((w * 15 / 1000))
  local side=$((w - 2 * inset))
  magick "$SRC/$id/original.png" -crop "${side}x${side}+$((x + inset))+$((y + inset))" +repage \
    -resize 512x512 -alpha set \
    \( -size 512x512 xc:none -fill white -draw "roundrectangle 0,0 511,511 112,112" \) \
    -compose DstIn -composite "$SRC/$id/org_icon_512.png"
}

# <id> <public prefix for pngs> <favicon path>
emit() {
  local id=$1 out=$2 ico=$3
  mkdir -p "$out"
  magick "$SRC/$id/org_icon_512.png" -resize 440x440 -background transparent -gravity center \
    -extent 512x512 "$SRC/$id/icon_512_padded.png"
  magick "$SRC/$id/org_icon_512.png" -resize 128x128 "$out/icon_128_no_pad.png"
  magick "$SRC/$id/icon_512_padded.png" -resize 128x128 "$out/icon_128.png"
  magick "$SRC/$id/icon_512_padded.png" -resize 512x512 "$out/icon_512.png"
  # Multi-size favicon (16/32/48/64) — tiny sizes use the unpadded mark so it fills the tab slot.
  magick "$SRC/$id/org_icon_512.png" -define icon:auto-resize=64,48,32,16 "$ico"
}

cut_plate krida 68 69 1117
cut_plate dvayi 86 83 1081
cut_plate bhramita 85 87 1082
cut_plate surupa 48 48 1156
cut_plate anveshi 33 32 1183

emit krida public/img public/favicon.ico
emit padavali public/img/padavali_icons public/padavali.favicon.ico
for game in dvayi bhramita surupa anveshi; do
  emit "$game" "public/img/${game}_icons" "public/${game}.favicon.ico"
done
