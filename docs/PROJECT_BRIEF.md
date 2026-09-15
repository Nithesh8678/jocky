You are the lead systems engineer, security architect, compiler engineer, backend engineer, frontend engineer, DevOps engineer, and QA engineer for this project.

Your job is to build a complete, working, production-style prototype called:

# JOCKY

JOCKY is a cross-platform digital-forensics and endpoint-investigation platform with:

- its own forensic scripting language
- a compiler/interpreter/runtime
- lightweight endpoint agents
- a central management backend
- real-time fleet orchestration
- forensic evidence collection
- detection rules
- incident timelines
- attack/process graphs
- AI-assisted investigation
- case management
- evidence integrity
- reporting
- Windows and Linux support
- macOS development support

The system must be genuinely functional end-to-end.

Do not create only mock UI screens.

Every major dashboard feature must be connected to real backend functionality wherever practical.

---

# IMPORTANT SAFETY CONSTRAINT

JOCKY is a defensive forensic and threat-investigation platform.

DO NOT implement functionality that:

- disables antivirus
- disables EDR
- removes security hooks
- abuses vulnerable kernel drivers
- performs BYOVD exploitation
- injects code into unrelated processes
- performs process hollowing
- performs thread hijacking
- performs reflective DLL injection
- hides malicious execution
- creates covert C2 channels
- implements domain fronting
- bypasses endpoint security

If these techniques are represented, implement them only as:

- detectors
- static educational simulations
- test fixtures
- telemetry categories
- threat technique descriptions
- intentionally harmless demonstration modules

The platform must remain a defensive security product.

---

# PRIMARY DEMO ENVIRONMENT

Assume the developer uses:

- Apple Silicon MacBook
- macOS as primary development environment
- two Windows PCs available for JOCKY Agent testing
- optional Ubuntu VM on the Mac
- one free or inexpensive cloud server for backend deployment

Target architecture:

MacBook
    |
    | Browser
    v
JOCKY Dashboard
    |
    v
Cloud Backend
    |
    +------------------+------------------+
    |                  |                  |
Windows Agent 1   Windows Agent 2    Ubuntu Agent
    |                  |                  |
forensic data      forensic data      forensic data

The dashboard must be accessible through a normal browser.

The endpoint agents must connect outbound to the backend so that no inbound port forwarding is required on the Windows PCs.

---

# CORE TECH STACK

Use this stack unless a clearly superior technical reason exists.

## Monorepo

Use:

- Turborepo or clean pnpm workspace
- TypeScript for web/backend where applicable
- Rust workspace for compiler/runtime/agent

Repository layout:

jocky/
  apps/
    dashboard/
    api/
  crates/
    jocky-cli/
    jocky-lexer/
    jocky-parser/
    jocky-ast/
    jocky-runtime/
    jocky-agent/
    jocky-common/
  packages/
    shared-types/
    ui/
  rules/
    jocky/
    sigma/
    yara/
  infrastructure/
    docker/
    deployment/
  docs/
  examples/
  scripts/
  tests/

---

# FRONTEND

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Flow for graphs
- Recharts for charts
- WebSocket client for live events

Design style:

Dark enterprise cybersecurity interface.

Do NOT make it look like a generic SaaS template.

Visual direction:

- charcoal / near-black backgrounds
- cold blue / cyan accents
- warning amber
- critical red
- green for healthy systems
- dense but readable data tables
- monospace typography for forensic values
- polished animations
- fast interactions
- keyboard-friendly workflows

The UI should look like a serious security operations product.

---

# BACKEND

Use either:

Preferred:
- FastAPI

OR if stronger architectural consistency is achieved:
- TypeScript backend with Fastify/NestJS

Backend must support:

- REST API
- WebSocket events
- authentication
- users
- endpoint registration
- agent heartbeat
- job dispatch
- job results
- forensic observations
- alerts
- evidence
- cases
- rules
- reports
- audit events
- AI investigation requests

Use:

- PostgreSQL
- Redis
- object storage using MinIO locally and S3-compatible storage in deployment

---

# DATABASE

Use PostgreSQL.

Create a proper normalized schema.

At minimum include:

users
roles
user_roles

organizations

endpoints

