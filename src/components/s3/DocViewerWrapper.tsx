"use client";
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";

export default function DocViewerWrapper({ documents }: { documents: any[] }) {
  return (
    <DocViewer
      documents={documents}
      pluginRenderers={DocViewerRenderers}
      style={{ height: "100%" }}
    />
  );
}