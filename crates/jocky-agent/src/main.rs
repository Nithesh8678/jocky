use serde_json::{json,Value};
use std::{path::PathBuf,time::Duration};
use hmac::{Hmac,Mac};use sha2::Sha256;
use reqwest::blocking::Client;
use jocky_common::VERSION;
fn main(){if let Err(e)=main_loop(){eprintln!("{}",json!({"level":"error","component":"agent","message":e}));std::process::exit(1)}}
fn config_path()->PathBuf{std::env::var("JOCKY_AGENT_STATE").map(PathBuf::from).unwrap_or_else(|_|std::env::current_dir().unwrap().join(".jocky-agent.json"))}
fn save(path:&PathBuf,v:&Value)->Result<(),String>{use std::io::Write;let mut options=std::fs::OpenOptions::new();options.write(true).create_new(true);#[cfg(unix)]{use std::os::unix::fs::OpenOptionsExt;options.mode(0o600);}let mut f=options.open(path).map_err(|e|e.to_string())?;f.write_all(serde_json::to_string(v).unwrap().as_bytes()).map_err(|e|e.to_string())}
fn decode(r:reqwest::blocking::Response)->Result<Value,String>{let status=r.status();if !status.is_success(){return Err(format!("Server returned {status}"))}r.json().map_err(|e|e.to_string())}
fn main_loop()->Result<(),String>{
 if std::env::args().any(|s|s=="--version"){println!("jocky-agent {VERSION}");return Ok(())}
 let server=std::env::var("JOCKY_SERVER_URL").unwrap_or_else(|_|"http://127.0.0.1:58000".into()).trim_end_matches('/').to_string();
 let url=reqwest::Url::parse(&server).map_err(|e|e.to_string())?;let local=matches!(url.host_str(),Some("localhost"|"127.0.0.1"|"[::1]"));
 if url.scheme()!="https"&&!(local&&std::env::var("JOCKY_ALLOW_LOOPBACK_HTTP").as_deref()==Ok("1")){return Err("HTTPS required. Local development only: set JOCKY_ALLOW_LOOPBACK_HTTP=1 for loopback".into())}
 if !url.username().is_empty()||url.password().is_some()||url.query().is_some(){return Err("Server URL cannot contain credentials or a query".into())}
 let client=Client::builder().timeout(Duration::from_secs(40)).redirect(reqwest::redirect::Policy::none()).build().map_err(|e|e.to_string())?;
 let path=config_path();
 let mut identity:Value=if path.exists(){#[cfg(unix)]{use std::os::unix::fs::PermissionsExt;if path.metadata().map_err(|e|e.to_string())?.permissions().mode()&0o077!=0{return Err("Agent state must have permissions 0600".into())}}serde_json::from_str(&std::fs::read_to_string(&path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?}else{
 let token=std::env::var("ENROLLMENT_TOKEN").map_err(|_|"Set ENROLLMENT_TOKEN for first enrollment")?;let sys=jocky_runtime::collectors::collect("system",&json!({}));let hostname=sys.observations.first().and_then(|o|o.data["hostname"].as_str()).unwrap_or("unknown");let mut id=decode(client.post(format!("{server}/api/agent/enroll")).json(&json!({"token":token,"hostname":hostname,"os":std::env::consts::OS,"architecture":std::env::consts::ARCH,"agent_version":VERSION})).send().map_err(|e|e.to_string())?)?;id["server"]=server.clone().into();save(&path,&id)?;id};
 if identity["server"]!=server{return Err("Saved identity belongs to a different server".into())}
 let credential=identity["credential"].take().as_str().ok_or("Invalid identity")?.to_string();let endpoint=identity["endpoint_id"].as_str().ok_or("Invalid identity")?.to_string();
 println!("{}",json!({"event":"agent_started","endpoint_id":endpoint,"version":VERSION,"server":server}));
 let mut failures=0u32;
 loop{let cycle=(||->Result<(),String>{
 let heartbeat=json!({"user":std::env::var("USER").or_else(|_|std::env::var("USERNAME")).ok(),"agent_version":VERSION});
 decode(client.post(format!("{server}/api/agent/heartbeat")).bearer_auth(&credential).json(&heartbeat).send().map_err(|e|e.to_string())?)?;
 let jobs=decode(client.post(format!("{server}/api/agent/poll")).bearer_auth(&credential).json(&json!({})).send().map_err(|e|e.to_string())?)?;
 for envelope in jobs.as_array().ok_or("Invalid job list")?{
 let payload=envelope["payload"].as_str().ok_or("Missing signed payload")?;let sig=envelope["signature"].as_str().ok_or("Missing signature")?;
 let bytes=(0..sig.len()).step_by(2).map(|i|sig.get(i..i+2).ok_or("Invalid signature").and_then(|s|u8::from_str_radix(s,16).map_err(|_|"Invalid signature"))).collect::<Result<Vec<_>,_>>()?;
 let mut mac=Hmac::<Sha256>::new_from_slice(credential.as_bytes()).map_err(|e|e.to_string())?;mac.update(payload.as_bytes());mac.verify_slice(&bytes).map_err(|_|"Invalid job signature")?;
 let job:Value=serde_json::from_str(payload).map_err(|e|e.to_string())?;if job["endpoint_id"]!=endpoint{return Err("Job addressed to different endpoint".into())}if job["expires_at"].as_i64().unwrap_or(0)<chrono::Utc::now().timestamp(){return Err("Expired job".into())}
 let kind=job["kind"].as_str().ok_or("Missing job kind")?;if !["quick","deep","system","process","network","files","persistence","driver","event","ioc","script"].contains(&kind){return Err("Job kind not allowed".into())}
 let target=job["target_id"].as_str().ok_or("Missing target")?;let lease=job["lease_id"].clone();
 decode(client.post(format!("{server}/api/agent/jobs/{target}/start")).bearer_auth(&credential).json(&json!({"lease_id":lease})).send().map_err(|e|e.to_string())?)?;
 println!("{}",json!({"event":"job_running","target_id":target,"kind":kind}));
 let result=if kind=="script"{match jocky_runtime::run(job["params"]["source"].as_str().ok_or("Missing source")?,None){Ok(v)=>json!({"observations":[jocky_common::Observation::new("finding","jocky.runtime",v)],"errors":[]}),Err(e)=>json!({"observations":[],"errors":[e]})}}else{serde_json::to_value(jocky_runtime::collectors::collect(kind,&job["params"])).unwrap()};
 let body=json!({"lease_id":lease,"observations":result["observations"],"errors":result["errors"]});
 let mut delivered=false;for attempt in 0..3{match client.post(format!("{server}/api/agent/jobs/{target}/result")).bearer_auth(&credential).json(&body).send().map_err(|e|e.to_string()).and_then(decode){Ok(_)=>{delivered=true;break},Err(e)=>{eprintln!("{}",json!({"event":"result_retry","attempt":attempt,"error":e}));std::thread::sleep(Duration::from_secs(2));}}}
 if !delivered{return Err("Result delivery failed; lease will allow safe read-only recollection".into())}println!("{}",json!({"event":"job_result_accepted","target_id":target,"observations":body["observations"].as_array().map(|a|a.len()),"errors":body["errors"]}));
 }Ok(())})();
 match cycle{Ok(())=>failures=0,Err(e)=>{failures=(failures+1).min(5);eprintln!("{}",json!({"event":"reconnect","error":e,"attempt":failures}));}}
 if std::env::args().any(|s|s=="--once"){return if failures==0{Ok(())}else{Err("Agent cycle failed".into())}}
 std::thread::sleep(Duration::from_secs((5*2u64.pow(failures)).min(60)));
 }
}
