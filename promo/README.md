# The Symphony promo video

`symphony-promo.mp4` (H.264, 1920x1080, 30 fps, 22.9 s) and `symphony-promo.webm` (VP9, the same
picture) are the one video Symphony uses: on the Chrome Web Store listing and on
https://openspineconsortium.com/symphony/. `poster.png` is its last frame, the still a page shows
before the video plays. `store-assets/screenshot-2-1280x800.png` is the frame at 12.6 seconds, when
every arrow is pulsing at once, at the store's screenshot size.

What it shows, in order: one person at twelve o'clock sends work to the GitHub mark at the centre,
a pulse travelling down the arrow for each pull request; Claude marks come out from behind the
person two at a time, one clockwise and one counter-clockwise, the two sides mirroring each other,
and travel as two trains until twelve of them fill the circle with the person, all landing at
once; each draws the same arrow and all thirteen pulse together; the pulses come faster and
faster, the mark glows brighter with each landing until it is a sun, the light floods the whole
frame, and out of the cooling light "Symphony" appears, then "Powered by Claude" types itself out,
with Claude's mark inline before the word.

`index.html` is the whole animation as one page: a Canvas 2D drawing where every frame is a
function of the time, `window.renderAt(seconds)`, with no timer and no randomness, so a frame
rendered twice is the same frame. It loads nothing from the network and uses the fonts installed on
the machine (Caladea where it is, then Liberation Serif, DejaVu Serif, serif). Open it with
`?live=1` to watch it loop, or `?t=12.3` for the still at that second. `render.mjs` renders every
frame in headless Chromium through playwright-core and encodes the two files with ffmpeg:

```
npm install --no-save playwright-core   # once; Chromium's path goes in CHROME_PATH
node promo/render.mjs                   # frames/, the mp4, the webm, poster.png, the store frame
node promo/render.mjs --stills DIR 2 9.2 14.9   # single frames at those seconds, for checking
```

The marks are drawn in the page, not loaded: GitHub's Octicons mark, Claude's starburst in its own
orange, a plain avatar for the person. "GitHub" is GitHub's mark; "Claude" and "Claude Code" are
Anthropic's marks, used here to say what Symphony works with; Symphony is not a GitHub or Anthropic
product.
