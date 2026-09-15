import json,hashlib,subprocess,tempfile,re,html
from pathlib import Path
import boto3, redis, yaml
from botocore.config import Config
from sqlalchemy import select,func
from fastapi import HTTPException
from .db import *
from .security import digest
from .config import settings
cache=redis.Redis.from_url(settings.redis_url,decode_responses=True,socket_connect_timeout=3,socket_timeout=3)
s3=boto3.client('s3',endpoint_url=settings.s3_endpoint,aws_access_key_id=settings.s3_access_key,aws_secret_access_key=settings.s3_secret_key,region_name='us-east-1',config=Config(signature_version='s3v4',connect_timeout=3,read_timeout=10,retries={'max_attempts':2}))
def serial(record,exclude=()):
    return {c.name:getattr(record,c.name) for c in record.__table__.columns if c.name not in exclude}
def emit(org,event,resource=''):
    try:cache.publish('jocky:'+org,json.dumps({'event':event,'resource':resource,'timestamp':now().isoformat()}))
    except redis.RedisError:pass # persisted database is authoritative; UI polling remains available

def owned(db,model,id,org):
    row=db.get(model,id)
    if not row or getattr(row,'org_id',None)!=org:raise HTTPException(404,'Resource not found')
    return row

def cli(mode,source,fixtures=None):
    if len(source.encode())>65536:raise HTTPException(422,'Script exceeds 64 KiB')
    exe=Path(settings.jocky_cli).resolve()
    if not exe.is_file():raise HTTPException(503,'Compiler not built. Run scripts/rust.sh build --workspace')
    with tempfile.TemporaryDirectory(prefix='jocky-compile-') as tmp:
        cmd=[str(exe),mode,'-']
        if fixtures is not None:
            f=Path(tmp)/'fixtures.json';f.write_text(json.dumps(fixtures));cmd+=['--fixtures',str(f)]
        try:p=subprocess.run(cmd,input=source,text=True,capture_output=True,timeout=15,env={'PATH':'/usr/bin:/bin','JOCKY_SAFE_PATHS':tmp})
        except subprocess.TimeoutExpired:raise HTTPException(422,'Compiler execution time limit exceeded')
    if p.returncode:raise HTTPException(422,p.stderr[:4000])
    return p.stdout if mode=='fmt' else json.loads(p.stdout)

def custody(db,evidence,actor,action):
    # Row lock serializes concurrent custody entries for this evidence object.
    db.execute(select(Evidence).where(Evidence.id==evidence.id).with_for_update()).scalar_one()
    prev=db.scalar(select(EvidenceAccessLog).where(EvidenceAccessLog.evidence_id==evidence.id).order_by(EvidenceAccessLog.created_at.desc(),EvidenceAccessLog.id.desc()).limit(1))
    id=uid();t=now();previous=prev.entry_hash if prev else '0'*64
    h=digest(json.dumps([id,evidence.id,actor,action,t.isoformat(),previous],separators=(',',':')))
    db.add(EvidenceAccessLog(id=id,created_at=t,evidence_id=evidence.id,actor=actor,action=action,previous_hash=previous,entry_hash=h));db.flush()

def risk(db,endpoint):
    rows=db.scalars(select(Detection).where(Detection.endpoint_id==endpoint,Detection.status.in_(['new','investigating']))).all()
    reasons={}
    for d in rows:reasons[d.fingerprint]={'title':d.title,'points':d.score,'detection_id':d.id}
    return {'score':min(100,sum(r['points'] for r in reasons.values())),'reasons':list(reasons.values())}

def endpoint_view(db,e):
    d=serial(e,('credential_hash',));d['risk']=risk(db,e.id)
    busy=db.scalar(select(func.count()).select_from(JobTarget).where(JobTarget.endpoint_id==e.id,JobTarget.state.in_(['running','dispatched'])))
    d['status']='offline' if (now()-e.last_seen).total_seconds()>30 else 'busy' if busy else 'degraded' if e.info.get('degraded') else 'online'
    if e.disabled:d['status']='disabled'
    return d

