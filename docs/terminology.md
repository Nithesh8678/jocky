# Terminology, in plain language

| Term | Meaning in JOCKY |
|---|---|
| Endpoint | A computer you investigate, such as a Windows PC |
| Agent | Small program on that computer that reads allowed information |
| Backend | Server that accepts requests and saves the results |
| Fleet | All enrolled computers |
| Telemetry | Measurements or observations sent by agents |
| Forensics | Collecting and interpreting digital evidence |
| Provenance | Where a record came from: computer, job, tool, time, original source |
| PID | Process ID: number identifying a running program; it can be reused later |
| Parent process | Program that started another process |
| IOC | Indicator of Compromise: a value worth matching, such as an IP or hash; a match still needs interpretation |
| EDR | Endpoint Detection and Response: software that monitors computers for threats |
| BYOVD | Bring Your Own Vulnerable Driver: abuse of a flawed driver; JOCKY only audits risk indicators |
| Persistence | A mechanism configured to start a program automatically |
| Driver | Low-level software connecting the operating system to hardware or system functions |
| SHA-256 | A cryptographic fingerprint of bytes; changing bytes changes the fingerprint |
| Evidence integrity | Whether the stored artifact still matches its original fingerprint |
| Chain of custody | Record of who created, viewed, transferred, or checked evidence |
| AST | Abstract Syntax Tree: structured representation of a program |
| Lexer | Splits script text into tokens, such as names and operators |
| Parser | Organizes tokens into a valid syntax tree |
| Runtime/interpreter | Executes the allowed operations in that tree |
| DSL | Domain-specific language: a language built for a narrow task |
| LLVM | Compiler infrastructure; JOCKY does not implement LLVM compilation in this version |
| YARA | A rule language/tool for finding byte/text patterns in files |
| Sigma | A portable format for log detection rules; only a small subset executes here |
| RBAC | Role-Based Access Control: roles determine permitted actions |
| JWT | JSON Web Token: signed short-lived login credential |
| Argon2 | A deliberately expensive password-hashing algorithm |
| HMAC | A secret-key integrity signature used to authenticate job metadata |
| TLS / HTTPS | Encryption and server authentication for network communication |
| WebSocket | A live connection for server events without repeated page refreshes |
| Heartbeat | Small periodic message showing the agent is still connected |
| Lease | Time-limited claim on a job, so failed deliveries can be retried |
| Idempotent | Repeating a request does not create duplicate results |
| API | Application Programming Interface: structured endpoints used by software |
| VM | Virtual Machine: a virtual computer running on a physical server |
| VPS | Virtual Private Server: rented VM used to host the backend |
| OCI | Oracle Cloud Infrastructure |
| OCPU | Oracle CPU allocation; the precise capacity depends on the compute shape |
| ARM / x86_64 | Different CPU architectures; compile binaries for the target machine |
| S3-compatible storage | Object storage API for storing evidence bytes by object key |
| MinIO | An S3-compatible object-storage server used in local JOCKY deployment |
| Redis | Fast key/value service used for rate limits and live events |
| PostgreSQL | Database for users, jobs, observations and relationships |
| Docker Compose | Starts the platform's containers from one configuration |
| CI | Continuous Integration: automated checks on pushed source code |
| ACL | Access Control List: who may read/write a file or directory |
| systemd / Windows Service | Operating-system mechanisms that manage background programs |
| Risk score | Sum of explainable active rule/IOC points, capped at 100; not an AI judgment |
