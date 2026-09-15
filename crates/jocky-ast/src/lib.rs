use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Program {
    pub name: String,
    pub body: Vec<Stmt>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "value")]
pub enum Expr {
    Literal(serde_json::Value),
    Name(String),
    List(Vec<Expr>),
    Field(Box<Expr>, String),
    Call(String, Vec<Expr>),
    Binary(Box<Expr>, String, Box<Expr>),
    Unary(String, Box<Expr>),
    Where(Box<Expr>, Box<Expr>),
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "value")]
pub enum Stmt {
    Let(String, Expr),
    Report(Expr),
    Alert(Expr),
    If(Expr, Vec<Stmt>, Vec<Stmt>),
    For(String, Expr, Vec<Stmt>),
    Function(String, Vec<String>, Vec<Stmt>),
    Return(Expr),
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Token {
    pub kind: String,
    pub text: String,
    pub line: usize,
    pub column: usize,
}