endpoint_sessions

agent_versions

jobs

job_targets

job_results

observations

process_observations

network_observations

file_observations

persistence_observations

driver_observations

system_observations

log_observations

detections

detection_rules

indicators

indicator_matches

cases

case_endpoints

case_evidence

evidence

evidence_access_log

timelines

timeline_events

reports

audit_logs

ai_investigations

jocky_scripts

jocky_script_versions

compiler_builds

Store proper timestamps.

Every finding must retain provenance.

---

# PROVENANCE

Provenance means:

"Where did this piece of evidence come from?"

Every observation should contain:

- endpoint ID
- collection job ID
- collector name
- collection timestamp
- original source
- agent version
- hash where relevant

For example:

Process:
powershell.exe

Endpoint:
WIN-FINANCE-01

Collected:
2026-09-15T10:31:18

Collector:
windows.processes

Job:
JOB-429

This is extremely important.

---

# AUTHENTICATION

Implement:

- email/password
- secure password hashing
- JWT access tokens
- refresh tokens
- RBAC

RBAC means:

Role-Based Access Control.

Roles:

Admin
Investigator
Analyst
Viewer

Permissions:

Admin:
everything

Investigator:
run scans
create cases
manage evidence
manage rules
generate reports

Analyst:
view data
run allowed queries
create notes

Viewer:
read only

---

# JOCKY ENDPOINT AGENT

Build the agent in Rust.

Requirements:

- small
- stable
- background service
- outbound HTTPS/WebSocket communication
- automatic reconnect
- heartbeat
- job queue
- signed/validated job requests
- version reporting
- structured logging
- safe local permissions
- configurable server URL

Windows agent should run as a Windows Service.

Linux agent should run as a systemd service.

macOS support may initially run as a launch agent or normal daemon.

---

# AGENT REGISTRATION

Flow:

1. Administrator creates enrollment token.
2. Agent starts.
3. Agent sends enrollment token.
4. Backend creates endpoint identity.
5. Backend returns endpoint credential.
6. Agent stores credential safely.
7. Future communication uses authenticated identity.

Dashboard should display:

Endpoint name
OS
Architecture
Agent version
IP
Current user
Last seen
Status
Risk score

---

# HEARTBEAT

Agents should periodically send:

- online state
- hostname
- OS
- architecture
- uptime
- agent version
- current logged-in user
- basic system load

Dashboard must update status live.

Statuses:

Online
Offline
Busy
Degraded

---

# JOB SYSTEM

Backend should create jobs such as:

Quick Scan
Deep Scan
Process Scan
Network Scan
File Scan
Persistence Scan
Driver Audit
System Information
IOC Scan
JOCKY Script Run

A job can target:

- one endpoint
- selected endpoints
- endpoint group
- all endpoints

State:

queued
dispatched
running
completed
failed
cancelled

Dashboard must update status live.

---

# SAFE FORENSIC COLLECTORS

Implement real collectors.

## System Collector

Collect:

hostname
OS
OS version
architecture
uptime
CPU info
memory
disk information
logged-in user
local users where permitted
network interfaces

---

# PROCESS COLLECTOR

Collect:

PID

PID = Process ID.

Also collect:

process name
executable path
parent PID
parent process
user
start time if available
command line where permitted
binary hash when practical
digital signature state where supported

Display process tree.

Example:

explorer.exe
  chrome.exe

winword.exe
  powershell.exe
    unknown.exe

---

# NETWORK COLLECTOR

Collect active connections:

protocol
local address
local port
remote address
remote port
state
associated PID
associated process where available

Do NOT capture user payload content.

Show:

Process
Remote Host
Remote Port
Protocol
State
Risk

---

# FILE COLLECTOR

Implement controlled file investigation.

Functions:

metadata(path)
hash(path)
recent_files(directory, duration)
find_by_name()
find_by_hash()
file_signature_info()

Do NOT recursively scan the entire disk by default.

Support configurable safe paths.

Windows defaults may include:

Downloads
Desktop
Temp
AppData paths

Linux defaults:

/tmp
/home user selected paths

---

# HASHING

Use SHA-256.

SHA-256 is a cryptographic fingerprint.

