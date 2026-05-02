import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons-extra";

// Context to provide a portal container inside the sheet overlay
const PortalContainerContext = createContext<HTMLDivElement | null>(null);

/** Hook to get the portal container element for rendering dropdowns/popovers */
export function usePortalContainer() {
  return useContext(PortalContainerContext);
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  position = "bottom",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  position?: "bottom" | "center";
}) {
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);

  // Callback ref to capture portal container
  const portalRefCb = useCallback((node: HTMLDivElement | null) => {
    setPortalNode(node);
  }, []);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center p-0 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Sheet / Modal */}
      <div
        className={`relative w-full max-h-[92vh] overflow-hidden bg-brand-surface-solid text-brand-text border-t sm:border border-brand-hairline shadow-2xl flex flex-col ${
          position === "bottom"
            ? "rounded-t-[24px] sm:rounded-[24px] sm:max-w-[480px] animate-in slide-in-from-bottom-6 duration-300"
            : "rounded-[24px] max-w-[540px] animate-in zoom-in-95 duration-200"
        }`}
      >
        {/* Drag handle for mobile */}
        {position === "bottom" && (
          <div className="w-10 h-1.5 rounded-full mx-auto mt-3 mb-1 bg-brand-text/10 sm:hidden" />
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-hairline/50">
            <h3 className="text-base font-bold text-brand-text tracking-tight m-0">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-brand-surface-2 text-brand-text-dim hover:text-brand-text transition-colors grid place-items-center"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <PortalContainerContext.Provider value={portalNode}>
            {children}
          </PortalContainerContext.Provider>
        </div>

        {/* Portal target for dropdowns - sits ABOVE the scrollable content but WITHIN the overflow-hidden container */}
        <div ref={portalRefCb} className="absolute inset-0 pointer-events-none z-[101]" />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
