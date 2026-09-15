use jocky_ast::{Expr,Stmt,Program,Token};
struct Parser{t:Vec<Token>,i:usize,depth:usize}
impl Parser{
 fn at(&self,s:&str)->bool{self.t[self.i].text==s}
 fn bump(&mut self)->Token{let t=self.t[self.i].clone();if self.i+1<self.t.len(){self.i+=1}t}
 fn error(&self,s:&str)->String{let t=&self.t[self.i];format!("{}:{}: {s}; found {}",t.line,t.column,t.text)}
 fn eat(&mut self,s:&str)->bool{if self.at(s){self.bump();true}else{false}}
 fn expect(&mut self,s:&str)->Result<(),String>{if self.eat(s){Ok(())}else{Err(self.error(&format!("expected {s}")))}}
 fn ident(&mut self)->Result<String,String>{if self.t[self.i].kind!="ident"{return Err(self.error("expected identifier"))}Ok(self.bump().text)}
 fn block(&mut self)->Result<Vec<Stmt>,String>{self.depth+=1;if self.depth>64{return Err(self.error("nesting limit"))}self.expect("{")?;let mut out=vec![];while !self.at("}"){if self.at("<eof>"){return Err(self.error("unclosed block"))}out.push(self.stmt()?);self.eat(";");}self.expect("}")?;self.depth-=1;Ok(out)}
 fn stmt(&mut self)->Result<Stmt,String>{
 if self.eat("report"){return Ok(Stmt::Report(self.expr(0)?))}
 if self.eat("alert"){return Ok(Stmt::Alert(self.expr(0)?))}
 if self.eat("return"){return Ok(Stmt::Return(self.expr(0)?))}
 if self.eat("if"){let c=self.expr(0)?;let a=self.block()?;let b=if self.eat("else"){self.block()?}else{vec![]};return Ok(Stmt::If(c,a,b))}
 if self.eat("for"){let n=self.ident()?;self.expect("in")?;let e=self.expr(0)?;return Ok(Stmt::For(n,e,self.block()?))}
 if self.eat("fn")||self.eat("function"){let n=self.ident()?;self.expect("(")?;let mut args=vec![];if !self.at(")"){loop{args.push(self.ident()?);if !self.eat(","){break}}}self.expect(")")?;return Ok(Stmt::Function(n,args,self.block()?))}
 self.eat("let");let n=self.ident()?;self.expect("=")?;Ok(Stmt::Let(n,self.expr(0)?))
 }
 fn expr(&mut self,min:u8)->Result<Expr,String>{self.depth+=1;if self.depth>64{return Err(self.error("expression nesting limit"))}
 let t=self.bump();let mut lhs=match t.text.as_str(){
 "("=>{let e=self.expr(0)?;self.expect(")")?;e},
 "["=>{let mut a=vec![];if !self.at("]"){loop{a.push(self.expr(0)?);if !self.eat(","){break}}}self.expect("]")?;Expr::List(a)},
 "not"|"!"|"-"=>Expr::Unary(t.text,self.expr(8)?.into()),
 "true"=>Expr::Literal(true.into()),"false"=>Expr::Literal(false.into()),"null"=>Expr::Literal(serde_json::Value::Null),
 _=>match t.kind.as_str(){"string"=>Expr::Literal(serde_json::from_str(&t.text).map_err(|e|e.to_string())?),"number"=>Expr::Literal(serde_json::from_str(&t.text).map_err(|e|e.to_string())?),"ident"=>Expr::Name(t.text),_=>return Err(self.error("expected expression"))}};
 loop{
 if self.at(".")&&9>=min{self.bump();lhs=Expr::Field(lhs.into(),self.ident()?);continue}
 if self.at("(")&&9>=min{let Expr::Name(n)=lhs else{return Err(self.error("only named calls are allowed"))};self.bump();let mut args=vec![];if !self.at(")"){loop{args.push(self.expr(0)?);if !self.eat(","){break}}}self.expect(")")?;lhs=Expr::Call(n,args);continue}
 let op=self.t[self.i].text.clone();let prec=match op.as_str(){"where"=>1,"or"=>2,"and"=>3,"=="|"!="|">"|"<"|">="|"<="|"contains"|"in"=>4,"+"|"-"=>5,"*"|"/"=>6,_=>0};if prec==0||prec<min{break}self.bump();let rhs=self.expr(prec+1)?;lhs=if op=="where"{Expr::Where(lhs.into(),rhs.into())}else{Expr::Binary(lhs.into(),op,rhs.into())};
 }self.depth-=1;Ok(lhs)
 }
}
pub fn parse(src:&str)->Result<Program,String>{let mut p=Parser{t:jocky_lexer::lex(src)?,i:0,depth:0};p.expect("hunt")?;let name=p.ident()?;let body=p.block()?;p.expect("<eof>")?;Ok(Program{name,body})}
pub const BUILTINS:&[&str]=&["processes","network","system","files","drivers","persistence","events","users","metadata","hash","recent_files","find_by_name","find_by_hash","file_signature_info","len"];
pub fn validate(p:&Program)->Result<(),String>{
 use std::collections::HashSet;
 fn expression(e:&Expr,vars:&HashSet<String>,funcs:&HashSet<String>,row:bool)->Result<(),String>{match e{
 Expr::Call(n,args)=>{if !BUILTINS.contains(&n.as_str())&&!funcs.contains(n){return Err(format!("Unknown or forbidden function: {n}"))}for a in args{expression(a,vars,funcs,row)?}},
 Expr::Name(n)=>{if !row&&!vars.contains(n){return Err(format!("Undefined variable: {n}"))}},
 Expr::Field(e,_)|Expr::Unary(_,e)=>expression(e,vars,funcs,row)?,
 Expr::Binary(a,_,b)=>{expression(a,vars,funcs,row)?;expression(b,vars,funcs,row)?},
 Expr::Where(a,b)=>{expression(a,vars,funcs,row)?;expression(b,vars,funcs,true)?},
 Expr::List(a)=>for x in a{expression(x,vars,funcs,row)?},_=>{}}Ok(())}
 fn block(stmts:&[Stmt],vars:&mut HashSet<String>,funcs:&mut HashSet<String>,in_fn:bool)->Result<(),String>{
 for s in stmts{if let Stmt::Function(n,_,_)=s{if BUILTINS.contains(&n.as_str())||!funcs.insert(n.clone()){return Err(format!("Duplicate/reserved function {n}"))}}}
 for s in stmts{match s{
 Stmt::Let(n,e)=>{expression(e,vars,funcs,false)?;vars.insert(n.clone());},
 Stmt::Report(e)|Stmt::Alert(e)=>expression(e,vars,funcs,false)?,
 Stmt::Return(e)=>{if !in_fn{return Err("return outside function".into())}expression(e,vars,funcs,false)?},
 Stmt::If(c,a,b)=>{expression(c,vars,funcs,false)?;block(a,&mut vars.clone(),&mut funcs.clone(),in_fn)?;block(b,&mut vars.clone(),&mut funcs.clone(),in_fn)?},
 Stmt::For(n,e,b)=>{expression(e,vars,funcs,false)?;let mut v=vars.clone();v.insert(n.clone());block(b,&mut v,&mut funcs.clone(),in_fn)?},
 Stmt::Function(_,args,b)=>{let mut v=vars.clone();v.extend(args.clone());block(b,&mut v,&mut funcs.clone(),true)?}}}Ok(())}
 block(&p.body,&mut HashSet::new(),&mut HashSet::new(),false)
}
#[cfg(test)]mod tests{use super::*;#[test]fn hunt(){let p=parse("hunt x { p = processes() s = p where name == \"powershell.exe\" and parent.name == \"winword.exe\" report s }").unwrap();assert!(validate(&p).is_ok());assert!(parse("hunt x {report").is_err());assert!(validate(&parse("hunt x {report shell(\"id\")}").unwrap()).is_err());assert!(validate(&parse("hunt x {report missing}").unwrap()).is_err());}}