For every collected evidence artifact compute:

SHA-256
size
timestamp

Use these for integrity verification.

---

# WINDOWS FORENSICS

Implement Windows-specific collectors where practical.

Include:

running processes
services
scheduled tasks
startup locations
registry autorun entries
installed software
network connections
loaded drivers
event logs
logged-in users

Avoid dangerous kernel-level actions.

Read-only collection only.

---

# LINUX FORENSICS

Implement:

processes
systemd services
cron jobs
network connections
users
startup mechanisms
loaded kernel modules
auth logs
system logs
recent executable files

---

# PERSISTENCE SCANNER

Persistence means:

something configured to start automatically.

Detect common persistence locations.

Windows:

startup folders
Run registry keys
scheduled tasks
services

Linux:

systemd services
cron
shell startup files where appropriate

Report:

mechanism
target
path
user
timestamp
risk reason

---

# DRIVER AUDIT

Windows:

enumerate loaded drivers

Collect:

driver name
path
vendor/signature if available
version
hash

Do NOT exploit drivers.

Create architecture for a vulnerable-driver database.

For prototype use a small local dataset.

Feature:

"Known vulnerable driver detected"

This is a defensive BYOVD-risk detector.

BYOVD means:

Bring Your Own Vulnerable Driver.

JOCKY must detect this risk, not perform exploitation.

---

# EVENT LOG COLLECTION

Windows:

support selected Windows Event Logs.

Linux:

support journald/syslog where available.

Collect bounded windows rather than every log in existence.

Normalize important events into a common structure:

timestamp
source
event_type
user
process
message
endpoint

---

# COMMON EVENT MODEL

Create an OS-independent event format.

Example:

{
  event_type: "process_start",
  timestamp: "...",
  endpoint: "...",
  process: {...},
  parent_process: {...}
}

Other event types:

process_start
process_stop
network_connection
file_created
file_modified
login
service_created
persistence_created
driver_loaded
rule_match

This lets JOCKY correlate Windows and Linux evidence.

---

# JOCKY PROGRAMMING LANGUAGE

Create a real custom domain-specific language.

File extension:

.jky

The language should be easy for security investigators.

Example:

hunt suspicious_document_chain {

    processes = processes()

    suspect = processes
        where name == "powershell.exe"
        and parent.name == "winword.exe"

    report suspect
}

Another example:

hunt unsigned_network_process {

    processes = processes()

    suspect = processes
        where signed == false
        and network_connections > 0

    report suspect
}

Another:

hunt indicator_search {

    find file where sha256 == "..."

    find network where remote_ip == "..."

    report matches
}

---

# LANGUAGE FEATURES

Support at minimum:

variables

strings

numbers

booleans

lists

if

else

for

functions

comparisons

logical operators

built-in forensic functions

report

alert

Native forensic data types:

Process
File
Hash
IPAddress
Connection
Event
Driver
User
Evidence
Finding
TimelineEvent

This should differentiate JOCKY from generic scripting languages.

---

# COMPILER PIPELINE

Implement:

source
  ->
lexer
  ->
tokens
  ->
parser
  ->
AST
  ->
semantic validation
  ->
execution plan
  ->
JOCKY runtime

AST means:

Abstract Syntax Tree.

Provide CLI commands:

jocky check script.jky

jocky run script.jky

jocky fmt script.jky

jocky ast script.jky

jocky tokens script.jky

---

# JOCKY PLAYGROUND

Create a dashboard page:

JOCKY Playground

Features:

code editor
syntax highlighting
run button
validation
AST viewer
result viewer
example scripts

Use Monaco Editor.

Include autocomplete for forensic built-ins.

---

# JOCKY RUNTIME

The runtime should map high-level commands into OS-specific collectors.

Example:

processes()

Windows:
Windows implementation

Linux:
Linux implementation

macOS:
macOS implementation

This allows the same JOCKY script to operate across platforms.

---

# OPTIONAL ADVANCED COMPILER MODE

After interpreter/runtime works, create an experimental compiler layer.

Use LLVM only if feasible without destabilizing the project.

Expose:

JOCKY AST
JOCKY intermediate representation
LLVM-style output or real LLVM IR

