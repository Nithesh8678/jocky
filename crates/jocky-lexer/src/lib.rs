use jocky_ast::Token;
pub fn lex(src:&str)->Result<Vec<Token>,String>{
 if src.len()>65536{return Err("Script exceeds 64 KiB".into())}
 let c:Vec<char>=src.chars().collect();let(mut i,mut line,mut col)=(0,1,1);let mut out=vec![];
 while i<c.len(){let ch=c[i];if ch.is_whitespace(){if ch=='\n'{line+=1;col=1}else{col+=1}i+=1;continue}
 if ch=='#'||(ch=='/'&&c.get(i+1)==Some(&'/')){while i<c.len()&&c[i]!='\n'{i+=1;col+=1}continue}
 let start=i;let sc=col;let kind;
 if ch=='"'{i+=1;let mut escaped=false;while i<c.len(){let cc=c[i];if cc=='\n'{return Err(format!("{line}:{sc}: newline in string"))}i+=1;if cc=='"'&&!escaped{break}if cc=='\\'&&!escaped{escaped=true}else{escaped=false}}
 if c.get(i-1)!=Some(&'"')||i==start+1{return Err(format!("{line}:{sc}: unterminated string"))}kind="string";
 }else if ch.is_ascii_digit(){i+=1;while i<c.len()&&(c[i].is_ascii_digit()||c[i]=='.'){i+=1}kind="number";
 }else if ch.is_ascii_alphabetic()||ch=='_'{i+=1;while i<c.len()&&(c[i].is_ascii_alphanumeric()||c[i]=='_'){i+=1}kind="ident";
 }else if "{}()[].,;:+-*/=!<>".contains(ch){i+=1;if "=!<>".contains(ch)&&c.get(i)==Some(&'='){i+=1}kind="symbol";
 }else{return Err(format!("{line}:{col}: unexpected character {ch}"))}
 let text:String=c[start..i].iter().collect();col+=i-start;out.push(Token{kind:kind.into(),text,line,column:sc});
 }out.push(Token{kind:"eof".into(),text:"<eof>".into(),line,column:col});Ok(out)
}
#[cfg(test)]mod tests{use super::*;#[test]fn locations(){let t=lex("# hi\nhunt x { report \"ok\" }").unwrap();assert_eq!(t[0].line,2);assert!(lex("@").is_err());assert!(lex("\"abc").is_err());}}
