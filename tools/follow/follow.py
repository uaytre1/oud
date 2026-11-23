#!/usr/bin/env python3
"""Follow a known oud melody through any video or audio file of it, and show the notes on the video.

usage:
  python3 tools/follow/follow.py MEDIA --song hob-eih --version player-4 [--pass p1|all] [--consensus] \\
      [--json out.json] [--video out.mp4] [--mix out_mix.mp4] [--offset SEMITONES] [--max-occ 4]

  MEDIA        any file ffmpeg reads (mp4, m4a, wav ...). Tuned or not: the tuning offset is estimated.
  --song       song id from js/library.js (hob-eih, ahib-al-lail, hob-min-tihib)
  --version    version id of that song (player-4, lesson, note-sheet, ...)
  --pass       pass id (p1, p2 ...) or 'all' (every pass joined in order). Default p1.
  --consensus  follow the consensus of several versions instead: --version a,b,c (each with --pass)
  --json       write the followed times (default: print a short summary only)
  --video      write the video with the followed notes drawn on top
  --mix        write the same video with the app's computer oud mixed quietly over the original sound
  --offset     skip the tuning estimate (half steps, recording minus standard pitch)

Output JSON: one entry per occurrence of the melody in the media, each with every score note
(time in the media or played=false, confidence) and the extra picks the score does not have.
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import features as F    # noqa: E402
import align as A       # noqa: E402
import score as S       # noqa: E402


def build_score(args):
    if args.consensus:
        members = [(v.strip(), args.pass_) for v in args.version.split(',')]
        return S.consensus(args.song, members, members[0] if args.center_first else None)
    return S.pass_score(args.song, args.version, args.pass_)


def run(media, score, offset=None, max_occ=4):
    feat = F.analyze(F.load_audio(media))
    res = A.follow(feat, score, offset=offset, max_occ=max_occ)
    for o in res['occurrences']:
        for n in o['notes']:
            n['midi'] = score['notes'][n['i']]['midi']
    return res


def summary(res, score):
    lines = [f"tuning offset {res['offset']:+.2f} half steps; {len(res['occurrences'])} occurrence(s)"]
    for k, o in enumerate(res['occurrences']):
        lines.append(f"  #{k + 1}: {o['start']:.2f}-{o['end']:.2f} s, {o['played']}/{o['of']} notes found, "
                     f"{len(o['extras'])} extra picks, mean confidence "
                     f"{sum(n['conf'] for n in o['notes'] if n['played']) / max(1, o['played']):.2f}")
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('media')
    ap.add_argument('--song', required=True)
    ap.add_argument('--version', required=True)
    ap.add_argument('--pass', dest='pass_', default='p1')
    ap.add_argument('--consensus', action='store_true')
    ap.add_argument('--center-first', action='store_true', help='consensus timing from the first version listed')
    ap.add_argument('--json')
    ap.add_argument('--video')
    ap.add_argument('--mix')
    ap.add_argument('--offset', type=float)
    ap.add_argument('--max-occ', type=int, default=4)
    ap.add_argument('--label', help='text shown in the corner of the video')
    args = ap.parse_args()

    t0 = time.time()
    score = build_score(args)
    res = run(args.media, score, args.offset, args.max_occ)
    res.update(media=os.path.basename(args.media), song=args.song, version=args.version, pass_id=args.pass_,
               score_label=score['label'], seconds=round(time.time() - t0, 1))
    print(summary(res, score))
    if args.json:
        json.dump({'score': score, 'result': res}, open(args.json, 'w'), ensure_ascii=False, indent=1)
        print('wrote', args.json)
    if args.video or args.mix:
        import overlay
        label = args.label or f"following {score['label']}"
        if args.video:
            overlay.render(args.media, res, score, args.video, label)
            print('wrote', args.video)
        if args.mix:
            overlay.render(args.media, res, score, args.mix, 'computer oud on · ' + label, mix=True)
            print('wrote', args.mix)


if __name__ == '__main__':
    main()