The project MUST NOT fail merely because LLVM compilation is unfinished.

Interpreter/runtime must always remain the reliable execution path.

---

# COMPILER RESEARCH LAB

Build a safe compiler research page.

Demonstrate harmless semantic-preserving transformations such as:

variable renaming
function ordering
metadata variation
equivalent code generation

Show:

Build A hash
Build B hash

Behavior equivalence:
PASS

Do NOT create transformations whose purpose is antivirus bypass.

Frame this as compiler diversification research.

---

# IOC SYSTEM

IOC = Indicator of Compromise.

Indicators include:

IP
domain
file hash
filename
path

Create IOC manager.

Allow analyst to add:

type
value
description
severity
source
tags

Then scan endpoint observations for matches.

Example:

IP:
185.x.x.x

JOCKY discovers:

WIN-PC-01 connected to it.

Create alert.

---

# DETECTION ENGINE

Create rule system.

Support native JOCKY rules.

Example:

rule suspicious_word_powershell {

    when:
        process.name == "powershell.exe"
        and process.parent.name == "winword.exe"

    severity:
        high

    message:
        "Microsoft Word launched PowerShell"
}

Run rules against collected observations.

---

# SIGMA SUPPORT

Sigma is a common open detection-rule format for logs.

Implement:

Sigma rule upload
basic validation
metadata display
rule storage

Where practical, support conversion into JOCKY's normalized event model.

Do not attempt perfect compatibility initially.

---

# YARA SUPPORT

YARA is commonly used for pattern-based file analysis.

If YARA is installed locally:

allow safe file scanning of explicit paths/evidence files.

Otherwise:

provide graceful feature-disabled state.

Never scan the entire disk automatically.

---

# DETECTION UI

Create:

Detections page

Columns:

severity
time
endpoint
rule
description
status

Severity:

Informational
Low
Medium
High
Critical

Detection states:

New
Investigating
Resolved
False Positive

---

# RISK SCORE

Each endpoint gets score:

0-100

Example:

known malicious IOC +40
suspicious persistence +25
unsigned unusual executable +10
suspicious process chain +20
vulnerable driver +25

Clamp to 100.

Every score must be explainable.

UI:

Risk 82 / 100

Reasons:

+25 suspicious scheduled task
+20 Word -> PowerShell chain
+40 known IOC connection

Never show an unexplained AI-generated number.

---

# TIMELINE ENGINE

Create incident timeline from normalized observations.

Example:

10:30
User opened document

10:31
WINWORD.EXE started PowerShell

10:31
PowerShell created executable

10:32
Executable started

10:32
Outbound connection detected

10:33
Startup persistence created

Timeline page must support:

filtering
zooming
event categories
severity
endpoint selection

---

# ATTACK / RELATIONSHIP GRAPH

Use React Flow.

Represent relationships:

User
 ->
Process
 ->
Child Process
 ->
File
 ->
Network connection

Example:

WINWORD.EXE
   |
   v
powershell.exe
   |
   +--> suspicious.exe
             |
             +--> 185.x.x.x
             |
             +--> startup persistence

Clicking nodes should open details.

---

# CASE MANAGEMENT

Create Cases page.

A case has:

case ID
title
description
severity
status
assigned investigator
created time
affected endpoints
evidence
detections
timeline
notes
reports

Status:

Open
Investigating
Contained
Resolved
Closed

Allow detections/endpoints/evidence to be attached to case.

---

# EVIDENCE VAULT

Evidence page.

Evidence types:

file metadata
file copy where explicitly collected
JSON collection result
event log export
process snapshot
network snapshot
report

For each:

Evidence ID
Endpoint
Collector
Timestamp
Size
SHA-256
Case
Integrity status

Integrity check:

recompute hash
compare to stored hash

Display:

Verified
Modified
Missing

---

# CHAIN OF CUSTODY

Maintain an immutable-style audit trail.

For every evidence object record:

created
uploaded
viewed
downloaded
attached to case
integrity checked

Display chronological activity.

---

# AUDIT LOGGING

Record security-sensitive dashboard actions.

Examples:

user login
scan started
script executed
case created
evidence viewed
rule changed
endpoint enrolled
endpoint removed

Store:

