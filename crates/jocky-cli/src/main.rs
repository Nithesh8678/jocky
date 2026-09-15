use serde_json::{json, Value};
use std::{collections::HashMap, io::Read};
fn main() {
    if let Err(e) = go() {
        eprintln!("{}", json!({"error":e}));
        std::process::exit(1)
    }
}
fn go() -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    let mode = args.get(1).map(String::as_str).unwrap_or("help");
    if mode == "help" {
        println!("jocky <check|run|fmt|ast|tokens|lab> <file.jky|-> [--fixtures file.json]");
        return Ok(());
    }
    let file = args.get(2).ok_or("Missing script path")?;
    let src = if file == "-" {
        let mut s = String::new();
        std::io::stdin()
            .take(65537)
            .read_to_string(&mut s)
            .map_err(|e| e.to_string())?;
        s
    } else {
        std::fs::read_to_string(file).map_err(|e| e.to_string())?
    };
    let p = jocky_parser::parse(&src)?;
    let fixtures: Option<HashMap<String, Value>> =
        if let Some(i) = args.iter().position(|s| s == "--fixtures") {
            Some(
                serde_json::from_str(
                    &std::fs::read_to_string(args.get(i + 1).ok_or("Missing fixture file")?)
                        .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?,
            )
        } else {
            None
        };
    let value = match mode {
        "tokens" => json!(jocky_lexer::lex(&src)?),
        "ast" => json!(p),
        "check" => {
            jocky_parser::validate(&p)?;
            json!({"valid":true,"name":p.name,"builtins":jocky_parser::BUILTINS,"plan":"bounded read-only interpreter"})
        }
        "run" => jocky_runtime::run(&src, fixtures)?,
        "fmt" => {
            let t = jocky_lexer::lex(&src)?;
            let mut out = String::new();
            let mut indent: usize = 0;
            for x in t {
                if x.kind == "eof" {
                    break;
                }
                match x.text.as_str() {
                    "{" => {
                        indent += 1;
                        out.push_str("{\n");
                        out.push_str(&"    ".repeat(indent));
                    }
                    "}" => {
                        indent = indent.saturating_sub(1);
                        out.push('\n');
                        out.push_str(&"    ".repeat(indent));
                        out.push_str("}\n");
                        out.push_str(&"    ".repeat(indent));
                    }
                    ";" => {
                        out.push_str(";\n");
                        out.push_str(&"    ".repeat(indent));
                    }
                    _ => {
                        out.push_str(&x.text);
                        out.push(' ');
                    }
                }
            }
            jocky_parser::parse(&out)?;
            print!("{}", out.trim_end());
            return Ok(());
        }
        "lab" => {
            jocky_parser::validate(&p)?;
            let pretty = serde_json::to_string_pretty(&p).unwrap();
            let compact = serde_json::to_string(&p).unwrap();
            json!({"pretty":pretty,"compact":compact})
        }
        _ => return Err("Unknown command".into()),
    };
    println!("{}", serde_json::to_string_pretty(&value).unwrap());
    Ok(())
}
