# Basic Pitch note events of a whole recording (song-standard step 2). usage: bp.py tuned.wav out.json
import sys, json, time
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH
t=time.time()
_, midi, ev = predict(sys.argv[1], onset_threshold=0.4, frame_threshold=0.25, minimum_note_length=40)
ev = sorted([[round(float(s),3), round(float(e),3), int(p), round(float(a),3)] for s,e,p,a,*_ in ev])
json.dump(ev, open(sys.argv[2],'w')); print(len(ev), 'events', round(time.time()-t,1),'s', file=sys.stderr)
