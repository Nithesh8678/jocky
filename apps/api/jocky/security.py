import hashlib, secrets, jwt
from datetime import timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from pwdlib import PasswordHash
from .db import User,UserRole,Endpoint,get_db,now,AuditLog
from .config import settings
passwords=PasswordHash.recommended()
bearer=HTTPBearer(auto_error=False)
def digest(s): return hashlib.sha256(s.encode() if isinstance(s,str) else s).hexdigest()
def token_for(user):return jwt.encode({'sub':user.id,'org':user.org_id,'type':'access','exp':now()+timedelta(minutes=30),'iat':now(),'jti':secrets.token_hex(16),'iss':'jocky'},settings.jwt_secret,algorithm='HS256')
def resolve_user(token,db):
    try:
        data=jwt.decode(token,settings.jwt_secret,algorithms=['HS256'],issuer='jocky',options={'require':['sub','exp','iat','iss','type']})
        if data['type']!='access':raise ValueError()
        u=db.get(User,data['sub'])
        if not u or u.org_id!=data['org']:raise ValueError()
        return u
    except (jwt.InvalidTokenError,ValueError,KeyError):raise HTTPException(401,'Session expired or invalid')
def current_user(c:HTTPAuthorizationCredentials=Depends(bearer),db=Depends(get_db)):
    if not c:raise HTTPException(401,'Sign in required')
    return resolve_user(c.credentials,db)
def role_of(db,user):return db.scalar(select(UserRole.role).where(UserRole.user_id==user.id)) or 'Viewer'
PERMISSIONS={'read':{'Admin','Investigator','Analyst','Viewer'},'scan':{'Admin','Investigator'},'query':{'Admin','Investigator','Analyst'},'notes':{'Admin','Investigator','Analyst'},'write':{'Admin','Investigator'},'admin':{'Admin'}}
def require(permission):
    def check(u=Depends(current_user),db=Depends(get_db)):
        if role_of(db,u) not in PERMISSIONS[permission]:raise HTTPException(403,f'Your role cannot perform {permission} actions')
        return u
    return check
def current_agent(c:HTTPAuthorizationCredentials=Depends(bearer),db=Depends(get_db)):
    if not c:raise HTTPException(401,'Agent identity required')
    endpoint=db.scalar(select(Endpoint).where(Endpoint.credential_hash==digest(c.credentials),Endpoint.disabled==False))
    if not endpoint:raise HTTPException(401,'Invalid or disabled endpoint identity')
    return endpoint

def audit(db,user,action,resource,metadata=None):
    db.add(AuditLog(org_id=user.org_id,actor=user.id,action=action,resource=str(resource),metadata_json=metadata or {}))
