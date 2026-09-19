import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "camera-controls"?: boolean | string;
          "auto-rotate"?: boolean | string;
          "rotation-per-second"?: string;
          "camera-orbit"?: string;
          "field-of-view"?: string;
          "shadow-intensity"?: string | number;
          exposure?: string | number;
          "interaction-prompt"?: string;
          loading?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
