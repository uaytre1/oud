"""Overlay a version's OWN measured notes on its own video, at the measured times (no re-finding).

The follower can slip by 0.2-0.3 s inside runs of the same note (four فا in a row). For a version that was
measured from this very video, its own times are better than any re-alignment: this draws them as they are.
Needs a follower JSON for the same video/version (it gives the start of the pass in the video) or --start.

usage: python3 tools/follow/overlay_measured.py VIDEO --song hob-eih --version player-4 --pass p1 \
         --start 13.13 --mix out.mp4 [--video out_plain.mp4]
"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import score as S       # noqa: E402
import overlay          # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('media')
    ap.add_argument('--song', required=True)
    ap.add_argument('--version', required=True)
    ap.add_argument('--pass', dest='pass_', default='p1')
    ap.add_argument('--start', type=float, required=True, help='where the pass starts in the video (media.starts)')
    ap.add_argument('--video')
    ap.add_argument('--mix')
    args = ap.parse_args()
    score = S.pass_score(args.song, args.version, args.pass_)
    base = score['notes'][0]['t']
    notes = [{'i': i, 'key': n['key'], 'ar': n.get('ar'), 'line': n.get('line'), 'flag': n.get('flag', ''),
              'played': True, 'in_range': True, 't': round(args.start + n['t'] - base, 3),
              'expected_t': round(args.start + n['t'] - base, 3), 'conf': 1.0, 'midi': n['midi']}
             for i, n in enumerate(score['notes'])]
    occ = {'start': notes[0]['t'], 'end': notes[-1]['t'] + 1.0, 'notes': notes, 'extras': [], 'offset': 0.0,
           'tempo_scale': 1.0, 'found_share': 1.0, 'played': len(notes), 'of': len(notes)}
    res = {'offset': 0.0, 'occurrences': [occ]}
    label = f"{score['label']} · measured times"
    if args.video: overlay.render(args.media, res, score, args.video, label); print('wrote', args.video)
    if args.mix: overlay.render(args.media, res, score, args.mix, 'computer oud on · ' + label, mix=True); print('wrote', args.mix)


if __name__ == '__main__':
    main()
