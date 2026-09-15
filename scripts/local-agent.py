"""Enroll/start a project-local foreground agent. Credentials never printed."""
import os,json,subprocess,sys
from pathlib import Path
import httpx
from dotenv import dotenv_values
root=Path(__file__).resolve().parents[1];env=dotenv_values(root/'.env')
state=root/'.local'/'agent-state.json'
agent_env={**os.environ,'JOCKY_SERVER_URL':'http://127.0.0.1:58000','JOCKY_ALLOW_LOOPBACK_HTTP':'1','JOCKY_AGENT_STATE':str(state),'JOCKY_SAFE_PATHS':str(root/'.local'/'demo')}
(root/'.local'/'demo').mkdir(exist_ok=True)
with httpx.Client(base_url=agent_env['JOCKY_SERVER_URL'],timeout=30) as c:
    if not state.exists():
        r=c.post('/api/auth/login',json={'email':env['ADMIN_EMAIL'],'password':env['ADMIN_PASSWORD']});r.raise_for_status();headers={'Authorization':'Bearer '+r.json()['access_token']}
        r=c.post('/api/enrollments',json={'uses':1},headers=headers);r.raise_for_status();agent_env['ENROLLMENT_TOKEN']=r.json()['token']
print('Starting the real read-only Mac agent. Log: .local/agent.log',flush=True)
with (root/'.local'/'agent.log').open('a') as log:
    raise SystemExit(subprocess.call([str(root/'target/debug/jocky-agent'),*sys.argv[1:]],env=agent_env,stdout=log,stderr=log))