SEVERITIES={'informational':0,'low':5,'medium':10,'high':25,'critical':40}
def compile_rule(fmt,source):
    if fmt=='sigma':
        try:v=yaml.safe_load(source)
        except yaml.YAMLError as e:raise HTTPException(422,str(e))
        if not isinstance(v,dict) or not all(k in v for k in ['title','logsource','detection']):raise HTTPException(422,'Sigma requires title, logsource and detection')
        det=v['detection'];selection=det.get('selection') if isinstance(det,dict) else None
        supported=isinstance(selection,dict) and det.get('condition')=='selection' and all('|' not in k and isinstance(val,(str,int,bool,list)) for k,val in selection.items())
        return {'supported':supported,'selection':selection if supported else {},'severity':v.get('level','medium'),'message':v['title'],'note':'Exact selection condition only; unsupported Sigma stays stored and disabled'}
    if fmt!='jocky':raise HTTPException(422,'Rule format must be jocky or sigma')
    pattern=r'\s*rule\s+(\w+)\s*\{\s*when:\s*(.*?)\s+severity:\s*(informational|low|medium|high|critical)\s+message:\s*("(?:[^"\\]|\\.)*")\s*\}\s*'
    m=re.fullmatch(pattern,source,re.S)
    if not m:raise HTTPException(422,'Use rule name { when: process.name == "x" severity: high message: "Explanation" }')
    cond=m[2];parts=re.split(r'\s+and\s+',cond);checks=[]
    for part in parts:
        c=re.fullmatch(r'([\w.]+)\s*(==|!=)\s*("(?:[^"\\]|\\.)*"|true|false|\d+)',part.strip())
        if not c:raise HTTPException(422,'Native rules currently support field == value / != value joined by and')
        checks.append([c[1],c[2],json.loads(c[3])])
    return {'supported':True,'checks':checks,'severity':m[3],'message':json.loads(m[4])}

def field(data,path):
    for k in path.split('.'):
        if not isinstance(data,dict):return None
        data=data.get(k)
    return data

def matches_rule(rule,obs):
    c=rule.compiled
    if not c.get('supported'):return False
    if rule.format=='jocky':
        scope={obs.kind:obs.data};return all((field(scope,k)==v) if op=='==' else (field(scope,k)!=v) for k,op,v in c['checks'])
    # Explicit normalized Sigma subset, common aliases only.
    aliases={'Image':'path','ParentImage':'parent.path','CommandLine':'command_line','EventID':'event_type','DestinationIp':'remote_ip','DestinationPort':'remote_port'}
    return all((field(obs.data,aliases.get(k,k)) in v if isinstance(v,list) else field(obs.data,aliases.get(k,k))==v) for k,v in c['selection'].items())

def indicator_match(i,o):
    fields={'ip':['remote_ip','local_address'],'domain':['remote_host','domain'],'hash':['sha256'],'filename':['name'],'path':['path']}
    return any(str(field(o.data,k) or '').lower()==i.value.lower() for k in fields[i.type])

def detect(db,observations,org):
    rules=db.scalars(select(DetectionRule).where(DetectionRule.org_id==org,DetectionRule.enabled==True)).all()
    indicators=db.scalars(select(Indicator).where(Indicator.org_id==org)).all();count=0
    for o in observations:
        hits=[]
        for r in rules:
            if matches_rule(r,o):hits.append(('rule:'+r.id,r.compiled['message'],r.compiled.get('severity','medium'),{'rule_id':r.id}))
        for i in indicators:
            if indicator_match(i,o):
                hits.append(('ioc:'+i.id,'Indicator matched: '+i.value,i.severity,{'indicator_id':i.id,'source':i.source}))
                if not db.scalar(select(IndicatorMatch).where(IndicatorMatch.indicator_id==i.id,IndicatorMatch.observation_id==o.id)):db.add(IndicatorMatch(indicator_id=i.id,observation_id=o.id))
        if o.kind=='finding' and o.data.get('alerts'):hits.append(('script:'+o.job_id,'JOCKY script reported a finding','medium',{'alerts':o.data['alerts']}))
        # Name-only watchlist raises a low-confidence review item, not a vulnerability assertion.
        if o.kind=='driver' and str(o.data.get('name','')).lower().removesuffix('.sys') in ['rtcore64','dbutil_2_3','gdrv']:
            hits.append(('driver:'+o.data['name'],'Driver name on review watchlist; verify version/hash','medium',{'confidence':'name only','not_confirmed_vulnerable':True}))
        for fp,title,severity,details in hits:
            if not db.scalar(select(Detection).where(Detection.observation_id==o.id,Detection.fingerprint==fp)):
                db.add(Detection(org_id=org,endpoint_id=o.endpoint_id,observation_id=o.id,fingerprint=fp,title=title,severity=severity,status='new',score=SEVERITIES.get(severity,10),details=details));count+=1
    db.flush();return count

