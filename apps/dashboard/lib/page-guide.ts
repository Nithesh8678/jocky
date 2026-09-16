/** Page names are presentation only; API resources keep their original names. */
export const pageGuide: Record<
  string,
  {
    label: string;
    group: string;
    purpose: string;
    steps: string[];
    note: string;
  }
> = {
  "Command Center": {
    label: "Overview",
    group: "Workspace",
    purpose:
      "Start here. See which computers are connected and what needs your attention.",
    steps: [
      "Check whether your computer is online.",
      "Collect a fresh snapshot of its activity.",
      "Review findings and build a case.",
    ],
    note: "An online computer is connected; it is not necessarily safe. Counts describe stored records.",
  },
  Endpoints: {
    label: "Computers",
    group: "Workspace",
    purpose:
      "Connect your computers and explore the information their agents have collected.",
    steps: [
      "Enroll a computer using a one-time token.",
      "Select its row to open its collected data.",
      "Run a quick scan, then explore the data tabs.",
    ],
    note: "Changing a data tab reads stored results. It does not run a new collection. Keep the foreground agent window open.",
  },
  Investigations: {
    label: "Collections",
    group: "Workspace",
    purpose:
      "Ask an agent to collect information, then follow the job until it finishes.",
    steps: [
      "Choose one computer or all enrolled computers.",
      "Choose a collection type; start with Quick.",
      "Run the collection and inspect each target’s result.",
    ],
    note: "Queued means waiting for an agent. A completed job can still contain collector errors; inspect the result.",
  },
  Detections: {
    label: "Findings",
    group: "Investigate",
    purpose:
      "Review activity that matched a detection rule or generated a script alert.",
    steps: [
      "Open a finding and read its supporting observations.",
      "Mark it investigating while you check the context.",
      "Attach useful findings to a case and record your conclusion.",
    ],
    note: "A finding is a lead, not proof of malware. Severity and risk help prioritise a review.",
  },
  Cases: {
    label: "Cases",
    group: "Investigate",
    purpose:
      "Keep the relevant computers, findings, evidence and your notes together.",
    steps: [
      "Create a case with a clear question and title.",
      "Open it and attach relevant records.",
      "Add notes, update its status and generate a report.",
    ],
    note: "Case status is a tracking label. Choosing “contained” does not isolate a computer or stop a process.",
  },
  Timeline: {
    label: "Timeline",
    group: "Investigate",
    purpose:
      "Read collected observations in time order to understand what was seen.",
    steps: [
      "Choose a computer, or leave it unselected for all.",
      "Filter by the kind of data you want to review.",
      "Open an entry to inspect its source and collection time.",
    ],
    note: "This view shows up to 500 observations. Collection time is not necessarily the time an activity began.",
  },
  Indicators: {
    label: "Indicators",
    group: "Investigate",
    purpose:
      "Keep known values to look for, such as an IP address, filename or file hash.",
    steps: [
      "Add a value and describe why you are looking for it.",
      "Hunt stored observations to look for matches.",
      "Inspect the results and review any resulting findings.",
    ],
    note: "This hunt checks stored observations across the workspace in batches. It does not refresh a computer. Use Collections for fresh data. A matching filename alone is weak evidence.",
  },
  Evidence: {
    label: "Evidence",
    group: "Evidence & reports",
    purpose:
      "Verify and download the saved collection results that support an investigation.",
    steps: [
      "Find an evidence record from your collection.",
      "Verify its SHA-256 fingerprint.",
      "Inspect its custody history or download the saved data.",
    ],
    note: "A matching fingerprint shows that the saved bytes match their recorded hash. It does not prove the contents are harmless or correct.",
  },
  Reports: {
    label: "Reports",
    group: "Evidence & reports",
    purpose:
      "Turn a case into a readable report that you can open, print or save as PDF.",
    steps: [
      "Choose a case with attached records and notes.",
      "Generate a report.",
      "Open it and use your browser’s print dialog to save a PDF.",
    ],
    note: "A report is a snapshot. Generate a new one after changing a case. It does not run another scan.",
  },
  Rules: {
    label: "Detection rules",
    group: "Advanced tools",
    purpose: "Define conditions that turn matching observations into findings.",
    steps: [
      "Read an existing rule before creating your own.",
      "Choose a supported format and enter the rule source.",
      "Check its support status before enabling it.",
    ],
    note: "Sigma support is limited. Unsupported rules stay disabled. YARA scanning is available only when the server has YARA installed.",
  },
  "JOCKY Playground": {
    label: "Script studio",
    group: "Advanced tools",
    purpose:
      "Write and check a small JOCKY investigation script, then run it on an agent.",
    steps: [
      "Start with a supplied example.",
      "Validate the script and review what it collects.",
      "Choose a computer, run it and follow the job in Collections.",
    ],
    note: "Validate, AST, Tokens and Format do not execute the script. Only Run on endpoint sends a collection job.",
  },
  "Compiler Lab": {
    label: "Compiler lab",
    group: "Advanced tools",
    purpose:
      "Compare two syntax-tree representations of the script for research.",
    steps: [
      "Write a script or reuse the one from Script studio.",
      "Run the comparison.",
      "Read the equivalence result and its detailed output.",
    ],
    note: "This is an AST comparison experiment. It does not build an executable, optimise machine code or test security bypasses.",
  },
  "AI Investigator": {
    label: "AI assistant",
    group: "Advanced tools",
    purpose:
      "Ask a configured AI provider to help explain stored investigation context.",
    steps: [
      "Check whether your administrator has enabled an AI provider.",
      "Choose the relevant computer and ask a focused question.",
      "Review references and inspect any suggested script before running it.",
    ],
    note: "When disabled, no AI answers are generated. An external provider may receive investigation context. Suggestions require your review.",
  },
  "Audit Logs": {
    label: "Activity log",
    group: "Administration",
    purpose:
      "See recorded actions in the workspace, including who performed them.",
    steps: [
      "Search for an action, actor ID or resource ID.",
      "Read the timestamp and action name.",
      "Inspect the entry for additional details.",
    ],
    note: "The dashboard shows the latest 500 entries. This is workspace activity, not a complete Windows Event Log.",
  },
  Settings: {
    label: "Settings",
    group: "Administration",
    purpose:
      "Check service health, understand enabled capabilities and manage user access.",
    steps: [
      "Check the service status cards.",
      "Read the capability values and collection limits.",
      "Administrators can create users with an appropriate role.",
    ],
    note: "Most settings here are read-only. Server configuration and agent updates are managed outside this page.",
  },
};
export const navigationGroups = [
  "Workspace",
  "Investigate",
  "Evidence & reports",
  "Advanced tools",
  "Administration",
];
