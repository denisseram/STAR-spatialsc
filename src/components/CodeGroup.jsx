import React from "react";
import CodeButton from "./CodeButton.jsx";

export default function CodeGroup({ uniqueCodes, selectedCodes, toggleCode }) {
  return (
    <div className="code-group">
      {uniqueCodes.map((code) => (
        <CodeButton
          key={code}
          code={code}
          active={selectedCodes.includes(code)}
          toggleCode={toggleCode}
        />
      ))}
    </div>
  );
}
