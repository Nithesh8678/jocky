use serde::{Serialize,Deserialize};
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const MAX_OBSERVATIONS: usize = 4000;
#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct Observation {pub kind:String,pub collector:String,pub collected_at:String,pub source:String,pub data:serde_json::Value}
impl Observation { pub fn new(kind:&str,source:&str,data:serde_json::Value)->Self{Self{kind:kind.into(),collector:format!("{}.{}",std::env::consts::OS,kind),collected_at:chrono::Utc::now().to_rfc3339(),source:source.into(),data}} }
#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct Collection {pub observations:Vec<Observation>,pub errors:Vec<String>}
