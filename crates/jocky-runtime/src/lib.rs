pub mod collectors;
use jocky_ast::{Expr,Stmt,Program};
use serde_json::{Value,json};
use std::collections::HashMap;
#[derive(Default)]pub struct Runtime{pub fixtures:Option<HashMap<String,Value>>,pub reports:Vec<Value>,pub alerts:Vec<Value>,pub errors:Vec<String>,vars:HashMap<String,Value>,funcs:HashMap<String,(Vec<String>,Vec<Stmt>)>,budget:usize,depth:usize,cache:HashMap<String,Value>}
impl Runtime{
 pub fn execute(&mut self,p:&Program)->Result<Value,String>{jocky_parser::validate(p)?;self.budget=100000;self.block(&p.body)?;Ok(json!({"hunt":p.name,"reports":self.reports,"alerts":self.alerts,"collector_errors":self.errors,"mode":if self.fixtures.is_some(){"fixture"}else{"live"}}))}
 fn tick(&mut self)->Result<(),String>{if self.budget==0{Err("Execution budget exhausted".into())}else{self.budget-=1;Ok(())}}
 fn block(&mut self,b:&[Stmt])->Result<Option<Value>,String>{
 for s in b{if let Stmt::Function(n,a,b)=s{self.funcs.insert(n.clone(),(a.clone(),b.clone()));}}
 for s in b{self.tick()?;match s{
 Stmt::Let(n,e)=>{let v=self.eval(e,None)?;self.vars.insert(n.clone(),v);},
 Stmt::Report(e)=>{let v=self.eval(e,None)?;self.reports.push(v);},Stmt::Alert(e)=>{let v=self.eval(e,None)?;self.alerts.push(v);},
 Stmt::Return(e)=>return Ok(Some(self.eval(e,None)?)),
 Stmt::If(c,a,b)=>{let c=self.eval(c,None)?;if let Some(v)=self.block(if truth(&c){a}else{b})?{return Ok(Some(v))}},
 Stmt::For(n,e,b)=>{let v=self.eval(e,None)?;let a=v.as_array().ok_or("for requires a list")?;let prev=self.vars.get(n).cloned();for v in a{self.vars.insert(n.clone(),v.clone());if let Some(v)=self.block(b)?{return Ok(Some(v))}}if let Some(v)=prev{self.vars.insert(n.clone(),v);}else{self.vars.remove(n);}},Stmt::Function(..)=>{}}}Ok(None)
 }
 fn eval(&mut self,e:&Expr,row:Option<&Value>)->Result<Value,String>{self.tick()?;match e{
 Expr::Literal(v)=>Ok(v.clone()),Expr::Name(n)=>row.and_then(|r|r.get(n)).cloned().or_else(||self.vars.get(n).cloned()).ok_or_else(||format!("Unknown field or variable: {n}")),
 Expr::List(a)=>a.iter().map(|e|self.eval(e,row)).collect::<Result<Vec<_>,_>>().map(Value::Array),
 Expr::Field(e,n)=>{let v=self.eval(e,row)?;Ok(v.get(n).cloned().unwrap_or(Value::Null))},
 Expr::Unary(o,e)=>{let v=self.eval(e,row)?;if o=="-"{Ok(json!(-v.as_f64().ok_or("Expected number")?))}else{Ok((!truth(&v)).into())}},
 Expr::Binary(a,o,b)=>{let a=self.eval(a,row)?;if o=="and"&&!truth(&a){return Ok(false.into())}if o=="or"&&truth(&a){return Ok(true.into())}let b=self.eval(b,row)?;binary(a,o,b)},
 Expr::Where(a,p)=>{let v=self.eval(a,row)?;let mut out=vec![];for r in v.as_array().ok_or("where requires a list")?{if truth(&self.eval(p,Some(r))?){out.push(r.clone())}}Ok(out.into())},
 Expr::Call(n,args)=>{let a=args.iter().map(|e|self.eval(e,row)).collect::<Result<Vec<_>,_>>()?;if n=="len"{if a.len()!=1{return Err("len expects one argument".into())}return match &a[0]{Value::Array(a)=>Ok(a.len().into()),Value::String(s)=>Ok(s.len().into()),_=>Err("len requires list or string".into())}}
 if let Some((params,body))=self.funcs.get(n).cloned(){if params.len()!=a.len(){return Err(format!("{n}: wrong argument count"))}if self.depth>=32{return Err("Call depth limit reached".into())}self.depth+=1;let old=self.vars.clone();for(k,v)in params.into_iter().zip(a){self.vars.insert(k,v);}let out=self.block(&body);self.vars=old;self.depth-=1;return out.map(|v|v.unwrap_or(Value::Null))}
 if let Some(fixtures)=&self.fixtures{return fixtures.get(n).cloned().ok_or_else(||format!("Fixture unavailable for {n}"))}
 if ["metadata","hash","recent_files","find_by_name","find_by_hash","file_signature_info"].contains(&n.as_str()){return collectors::file_builtin(n,&a)}
 if !a.is_empty(){return Err(format!("{n} expects no arguments"))}if let Some(v)=self.cache.get(n){return Ok(v.clone())}
 let k=match n.as_str(){"processes"=>"process","drivers"=>"driver","events"=>"event","users"=>"user","files"=>"file",k=>k};let c=collectors::collect(k,&json!({}));self.errors.extend(c.errors.clone());if c.observations.is_empty()&&!c.errors.is_empty(){return Err(c.errors.join("; "))}let v=Value::Array(c.observations.into_iter().map(|o|o.data).collect());self.cache.insert(n.clone(),v.clone());Ok(v)
 }}
 }
}
fn truth(v:&Value)->bool{match v{Value::Bool(b)=>*b,Value::Null=>false,Value::Array(a)=>!a.is_empty(),Value::String(s)=>!s.is_empty(),Value::Number(n)=>n.as_f64()!=Some(0.),_=>true}}
fn binary(a:Value,o:&str,b:Value)->Result<Value,String>{Ok(match o{
 "=="=>Value::Bool(a==b||a.is_number()&&b.is_number()&&a.as_f64()==b.as_f64()),"!="=>Value::Bool(a!=b),"and"=>Value::Bool(truth(&a)&&truth(&b)),"or"=>Value::Bool(truth(&a)||truth(&b)),
 "contains"=>Value::Bool(match &a{Value::String(s)=>b.as_str().map(|b|s.contains(b)).unwrap_or(false),Value::Array(l)=>l.contains(&b),_=>false}),"in"=>Value::Bool(b.as_array().map(|l|l.contains(&a)).unwrap_or(false)),
 ">"|"<"|">="|"<="=>{let (x,y)=(a.as_f64().ok_or("Comparison requires numbers")?,b.as_f64().ok_or("Comparison requires numbers")?);json!(match o{">"=>x>y,"<"=>x<y,">="=>x>=y,_=>x<=y})},
 "+"|"-"|"*"|"/"=>{let(x,y)=(a.as_f64().ok_or("Arithmetic requires numbers")?,b.as_f64().ok_or("Arithmetic requires numbers")?);if o=="/"&&y==0.{return Err("Division by zero".into())}json!(match o{"+"=>x+y,"-"=>x-y,"*"=>x*y,_=>x/y})},_=>return Err(format!("Unknown operator: {o}"))})}
pub fn run(source:&str,fixtures:Option<HashMap<String,Value>>)->Result<Value,String>{let p=jocky_parser::parse(source)?;Runtime{fixtures,..Default::default()}.execute(&p)}
#[cfg(test)]mod tests{use super::*;#[test]fn filter(){let mut f=HashMap::new();f.insert("processes".into(),json!([{"name":"powershell.exe","parent":{"name":"winword.exe"}},{"name":"safe.exe","parent":{"name":"explorer.exe"}}]));let v=run("hunt x { p = processes() s = p where name == \"powershell.exe\" and parent.name == \"winword.exe\" report s }",Some(f)).unwrap();assert_eq!(v["reports"][0].as_array().unwrap().len(),1)}#[test]fn language(){let v=run("hunt x { fn twice(n) { return n * 2 } for n in [1,2,3] { if n > 1 { report twice(n) } else { report 0 } } }",None).unwrap();assert_eq!(v["reports"],json!([0,4.0,6.0]));assert!(run("hunt x { report shell(\"id\") }",None).is_err())}#[test]fn recursion_bounded(){assert!(run("hunt x { fn f(n) { return f(n) } report f(1) }",None).unwrap_err().contains("depth"))}}