user
action
resource
timestamp
IP if available
metadata

---

# AI INVESTIGATOR

Create AI investigation assistant.

Architecture:

actual evidence
 ->
structured context builder
 ->
LLM
 ->
answer

Never let AI fabricate endpoint facts.

When answering questions, include references to evidence IDs.

Example user:

"What happened on WIN-PC-01?"

Answer:

"At 10:31 WINWORD.EXE started PowerShell. PowerShell then created an unsigned executable. The executable opened an external network connection and later created persistence."

Evidence references:

EVID-101
EVID-117
DET-48

---

# AI PROVIDER ARCHITECTURE

Create pluggable provider system.

Support at minimum:

OpenAI-compatible API
Ollama/local model

Environment variables determine active provider.

If no provider is configured:

AI features should show disabled state.

The rest of JOCKY must still work.

---

# NATURAL LANGUAGE TO JOCKY

Add:

"Generate Investigation"

User enters:

"Find computers where Word launched PowerShell."

AI proposes:

hunt word_powershell {
    ...
}

IMPORTANT:

Do not automatically execute AI-generated scripts.

Workflow:

AI generates script
 ->
syntax validation
 ->
show user
 ->
user clicks Run

Add warnings and permissions.

---

# COMMAND CENTER DASHBOARD

Main dashboard should show:

Total endpoints
Online endpoints
Offline endpoints
High-risk endpoints
Critical alerts
Open cases
Recent scans
Risk distribution
OS distribution
Recent detections

Add live updates.

---

# ENDPOINTS PAGE

Table:

Hostname
OS
User
IP
Status
Risk
Agent version
Last seen

Filtering:

OS
status
risk
tags

Search:

hostname
user
IP

---

# ENDPOINT DETAIL PAGE

Tabs:

Overview

Processes

Network

Files

Persistence

Drivers

Events

Detections

Timeline

Evidence

Jobs

Scripts

Show live agent status.

Provide:

Run Scan
Run JOCKY Script
Add to Case

---

# LIVE INVESTIGATION PAGE

Build a live forensic investigation workflow.

Analyst chooses collector:

System Snapshot
Processes
Network
Persistence
Drivers
Recent Files
Event Logs

Result streams back.

Provide structured tables.

Do NOT implement unrestricted arbitrary remote shell commands.

---

# REPORTING

Generate PDF/HTML incident report.

Sections:

Executive Summary
Affected Endpoints
Incident Overview
Risk
Timeline
Detections
Indicators
Process Activity
Network Activity
Persistence
Evidence
Chain of Custody
Analyst Notes
Recommendations

Use generated case data.

---

# AGENT UPDATE ARCHITECTURE

For prototype:

display installed agent version.

Implement backend structure for latest version.

Do NOT silently self-update binaries initially.

Provide safe manual update instructions.

---

# REALTIME

Use WebSockets for:

agent online/offline

job state

scan progress

new detection

endpoint update

dashboard metrics

---

# SECURITY

Backend:

validate input

parameterized queries

secure auth

rate limiting

CORS configuration

request size limits

secure headers

audit logging

Agent:

TLS communication

authenticated endpoint identity

signed job metadata where practical

strict job whitelist

Do not allow arbitrary system command execution from dashboard.

---

# DOCKER

Create docker-compose for local development.

Services:

postgres
redis
minio
api
dashboard

Agent is not containerized for Windows.

One command should start platform:

docker compose up

---

# SEED DATA

Create demo seed script.

Seed:

admin account

sample endpoints

sample detections

sample case

sample timeline

But distinguish seeded/demo entries clearly.

Once real agents connect, real data must work independently.

---

# WINDOWS INSTALLER

Create straightforward installation instructions.

Ideally provide PowerShell installer script or packaged binary.

Workflow:

download jocky-agent.exe

configure:

JOCKY_SERVER_URL
ENROLLMENT_TOKEN

install as service

start service

Provide uninstall.

Do not modify antivirus exclusions.

Do not disable security products.

---

# LINUX INSTALLER

Provide:

binary
config
systemd unit

Commands:

install
start
stop
status
uninstall

---

# DEMO MODE

Create a specific demo workflow.

The expected demo:

