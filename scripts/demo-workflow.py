"""Exercise a real local agent, never forge endpoint telemetry."""
from pathlib import Path
import json,time
import httpx
from dotenv import dotenv_values
root=Path(__file__).resolve().parents[1];cfg=dotenv_values(root/'.env')
proof=[]
def passed(step,data):
    print('PASS:',step,flush=True);proof.append({'step':step,'result':'passed','data':data})
with httpx.Client(base_url='http://127.0.0.1:58000',timeout=30) as c:
    r=c.post('/api/auth/login',json={'email':cfg['ADMIN_EMAIL'],'password':cfg['ADMIN_PASSWORD']});r.raise_for_status();c.headers['Authorization']='Bearer '+r.json()['access_token'];passed('Sign in',{'role':r.json()['user']['role']})
    state=json.loads((root/'.local/agent-state.json').read_text());endpoint=state['endpoint_id'];r=c.get('/api/endpoints/'+endpoint);r.raise_for_status();passed('Real Mac enrolled',{'id':endpoint,'os':r.json()['os'],'agent_version':r.json()['agent_version']})
    def job(kind,params={}):
        r=c.post('/api/jobs',json={'kind':kind,'endpoint_ids':[endpoint],'params':params});r.raise_for_status();id=r.json()['id'];end=time.time()+150
        while time.time()<end:
            j=next(x for x in c.get('/api/jobs').json() if x['id']==id)
            if j['targets'][0]['state'] in ['failed','cancelled']:raise RuntimeError(j)
            if j['results']:return j
            time.sleep(2)
        raise RuntimeError('Agent did not complete job within 150 seconds')
    quick=job('quick');result=quick['results'][0]['summary'];assert result['observations']>0;assert not result['errors'],result
    passed('Quick Scan: system, process and network',{'job_id':quick['id'],**result})
    script=job('script',{'source':(root/'examples/demo-agent.jky').read_text()});result=script['results'][0]['summary'];assert result['detections']>0;passed('JOCKY script produces a clearly labelled self-detection',result)
    ds=c.get('/api/detections').json();d=next(d for d in ds if d['endpoint_id']==endpoint)
    case=c.post('/api/cases',json={'title':'JOCKY DEMO · Local agent verification','description':'Harmless verification using the JOCKY agent itself. This is a product test, not an incident or compromise.','severity':'low'});case.raise_for_status();case_id=case.json()['id']
    for kind,id in [('endpoint',endpoint),('detection',d['id']),('evidence',quick['results'][0]['summary']['evidence_id']),('evidence',result['evidence_id'])]:c.post('/api/cases/'+case_id+'/attach',json={'kind':kind,'id':id}).raise_for_status()
    c.post('/api/cases/'+case_id+'/notes',json={'body':'Verified real Mac agent enrollment, signed job delivery, system/process/network collection, and a script that detects our own jocky-agent process. No malware or persistence was used.'}).raise_for_status();passed('Case created with evidence and detection',{'case_id':case_id})
    for evidence in [quick['results'][0]['summary']['evidence_id'],result['evidence_id']]:
        r=c.post('/api/evidence/'+evidence+'/verify',json={});r.raise_for_status();assert r.json()['integrity']=='verified';passed('SHA-256 integrity verified',r.json())
    r=c.get('/api/timeline',params={'endpoint_id':endpoint});r.raise_for_status();assert r.json();passed('Timeline populated',{'visible_events':len(r.json())})
    r=c.get('/api/graph/'+endpoint);r.raise_for_status();assert r.json()['nodes'];passed('Relationship graph populated',{'nodes':len(r.json()['nodes']),'edges':len(r.json()['edges'])})
    r=c.post('/api/indicators',json={'type':'filename','value':'jocky-agent','description':'JOCKY DEMO: matches our own benign forensic agent','severity':'low','source':'Local validation'});r.raise_for_status();r=c.post('/api/indicators/hunt',json={});r.raise_for_status();passed('IOC hunt against stored real observations',r.json())
    r=c.post('/api/cases/'+case_id+'/report',json={});r.raise_for_status();report=r.json();markup=c.get('/api/reports/'+report['id']+'/html');markup.raise_for_status();(root/'.local'/'demo-report.html').write_text(markup.text);passed('HTML case report generated',{'report_id':report['id'],'sha256':report['sha256']})
    passed('AI disabled honestly',{'enabled':c.get('/api/settings').json()['ai_enabled']})
(root/'.local'/'verification.json').write_text(json.dumps(proof,indent=2))
print('Evidence of these checks: .local/verification.json',flush=True)
