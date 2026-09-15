"use client";
import { Component, type ReactNode } from "react";
import type * as Monaco from "monaco-editor";
import Editor, { loader } from "@monaco-editor/react";
loader.config({ paths: { vs: "/monaco/vs" } });
function JockyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Editor
      keepCurrentModel
      path="inmemory://jocky/investigation.jky"
      height="390px"
      theme="vs-dark"
      language="jocky"
      value={value}
      onChange={(v) => onChange(v || "")}
      beforeMount={(m: typeof Monaco) => {
        if (!m.languages.getLanguages().some((x) => x.id === "jocky")) {
          m.languages.register({ id: "jocky" });
          m.languages.setMonarchTokensProvider("jocky", {
            tokenizer: {
              root: [
                [
                  /\b(hunt|report|alert|where|and|or|if|else|for|in|fn|return|let|true|false)\b/,
                  "keyword",
                ],
                [
                  /\b(processes|network|system|files|drivers|persistence|events|len|hash|metadata)\b/,
                  "type.identifier",
                ],
                [/"(?:[^"\\]|\\.)*"/, "string"],
                [/\d+/, "number"],
                [/#.*$/, "comment"],
              ],
            },
          });
          m.languages.registerCompletionItemProvider("jocky", {
            provideCompletionItems: (model, position) => {
              const word = model.getWordUntilPosition(position);
              return {
                suggestions: [
                  "processes",
                  "network",
                  "system",
                  "drivers",
                  "persistence",
                  "events",
                  "users",
                ].map((label) => ({
                  label,
                  kind: m.languages.CompletionItemKind.Function,
                  insertText: label + "()",
                  range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                  },
                })),
              };
            },
          });
        }
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 25,
        padding: { top: 20 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}

class EditorBoundary extends Component<
  { children: ReactNode; value: string; onChange: (value: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="padded">
        <p className="info">
          The rich editor could not load. Plain-text editing remains available;
          reload to retry Monaco.
        </p>
        <textarea
          aria-label="JOCKY script source"
          rows={16}
          value={this.props.value}
          onChange={(e) => this.props.onChange(e.target.value)}
        />
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function SafeEditor(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <EditorBoundary {...props}>
      <JockyEditor {...props} />
    </EditorBoundary>
  );
}