1. Dashboard opened on Mac.
2. Two Windows endpoints appear online.
3. Ubuntu endpoint optionally appears online.
4. Run Quick Scan on Windows endpoint.
5. See processes and network activity appear.
6. Run JOCKY script.
7. Generate detection.
8. Create case.
9. View timeline.
10. View attack graph.
11. Ask AI to explain findings.
12. Generate report.
13. Run fleet-wide IOC hunt.
14. Show results from multiple endpoints.

Create documentation for this exact demo.

---

# SAFE ATTACK SIMULATION

Create a harmless demo simulator.

Purpose:

generate known safe activity that JOCKY can detect.

It may:

create harmless temporary files

launch benign child processes

open a connection to a local test server

create and remove a clearly marked demo startup entry only with explicit user action

generate synthetic logs

The simulator must clearly identify itself as JOCKY DEMO.

Do not perform stealth, injection, privilege escalation, AV bypass, credential theft, exploitation, or persistence without explicit cleanup.

Provide automatic cleanup.

This allows demonstrations without malware.

---

# DOCUMENTATION

Create:

README.md

docs/architecture.md

docs/setup-macos.md

docs/setup-windows-agent.md

docs/setup-linux-agent.md

docs/jocky-language.md

docs/security-model.md

docs/demo.md

docs/api.md

docs/database.md

docs/terminology.md

---

# TERMINOLOGY DOCUMENT

Because the project owner is new to cybersecurity, create:

docs/terminology.md

Explain every acronym in simple language.

Examples:

PID
Process ID

IOC
Indicator of Compromise

EDR
Endpoint Detection and Response

AST
Abstract Syntax Tree

LLVM
compiler infrastructure

YARA
pattern-based malware/file detection system

Sigma
security-log detection rule format

RBAC
Role-Based Access Control

JWT
JSON Web Token

SHA-256
cryptographic file fingerprint

VM
Virtual Machine

API
Application Programming Interface

Add terms as they appear in the project.

---

# TESTING

Implement:

unit tests

parser tests

language tests

collector tests

API tests

database tests

integration tests

agent/server communication tests

frontend smoke tests

Test JOCKY script examples.

No core module should be considered done until tests pass.

---

# ERROR HANDLING

Every component must fail gracefully.

Examples:

Agent loses internet:
queue retry.

Endpoint offline:
job stays queued or expires.

Collector lacks permission:
return permission error.

YARA unavailable:
feature disabled with explanation.

AI unavailable:
normal platform still works.

---

# OBSERVABILITY

Add structured logs.

Backend logs.

Agent logs.

Job logs.

Expose health endpoint:

/health

Dashboard should display service status.

---

# PERFORMANCE

Do not make every agent constantly send huge amounts of telemetry.

Use:

heartbeats

on-demand forensic collection

small scheduled collection where required

pagination

batch inserts

bounded event windows

efficient indexing

The product should remain lightweight.

---

# CLOUD DEPLOYMENT

Make deployment provider-agnostic.

Provide instructions for a simple VPS.

Use Docker Compose initially.

Deployment architecture:

reverse proxy
dashboard
API
PostgreSQL
Redis
MinIO/S3

Support HTTPS.

Use environment variables.

Never commit secrets.

---

# ENVIRONMENT VARIABLES

Provide:

.env.example

Include:

DATABASE_URL

REDIS_URL

S3_ENDPOINT

S3_ACCESS_KEY

S3_SECRET_KEY

JWT_SECRET

JOCKY_PUBLIC_URL

AGENT_ENROLLMENT_SECRET

AI_PROVIDER

OPENAI_API_KEY if applicable

OLLAMA_BASE_URL

---

# UI QUALITY

Every screen must have:

loading states

empty states

error states

tooltips

filters

search where applicable

responsive layout

sensible keyboard navigation

No placeholder lorem ipsum.

No fake buttons.

No dead navigation.

---

# MAIN NAVIGATION

Command Center

Endpoints

Investigations

Detections

Cases

Timeline

Indicators

Evidence

Rules

JOCKY Playground

Compiler Lab

AI Investigator

Reports

Audit Logs

Settings

---

# DEVELOPMENT ORDER

Build in this exact dependency-aware order.

