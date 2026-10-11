"""The sound of the Symphony promo, synthesized from the film's own timeline.

    python3 sound.py timeline.json sfx.wav

timeline.json is what `node render.mjs --timeline timeline.json` writes: the
moments the picture is drawn from (the launches of the balls with their
landings, when each pair of Claude icons leaves the user's shadow, the arrows,
and the rest of the page's T). Every sound here is made from sines and shaped
noise with numpy and the standard library, so nothing is downloaded and
nothing is licensed from anyone; the output is a 48 kHz stereo WAV that
render.mjs muxes into the mp4 and the webm.

What is heard, in order: a low warm drone under everything; a soft bloom as
the mark appears and a tap as the person does; a whoosh for each arrow drawn;
a pluck when the balls leave and a thump with a ping when they land, in the
balls' own rhythm, so the quickening is heard as it is seen; a chime for each
pair of Claude icons leaving, panned to the side each one goes, and a chord
when the circle is complete; a riser of noise and rising tone as the mark
heats, a bright bloom at the white, and a hush as it cools; a warm chord under
the title, and a click for every character typed with a ding for the mark.
"""
import json
import math
import struct
import sys
import wave

import numpy as np

SR = 48000


def seconds(n):
    return np.arange(n) / SR


def env_adsr(n, attack, decay, sustain, release, hold=None):
    """A plain envelope over n samples: attack and decay in seconds to the
    sustain level, held, then a release at the end."""
    t = seconds(n)
    total = n / SR
    hold = total - release if hold is None else hold
    e = np.ones(n) * sustain
    a = t < attack
    e[a] = t[a] / max(attack, 1e-6)
    d = (t >= attack) & (t < attack + decay)
    e[d] = 1 + (sustain - 1) * (t[d] - attack) / max(decay, 1e-6)
    r = t >= hold
    e[r] = e[r] * np.clip(1 - (t[r] - hold) / max(release, 1e-6), 0, 1)
    return e


def sine(freq, n, phase=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def decay(n, tau):
    return np.exp(-seconds(n) / tau)


def shaped_noise(n, low, high, seed):
    """White noise kept to one band, by the spectrum: cheap and smooth."""
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(n)
    spectrum = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    lo = np.asarray(low, dtype=float)
    hi = np.asarray(high, dtype=float)
    weight = np.where((f >= lo) & (f <= hi), 1.0, 0.0)
    # soft edges, so the band does not ring
    edge = np.exp(-((np.maximum(lo - f, 0) + np.maximum(f - hi, 0)) / (0.25 * (hi - lo) + 1)) ** 2)
    weight = np.maximum(weight, edge)
    y = np.fft.irfft(spectrum * weight, n)
    peak = np.max(np.abs(y)) or 1.0
    return y / peak


def sweep_noise(n, f_start, f_end, width, seed):
    """Noise whose band glides from f_start to f_end over its length: made in
    short overlapping pieces, each its own shaped band."""
    piece = SR // 50
    hop = piece // 2
    out = np.zeros(n + piece)
    window = np.hanning(piece)
    rng = np.random.default_rng(seed)
    k = 0
    while k * hop < n:
        u = (k * hop) / n
        centre = f_start * (f_end / f_start) ** u
        x = rng.standard_normal(piece)
        spectrum = np.fft.rfft(x)
        f = np.fft.rfftfreq(piece, 1 / SR)
        weight = np.exp(-((f - centre) / (width * centre)) ** 2)
        y = np.fft.irfft(spectrum * weight, piece)
        y = y / (np.max(np.abs(y)) or 1.0)
        out[k * hop:k * hop + piece] += y * window
        k += 1
    out = out[:n]
    return out / (np.max(np.abs(out)) or 1.0)


class Mix:
    def __init__(self, duration):
        self.n = int(round(duration * SR))
        self.left = np.zeros(self.n)
        self.right = np.zeros(self.n)

    def add(self, at, signal, gain=1.0, pan=0.0):
        """Place a mono signal at time at (seconds), with pan from -1 (left)
        to 1 (right), equal power."""
        start = int(round(at * SR))
        if start >= self.n:
            return
        end = min(self.n, start + len(signal))
        piece = signal[:end - start] * gain
        angle = (pan + 1) * math.pi / 4
        self.left[start:end] += piece * math.cos(angle)
        self.right[start:end] += piece * math.sin(angle)

    def write(self, path):
        stereo = np.stack([self.left, self.right], axis=1)
        # a soft knee, then the peak at -1 dBFS
        stereo = np.tanh(stereo * 1.1) / math.tanh(1.1)
        peak = np.max(np.abs(stereo)) or 1.0
        stereo = stereo / peak * (10 ** (-1 / 20))
        pcm = (stereo * 32767).astype('<i2')
        with wave.open(path, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())


def pan_of(slot):
    return math.sin(math.radians(slot)) * 0.8


# ---- the sounds ---------------------------------------------------------------

def drone(T, duration):
    """A low warm bed, A1 and E2 with a soft fifth above, swelling with the
    heat and cut by the white; a quieter, higher bed returns under the title."""
    n = int(duration * SR)
    t = seconds(n)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 0.23 * t)
    bed = (sine(55 * vib, n) * 0.5 + sine(82.41 * vib, n) * 0.28 + sine(110 * vib, n) * 0.18
           + sine(164.8 * vib, n) * 0.08)
    heat = np.clip((t - T['heatFrom']) / (T['white'] - T['heatFrom']), 0, 1)
    heat = heat * heat * (3 - 2 * heat)
    level = 0.09 * np.clip(t / 1.5, 0, 1) + 0.12 * heat
    level[t >= T['white']] = 0
    # the white cuts it in 40 ms, not at once
    cut = (t >= T['white'] - 0.04) & (t < T['white'])
    level[cut] *= 1 - (t[cut] - (T['white'] - 0.04)) / 0.04
    return bed * level


