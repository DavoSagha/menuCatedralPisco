from PIL import Image, ImageOps
import sys
import os

SRC = os.path.join(os.path.dirname(__file__), '..', 'public', 'logo.avif')
DST = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'logo-cropped.png')
MARGIN = 6

img = Image.open(SRC).convert('RGBA')

# Create a version that's padded by 1px on each side to detect edge pixels
padded = ImageOps.expand(img, border=1, fill=(0, 0, 0, 0))
bbox = padded.getbbox()

if bbox:
    # Adjust bbox back by 1px for the padding
    cropped = img.crop((
        bbox[0] - 1,
        bbox[1] - 1,
        bbox[2] - 1,
        bbox[3] - 1,
    ))
else:
    cropped = img

# Add a small margin around the result
final = ImageOps.expand(cropped, border=MARGIN, fill=(0, 0, 0, 0))

final.save(DST, 'PNG')
print(f'Cropped logo saved to {DST}')
print(f'Original size: {img.size}')
print(f'Cropped size:  {final.size}')