PHASE 1

repository
Docker
database
backend skeleton
dashboard skeleton

Verify everything boots.

PHASE 2

authentication
RBAC
database migrations
basic dashboard

Verify login works.

PHASE 3

Rust agent
agent enrollment
heartbeat
endpoint page

Verify a real Windows endpoint appears.

PHASE 4

job system
WebSockets
system collector
process collector
network collector

Verify Mac dashboard can trigger collection on Windows.

PHASE 5

Windows forensic collectors
Linux collectors

Verify real data.

PHASE 6

JOCKY language:

lexer
parser
AST
runtime
CLI

Verify scripts execute.

PHASE 7

remote JOCKY script execution using strict safe built-ins

Verify script runs through agent.

PHASE 8

detections
risk scoring
IOC engine

PHASE 9

timeline
process tree
relationship graph

PHASE 10

cases
evidence vault
SHA-256 integrity
chain of custody

PHASE 11

Sigma
YARA optional integration

PHASE 12

AI Investigator
natural-language-to-JOCKY

PHASE 13

Compiler Lab

PHASE 14

reports
audit logs
settings
UX polish

PHASE 15

deployment
installers
demo simulator
testing
documentation

---

# CRITICAL AI CODING INSTRUCTIONS

Do NOT stop after scaffolding.

Do NOT leave TODO placeholders for core functionality.

Do NOT fake agent data when real OS data can be retrieved safely.

Do NOT make nonfunctional UI buttons.

Do NOT silently skip failures.

If something cannot be implemented in the current environment:

1. explain exactly why
2. implement everything around it
3. provide exact manual steps
4. continue with the rest of the project

When an external service login, token, VM step, Windows permission, cloud setup, or manual action is required:

STOP only at the specific dependency.

Tell the developer exactly:

WHAT they need to do

WHERE they need to do it

WHAT value they need to copy back

Then continue once available.

Never ask broad questions when a sensible default exists.

Choose the best default.

---

# SELF-VALIDATION LOOP

After every major phase:

1. build
2. run tests
3. inspect errors
4. fix errors
5. restart services
6. test feature manually
7. verify frontend/backend integration
8. commit cleanly if Git is available

Never assume code works because it compiled once.

---

# FINAL ACCEPTANCE TEST

The project is complete only when this works:

A Windows PC installs JOCKY Agent.

The Windows PC appears online in the browser dashboard running on the Mac.

The dashboard displays:

hostname
OS
user
agent version
last seen

From the Mac:

click endpoint

click Quick Scan

The backend sends job.

Windows Agent receives it.

Windows Agent collects:

system info
running processes
network connections

Results appear in dashboard.

Then:

run a `.jky` script

JOCKY parses it.

Agent executes the safe forensic query.

Results return.

A detection triggers.

Risk score changes.

Timeline shows event.

Detection is added to a case.

Evidence shows SHA-256 integrity.

AI explains the evidence if an AI provider is configured.

The analyst generates a report.

Then the same IOC hunt is launched against both Windows PCs.

Both results appear in the central dashboard.

ONLY after this end-to-end workflow functions should the build be considered complete.

---

# FINAL OUTPUT EXPECTED

At the end provide:

1. working monorepo

2. one-command local startup

3. working backend

4. working dashboard

5. working Windows agent

6. working Linux agent

7. working JOCKY language

8. working CLI

9. endpoint enrollment

10. fleet jobs

11. forensic collectors

12. detection engine

13. IOC hunting

14. risk scoring

15. timeline

16. relationship graph

17. case management

18. evidence vault

19. integrity verification

20. AI Investigator

21. report generation

22. Docker environment

23. Windows installation guide

24. Linux installation guide

25. cloud deployment guide

26. terminology guide

27. architecture documentation

28. demo walkthrough

29. automated tests

30. sample `.jky` scripts

The result must look and behave like a polished advanced cybersecurity product, not a hackathon mockup.

Start immediately.

First inspect the current repository and environment.

If the repository is empty, create the architecture above.

Proceed phase by phase without waiting for permission between normal development steps.

Use sensible defaults.

Continuously run and test what you build.

The objective is a real, demonstrable end-to-end JOCKY system.