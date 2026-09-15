use jocky_common::{Collection,Observation,MAX_OBSERVATIONS};
use serde_json::{json,Value};
use sha2::{Sha256,Digest};
use std::{path::{Path,PathBuf},process::{Command,Stdio},time::{Duration,Instant},io::Read};
use sysinfo::{System,Disks,Networks,Users};
pub fn allowed_path(p:&str)->Result<PathBuf,String>{
 let path=Path::new(p).canonicalize().map_err(|e|format!("Path unavailable: {e}"))?;
 let roots=std::env::var("JOCKY_SAFE_PATHS").unwrap_or_else(|_|std::env::temp_dir().join("jocky-demo").to_string_lossy().into());
 if !std::env::split_paths(&roots).any(|r|r.canonicalize().map(|r|path.starts_with(r)).unwrap_or(false)){return Err("Path is outside JOCKY_SAFE_PATHS; explicitly configure a collection directory".into())}Ok(path)
}
fn file_data(path:&Path,hash:bool)->Result<Value,String>{
 let meta=path.metadata().map_err(|e|e.to_string())?;
 let mut v=json!({"path":path.to_string_lossy(),"name":path.file_name().map(|s|s.to_string_lossy()),"size":meta.len(),"is_file":meta.is_file(),"modified":meta.modified().ok().map(|t|chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()),"signature_state":"unsupported"});
 if hash&&meta.is_file(){if meta.len()>32*1024*1024{return Err("Hashing limited to files up to 32 MiB".into())}let mut f=std::fs::File::open(path).map_err(|e|e.to_string())?;let mut h=Sha256::new();let mut b=[0u8;65536];let mut read=0;loop{let n=f.read(&mut b).map_err(|e|e.to_string())?;if n==0{break}read+=n;if read>32*1024*1024{return Err("File grew beyond limit".into())}h.update(&b[..n]);}v["sha256"]=format!("{:x}",h.finalize()).into();}Ok(v)
}
// Only this module specifies executable names and fixed command arguments. Remote input never becomes a command.
fn read_command(program:&str,args:&[&str])->Result<String,String>{
 let mut child=Command::new(program).args(args).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e|format!("{program}: {e}"))?;
 let out=child.stdout.take().unwrap();let err=child.stderr.take().unwrap();
 let reader=std::thread::spawn(move||{let mut b=Vec::new();out.take(2*1024*1024+1).read_to_end(&mut b).map(|_|b)});
 let errors=std::thread::spawn(move||{let mut b=Vec::new();err.take(8192).read_to_end(&mut b).map(|_|b)});
 let start=Instant::now();let status=loop{if let Some(s)=child.try_wait().map_err(|e|e.to_string())?{break s}if start.elapsed()>Duration::from_secs(15){let _=child.kill();let _=child.wait();return Err(format!("{program}: collector timed out after 15 seconds"))}std::thread::sleep(Duration::from_millis(25));};
 let bytes=reader.join().map_err(|_|"reader failed")?.map_err(|e|e.to_string())?;let stderr=errors.join().map_err(|_|"reader failed")?.map_err(|e|e.to_string())?;
 if !status.success(){return Err(format!("{program}: {}",String::from_utf8_lossy(&stderr)))}if bytes.len()>2*1024*1024{return Err("Collector output exceeds 2 MiB".into())}Ok(String::from_utf8_lossy(&bytes).into())
}
#[cfg(target_os="windows")]
fn powershell(script:&str)->Result<Vec<Value>,String>{let s=read_command("powershell.exe",&["-NoProfile","-NonInteractive","-Command",script])?;if s.trim().is_empty(){return Ok(vec![])}let v:Value=serde_json::from_str(s.trim_start_matches('\u{feff}')).map_err(|e|e.to_string())?;Ok(if let Value::Array(a)=v{a}else{vec![v]})}
fn split_addr(s:&str)->(String,Option<u16>){let pos=s.rfind(':').or_else(||s.rfind('.'));if let Some(i)=pos{(s[..i].trim_matches(['[',']']).into(),s[i+1..].parse().ok())}else{(s.into(),None)}}
pub fn collect(kind:&str,params:&Value)->Collection{
 let mut out=Collection{observations:vec![],errors:vec![]};
 let kinds:Vec<&str>=match kind{"quick"|"ioc"=>vec!["system","process","network"],"deep"=>vec!["system","process","network","persistence","driver","event"],"files"=>vec!["file"],k=>vec![k]};
 for k in kinds{match one(k,params){Ok(items)=>out.observations.extend(items),Err(e)=>out.errors.push(format!("{k}: {e}"))}}
 if out.observations.len()>MAX_OBSERVATIONS{out.observations.truncate(MAX_OBSERVATIONS);out.errors.push("Observation limit reached (4000)".into())}out
}
fn one(kind:&str,params:&Value)->Result<Vec<Observation>,String>{
 let mut data:Vec<Value>=vec![];let mut source="OS read-only API";
 match kind{
 "system"=>{let s=System::new_all();let disks=Disks::new_with_refreshed_list();let nets=Networks::new_with_refreshed_list();data.push(json!({"hostname":System::host_name(),"os":System::name(),"os_version":System::os_version(),"architecture":std::env::consts::ARCH,"uptime":System::uptime(),"memory_total":s.total_memory(),"memory_used":s.used_memory(),"cpu_count":s.cpus().len(),"cpu":s.cpus().first().map(|c|c.brand()),"load":System::load_average().one,"user":std::env::var("USER").or_else(|_|std::env::var("USERNAME")).ok(),"disks":disks.list().iter().map(|d|json!({"name":d.name().to_string_lossy(),"total":d.total_space(),"available":d.available_space()})).collect::<Vec<_>>(),"interfaces":nets.iter().map(|(n,_)|n.clone()).collect::<Vec<_>>()}))},
 "process"=>{let s=System::new_all();let users=Users::new_with_refreshed_list();for(pid,p)in s.processes().iter().take(2500){let parent=p.parent().and_then(|id|s.process(id));data.push(json!({"pid":pid.as_u32(),"name":p.name().to_string_lossy(),"path":p.exe().map(|p|p.to_string_lossy()),"parent_pid":p.parent().map(|x|x.as_u32()),"parent":{"name":parent.map(|p|p.name().to_string_lossy()),"pid":p.parent().map(|x|x.as_u32())},"user":p.user_id().and_then(|id|users.get_user_by_id(id)).map(|u|u.name()),"start_time":p.start_time(),"memory":p.memory(),"command_line": if std::env::var("JOCKY_COLLECT_COMMAND_LINES").as_deref()==Ok("1"){Some(p.cmd().iter().map(|x|x.to_string_lossy()).collect::<Vec<_>>().join(" "))}else{None},"signature_state":"not_collected"}));}},
 "user"=>{data=Users::new_with_refreshed_list().iter().take(500).map(|u|json!({"name":u.name(),"id":u.id().to_string()})).collect()},
 "file"=>{let raw=params["path"].as_str().ok_or("Select an explicit path in JOCKY_SAFE_PATHS")?;let p=allowed_path(raw)?;source="bounded explicit file path";if p.is_file(){data.push(file_data(&p,true)?)}else{for f in std::fs::read_dir(&p).map_err(|e|e.to_string())?.take(100){let f=f.map_err(|e|e.to_string())?;if f.file_type().map_err(|e|e.to_string())?.is_symlink(){continue}if f.path().is_file(){data.push(file_data(&f.path(),true)?);}}}},
 "network"=>{
 #[cfg(target_os="windows")]{source="Get-NetTCPConnection";data=powershell("$ErrorActionPreference='Stop'; Get-NetTCPConnection | Select-Object @{n='protocol';e={'tcp'}},@{n='local_address';e={$_.LocalAddress}},@{n='local_port';e={$_.LocalPort}},@{n='remote_ip';e={$_.RemoteAddress}},@{n='remote_port';e={$_.RemotePort}},@{n='state';e={$_.State.ToString()}},@{n='pid';e={$_.OwningProcess}} | ConvertTo-Json -Depth 4 -Compress")?;}
 #[cfg(target_os="macos")]{source="netstat -anv -p tcp";let raw=read_command("/usr/sbin/netstat",&["-anv","-p","tcp"])?;for l in raw.lines().filter(|l|l.starts_with("tcp")).take(1200){let a:Vec<_>=l.split_whitespace().collect();if a.len()>=6{let(ra,rp)=split_addr(a[4]);let(la,lp)=split_addr(a[3]);data.push(json!({"protocol":a[0],"local_address":la,"local_port":lp,"remote_ip":ra,"remote_port":rp,"state":a[5],"pid":a.get(8).and_then(|x|x.parse::<u32>().ok())}));}}}
 #[cfg(target_os="linux")]{source="ss -H -tunap";let raw=read_command("ss",&["-H","-tunap"])?;for l in raw.lines().take(1200){let a:Vec<_>=l.split_whitespace().collect();if a.len()>=6{let(ra,rp)=split_addr(a[5]);let(la,lp)=split_addr(a[4]);let pid=l.split("pid=").nth(1).and_then(|p|p.split(',').next()).and_then(|p|p.parse::<u32>().ok());data.push(json!({"protocol":a[0],"state":a[1],"local_address":la,"local_port":lp,"remote_ip":ra,"remote_port":rp,"pid":pid}));}}}
 },
 "persistence"=>{
 #[cfg(target_os="windows")]{source="Windows services, scheduled tasks and autoruns";data=powershell("$ErrorActionPreference='Stop'; @($(Get-CimInstance Win32_Service | Select-Object @{n='mechanism';e={'service'}},@{n='name';e={$_.Name}},@{n='target';e={$_.PathName}},@{n='state';e={$_.State}}); $(Get-ScheduledTask | Select-Object @{n='mechanism';e={'scheduled_task'}},@{n='name';e={$_.TaskName}},@{n='target';e={($_.Actions.Execute -join ';')}}); $(foreach($p in @('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run')) { if(Test-Path $p){ (Get-ItemProperty $p).PSObject.Properties | Where-Object {$_.Name -notlike 'PS*'} | Select-Object @{n='mechanism';e={'registry_run'}},@{n='name';e={$_.Name}},@{n='target';e={$_.Value}} } })) | ConvertTo-Json -Depth 4 -Compress")?;}
 #[cfg(target_os="linux")]{source="systemd and cron metadata";let raw=read_command("systemctl",&["list-unit-files","--type=service","--no-pager","--no-legend"])?;for l in raw.lines().take(500){data.push(json!({"mechanism":"systemd","target":l,"risk_reason":"Inventory only; presence alone is not malicious"}))}for dir in ["/etc/cron.d","/etc/cron.daily"]{if let Ok(entries)=std::fs::read_dir(dir){for e in entries.flatten().take(100){data.push(json!({"mechanism":"cron","path":e.path().to_string_lossy()}));}}}}
 #[cfg(target_os="macos")]{source="LaunchAgent / LaunchDaemon inventory";for dir in ["/Library/LaunchAgents","/Library/LaunchDaemons"]{for e in std::fs::read_dir(dir).map_err(|e|e.to_string())?.flatten().take(300){data.push(json!({"mechanism":"launchd","name":e.file_name().to_string_lossy(),"path":e.path().to_string_lossy(),"risk_reason":"Inventory only; presence alone is not malicious"}));}}}
 },
 "driver"=>{
 #[cfg(target_os="windows")]{source="Win32_SystemDriver";data=powershell("$ErrorActionPreference='Stop'; Get-CimInstance Win32_SystemDriver | Select-Object @{n='name';e={$_.Name}},@{n='path';e={$_.PathName}},@{n='state';e={$_.State}},@{n='signature_state';e={'not_collected'}} | ConvertTo-Json -Depth 3 -Compress")?;}
 #[cfg(target_os="linux")]{source="/proc/modules";for l in std::fs::read_to_string("/proc/modules").map_err(|e|e.to_string())?.lines().take(500){let a:Vec<_>=l.split_whitespace().collect();data.push(json!({"name":a.first(),"details":l}));}}
 #[cfg(target_os="macos")]{return Err("Driver audit is supported on Windows and Linux; macOS kernel inventory unavailable".into())}
 },
 "event"=>{
 #[cfg(target_os="windows")]{source="Get-WinEvent System last 1h, max 200";data=powershell("$ErrorActionPreference='Stop'; Get-WinEvent -FilterHashtable @{LogName='System';StartTime=(Get-Date).AddHours(-1)} -MaxEvents 200 | Select-Object @{n='timestamp';e={$_.TimeCreated.ToUniversalTime().ToString('o')}},@{n='event_type';e={$_.Id.ToString()}},@{n='source';e={$_.ProviderName}},@{n='message';e={$_.Message.Substring(0,[Math]::Min(4096,$_.Message.Length))}} | ConvertTo-Json -Depth 3 -Compress")?;}
 #[cfg(target_os="linux")]{source="journald last 1h max 200";for l in read_command("journalctl",&["--since","1 hour ago","-n","200","--no-pager","-o","json"])?.lines(){if let Ok(v)=serde_json::from_str::<Value>(l){data.push(json!({"event_type":"system_log","message":v["MESSAGE"],"source":v["SYSLOG_IDENTIFIER"],"timestamp_us":v["__REALTIME_TIMESTAMP"]}))}}}
 #[cfg(target_os="macos")]{return Err("macOS event-log collector is unavailable; use the supported Windows or Linux agent".into())}
 },
 _=>return Err(format!("Unknown collector: {kind}"))}
 Ok(data.into_iter().map(|v|Observation::new(kind,source,v)).collect())
}
pub fn file_builtin(name:&str,args:&[Value])->Result<Value,String>{
 let p=allowed_path(args.first().and_then(Value::as_str).ok_or("Expected a path string")?)?;
 match name{"metadata"|"file_signature_info"=>file_data(&p,false),"hash"=>Ok(file_data(&p,true)?["sha256"].clone()),"recent_files"|"find_by_name"|"find_by_hash"=>{let c=collect("file",&json!({"path":p}));if !c.errors.is_empty(){return Err(c.errors.join("; "))}let mut a:Vec<Value>=c.observations.into_iter().map(|o|o.data).collect();if name=="recent_files"{let seconds=args.get(1).and_then(Value::as_i64).ok_or("recent_files expects duration in seconds")?;a.retain(|v|v["modified"].as_str().and_then(|s|chrono::DateTime::parse_from_rfc3339(s).ok()).map(|t|chrono::Utc::now().timestamp()-t.timestamp()<=seconds).unwrap_or(false));}else{let field=if name=="find_by_name"{"name"}else{"sha256"};let val=args.get(1).ok_or("Expected search value")?;a.retain(|v|&v[field]==val);}Ok(a.into())},_=>Err("Unknown file builtin".into())}
}
#[cfg(test)]mod tests{use super::*;#[test]fn real_system(){let c=collect("system",&json!({}));assert!(c.errors.is_empty());assert!(c.observations[0].data["cpu_count"].as_u64().unwrap()>0)}#[test]fn path_boundary(){assert!(allowed_path("/etc/passwd").is_err());assert!(!collect("shell",&json!({})).errors.is_empty());}}
