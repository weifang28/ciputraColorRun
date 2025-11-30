"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // Add `fixed-center` so we can pin to center with CSS
      className="toaster fixed-center group"
      // Force red background + white text via CSS variables Sonner consumes
      style={
        {
          "--normal-bg": "#ef4444",        // red background
          "--normal-text": "#ffffff",      // white text
          "--normal-border": "#b91c1c",    // darker red border
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