def ingest(db,e,job,items,errors):
    raw=json.dumps({'observations':items,'errors':errors},sort_keys=True,separators=(',',':'),ensure_ascii=False).encode();eid=uid();key=f'{e.org_id}/{e.id}/{eid}.json'
    s3.put_object(Bucket=settings.s3_bucket,Key=key,Body=raw,ContentType='application/json',Metadata={'sha256':digest(raw)})
    evidence=Evidence(id=eid,org_id=e.org_id,endpoint_id=e.id,job_id=job.id,collector=job.kind,object_key=key,sha256=digest(raw),size=len(raw),integrity='unchecked');db.add(evidence);db.flush();custody(db,evidence,e.id,'uploaded')
    timeline=db.scalar(select(Timeline).where(Timeline.endpoint_id==e.id))
    if not timeline:timeline=Timeline(endpoint_id=e.id);db.add(timeline);db.flush()
    observations=[]
    projections={'process':(ProcessObservation,['pid','parent_pid','name']),'network':(NetworkObservation,['remote_ip','remote_port']),'file':(FileObservation,['path','sha256']),'persistence':(PersistenceObservation,['mechanism']),'driver':(DriverObservation,['name']),'system':(SystemObservation,['hostname']),'event':(LogObservation,['event_type'])}
    for item in items:
        t=datetime.fromisoformat(item['collected_at'].replace('Z','+00:00'))
        o=Observation(org_id=e.org_id,endpoint_id=e.id,job_id=job.id,collector=item['collector'],collected_at=t,source=item['source'],agent_version=e.agent_version,kind=item['kind'],data=item['data'],sha256=digest(json.dumps(item['data'],sort_keys=True,separators=(',',':'))));db.add(o);db.flush();observations.append(o)
        if o.kind in projections:
            cls,fields=projections[o.kind];db.add(cls(observation_id=o.id,**{f:o.data.get(f) for f in fields}))
        db.add(TimelineEvent(timeline_id=timeline.id,observation_id=o.id,event_type=o.kind+'_observed',timestamp=t))
    count=detect(db,observations,e.org_id)
    return {'evidence_id':eid,'observations':len(observations),'detections':count,'errors':errors}

def report_html(db,c):
    endpoint_ids=list(db.scalars(select(CaseEndpoint.endpoint_id).where(CaseEndpoint.case_id==c.id)))
    evidence_ids=list(db.scalars(select(CaseEvidence.evidence_id).where(CaseEvidence.case_id==c.id)))
    detection_ids=list(db.scalars(select(CaseDetection.detection_id).where(CaseDetection.case_id==c.id)))
    sections={
      'Executive summary':{'title':c.title,'description':c.description,'status':c.status,'severity':c.severity},
      'Affected endpoints and explainable risk':[endpoint_view(db,e) for e in db.scalars(select(Endpoint).where(Endpoint.id.in_(endpoint_ids)))],
      'Attached detections':[serial(x) for x in db.scalars(select(Detection).where(Detection.id.in_(detection_ids)))],
      'Evidence':[serial(x) for x in db.scalars(select(Evidence).where(Evidence.id.in_(evidence_ids)))],
      'Chain of custody':[serial(x) for x in db.scalars(select(EvidenceAccessLog).where(EvidenceAccessLog.evidence_id.in_(evidence_ids)).order_by(EvidenceAccessLog.created_at))],
      'Analyst notes':[serial(x) for x in db.scalars(select(CaseNote).where(CaseNote.case_id==c.id))],
      'Recommendations':['Verify detection context before concluding compromise.','Preserve original artifacts and recheck SHA-256 before transfer.','A snapshot proves observation time; it does not prove when an action first occurred.']}
    sections['Timeline and forensic observations (latest 500)']=[serial(o) for o in db.scalars(select(Observation).where(Observation.endpoint_id.in_(endpoint_ids)).order_by(Observation.collected_at.desc()).limit(500))]
    content=''.join(f'<section><h2>{html.escape(k)}</h2><pre>{html.escape(json.dumps(v,indent=2,default=str))}</pre></section>' for k,v in sections.items())
    return '<!doctype html><html><head><meta charset="utf-8"><title>JOCKY incident report</title><style>body{font:14px system-ui;max-width:1000px;margin:40px auto;color:#14202b}h1{letter-spacing:4px}h2{border-bottom:1px solid #abb;padding:12px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px monospace}section{break-inside:auto}@media print{body{margin:15mm}}</style></head><body><h1>JOCKY / INCIDENT REPORT</h1><p>Generated '+now().isoformat()+' · Case '+c.id+'</p>'+content+'</body></html>'