def title_bed(T, duration):
    """A warm A major bed under the title, in from the cool, out at the end."""
    n = int(duration * SR)
    t = seconds(n)
    chord = (sine(110, n) * 0.35 + sine(164.81, n) * 0.25 + sine(277.18, n) * 0.18
             + sine(440, n) * 0.1 + sine(659.26, n) * 0.05)
    rise = np.clip((t - T['cool'][0]) / (T['titleIn'][1] - T['cool'][0]), 0, 1)
    rise = rise * rise * (3 - 2 * rise)
    fall = np.clip((duration - t) / 1.4, 0, 1)
    return chord * 0.1 * rise * fall


def bloom(freq_from, freq_to, length, gain):
    n = int(length * SR)
    f = freq_from + (freq_to - freq_from) * (1 - np.exp(-seconds(n) / (length / 3)))
    return sine(f, n) * env_adsr(n, length * 0.6, 0.0, 1.0, length * 0.4) * gain


def tap(gain=0.4):
    n = int(0.12 * SR)
    f = 600 * np.exp(-seconds(n) * 12) + 380
    return sine(f, n) * decay(n, 0.03) * gain


def whoosh(length=0.6, gain=0.35, seed=1):
    n = int(length * SR)
    body = sweep_noise(n, 900, 2600, 0.35, seed)
    return body * env_adsr(n, length * 0.25, 0.0, 1.0, length * 0.5) * gain


def pluck(freq=880, gain=0.25):
    n = int(0.12 * SR)
    return (sine(freq, n) + 0.4 * sine(freq * 2.01, n)) * decay(n, 0.025) * gain


def thump(gain=0.5):
    n = int(0.22 * SR)
    f = 150 * np.exp(-seconds(n) * 18) + 55
    return sine(f, n) * decay(n, 0.06) * gain


def ping(freq, gain=0.22, tau=0.22):
    n = int(0.5 * SR)
    return (sine(freq, n) + 0.3 * sine(freq * 2.76, n) * decay(n, tau / 2)) * decay(n, tau) * gain


def chime(freq, gain=0.2, tau=0.35):
    n = int(0.9 * SR)
    return (sine(freq, n) + 0.5 * sine(freq * 2, n) * decay(n, tau * 0.6)) * decay(n, tau) * gain


def chord(freqs, length, attack, gain):
    n = int(length * SR)
    out = np.zeros(n)
    for i, f in enumerate(freqs):
        out += sine(f, n) * (0.7 ** i)
    return out * env_adsr(n, attack, 0.0, 1.0, length - attack - 0.05) * gain / len(freqs)


