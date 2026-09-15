# JOCKY language 0.1

JOCKY is a domain-specific language: a small language designed for forensic queries. It does not accept shell commands or arbitrary module imports.

```jky
hunt word_powershell {
    p = processes()
    suspect = p where name == "powershell.exe" and parent.name == "winword.exe"
    report suspect
    if len(suspect) > 0 {
        alert "Review this process chain"
    }
}
```

`processes()` reads the process list. `where` keeps matching rows. `report` includes data in the result; `alert` creates a finding when the result reaches the backend. Neither action terminates or changes a process.

## Syntax

- `hunt name { statements }` wraps a program.
- Assignment: `x = expression` or `let x = expression`.
- Values: strings with JSON escapes, numbers, booleans, null, lists.
- Field access: `parent.name`, `p.pid`.
- Comparisons: `== != > >= < <=`, `contains`, `in`.
- Logic: `and`, `or`, `not`; arithmetic `+ - * /`.
- Branches: `if condition { ... } else { ... }`.
- Loops: `for item in list { ... }`.
- Functions: `fn twice(n) { return n * 2 }`.
- `#` and `//` comments, optional semicolons.
- A field absent from a nested object becomes null; unavailable collector fields are not evidence of a negative condition.

## Built-ins

`processes()`, `network()`, `system()`, `drivers()`, `persistence()`, `events()`, `users()` return typed-by-kind JSON records. `len(list)` returns a count.

`metadata(path)`, `hash(path)`, `recent_files(directory, seconds)`, `find_by_name(directory, name)`, `find_by_hash(directory, sha256)` operate only beneath `JOCKY_SAFE_PATHS`. `file_signature_info(path)` reports the explicit unsupported signature state in this version. `files()` without an explicit job path fails visibly; use the controlled file functions.

Directory searches cover immediate child files only, up to 100, and skip symlinks. Hashing is SHA-256, limited to 32 MiB per file. Missing paths or permissions produce errors.

## CLI

```sh
target/debug/jocky check examples/processes.jky
target/debug/jocky tokens examples/processes.jky
target/debug/jocky ast examples/processes.jky
target/debug/jocky fmt examples/processes.jky
target/debug/jocky run examples/processes.jky
target/debug/jocky run examples/word-powershell.jky --fixtures examples/fixtures.json
```

`check`, `tokens`, `ast`, and `fmt` do not execute collectors. `run` executes on the machine hosting the CLI. Dashboard Run executes on the selected agent, not on the API host. Format writes formatted source to stdout without modifying the original file.

Fixture output includes `mode: fixture`. Native forensic types are represented as tagged observation kinds and JSON schemas; a static nominal type system is not implemented. The aspirational `find file where ...` syntax is not supported; use built-ins plus filters.

## Resource limits

64 KiB source, 64 parser nesting levels, 32 calls deep, 100,000 evaluation steps, 64 variables, 1 MiB per runtime value, 4 MiB reports, 1 MiB alerts. Process inventory is capped at 2,500 rows; total collections at 4,000 observations. OS command collectors have 15-second and 2-MiB limits.

Compiler Lab compares pretty/compact serialized ASTs and verifies equal deserialized structure. It does not assert native binary behavior equivalence, implement LLVM, or research security-product evasion.
