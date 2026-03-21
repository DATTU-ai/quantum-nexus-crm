import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface NotificationPanelProps {
  children: ReactNode;
}

export default function NotificationPanel({ children }: NotificationPanelProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed top-16 right-4 z-[70] w-80">
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>,
    document.body,
  );
}

