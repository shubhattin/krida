cd ../../..

magick src/images/icon/org_icon_512.png -resize 440x440 -background transparent -gravity center -extent 512x512 src/images/icon/icon_512_padded.png

magick src/images/icon/org_icon_512.png -resize 128x128 public/img/icon_128_no_pad.png
magick src/images/icon/icon_512_padded.png -resize 128x128 public/img/icon_128.png
magick src/images/icon/icon_512_padded.png -resize 512x512 public/img/icon_512.png

# Generate a 48x48 favicon.ico (contains 16x16, 32x32, 48x48 for compatibility)
magick src/images/icon/icon_512_padded.png -resize 48x48 \
  -define icon:auto-resize=16,32,48 public/favicon.ico