def riser(T):
    """Noise climbing from a hum to a hiss and a tone climbing three octaves,
    both louder by the square as the mark heats, ending at the white."""
    length = T['white'] - T['heatFrom']
    n = int(length * SR)
    t = seconds(n)
    u = t / length
    shape = u * u
    noise = sweep_noise(n, 220, 7000, 0.6, 7) * shape * 0.55
    tone = sine(110 * (8 ** u), n) * shape * 0.22
    tone += sine(110 * (8 ** u) * 1.5, n) * shape * 0.08
    return noise + tone


def white_hit():
    """The bloom at the white: a bright chord with a long tail and a breath
    of high noise, then nothing but the cooling."""
    n = int(3.2 * SR)
    t = seconds(n)
    out = np.zeros(n)
    for i, f in enumerate([440, 554.37, 659.26, 880, 1108.73]):
        out += sine(f, n) * np.exp(-t / (1.3 - 0.15 * i)) * (0.8 ** i)
    out *= 0.22
    breath = shaped_noise(n, 2500, 11000, 11) * np.exp(-t / 0.7) * 0.28
    return out + breath


def key_click(seed):
    n = int(0.035 * SR)
    click = shaped_noise(n, 1800, 6500, seed) * decay(n, 0.006)
    blip = sine(2200, n) * decay(n, 0.008) * 0.5
    return (click + blip) * 0.18


def build(tl):
    T = tl['T']
    duration = tl['duration']
    mix = Mix(duration)
    mix.add(0, drone(T, duration))
    mix.add(0, title_bed(T, duration))

    # the opening: the mark blooms, the person taps in
    mix.add(T['markIn'][0], bloom(70, 118, 1.1, 0.3))
    mix.add(T['userIn'][0] + 0.15, tap())

    # every arrow drawn is a whoosh, panned where the arrow is
    for i, arrow in enumerate(tl['arrows']):
        mix.add(arrow['begin'], whoosh(seed=20 + i), pan=pan_of(arrow['slot']))

    # the balls: a pluck at the launch, a thump and a ping at the landing,
    # the ping climbing with the heat, the thump giving way to the riser
    for j, launch in enumerate(tl['launches']):
        if launch['at'] > T['white']:
            continue
        count = launch['count']
        if count == 0:
            continue
        heat = launch['heat']
        loud = min(1.0, 0.45 + 0.1 * count) * (1 - 0.45 * heat)
        mix.add(launch['at'], pluck(880 * (1 + 0.6 * heat)), gain=loud * 0.7)
        mix.add(launch['landed'], thump(), gain=loud * (1 - 0.6 * heat))
        mix.add(launch['landed'], ping(1320 * (2 ** heat)), gain=loud)

    # the Claude icons: a chime for each pair, one note left and one right
    notes = [783.99, 880, 987.77, 1046.5, 1174.66, 1318.51]
    for d in tl['departures']:
        f = notes[d['pair'] - 1]
        mix.add(d['at'], chime(f), pan=-0.7)
        mix.add(d['at'] + 0.02, chime(f * 1.005), pan=0.7)
    # the circle complete: one chord and a pop
    mix.add(T['claudeLand'], chord([261.63, 329.63, 392.0, 587.33, 783.99], 2.2, 0.08, 0.5))
    mix.add(T['claudeLand'], pluck(1760, 0.2))

    # the heat, the white, the cooling
    mix.add(T['heatFrom'], riser(T))
    mix.add(T['white'], white_hit())

    # the title's letters: a click per character, a ding for the mark
    typing = T['typing']
    head, tail = 'Powered by ', 'Claude'
    units = len(head) + 1 + len(tail)
    for k in range(units):
        at = typing[0] + (typing[1] - typing[0]) * (k + 0.5) / units
        if k == len(head):
            mix.add(at, ping(1760, 0.16, 0.28))
        else:
            mix.add(at, key_click(100 + k))
    return mix


def main(argv):
    with open(argv[1], encoding='ascii') as f:
        tl = json.load(f)
    mix = build(tl)
    mix.write(argv[2])
    print(f"{argv[2]}: {mix.n / SR:.1f} s, stereo, {SR} Hz")


if __name__ == '__main__':
    main(sys.argv)
