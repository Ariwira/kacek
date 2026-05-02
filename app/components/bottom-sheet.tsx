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
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Only the drag-handle area (pill + header) initiates swipe-to-dismiss.
  // Attaching to the whole sheet caused scroll gestures starting at
  // scrollTop=0 to be intercepted as a dismiss drag instead.
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startTime: number; active: boolean }>({
    startY: 0,
    startTime: 0,
    active: false,
  });
  const currentDragY = useRef(0);

  const portalRefCb = useCallback((node: HTMLDivElement | null) => {
    setPortalNode(node);
  }, []);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Swipe-to-dismiss — drag handle zone only, position="bottom" only
  useEffect(() => {
    if (!open || position !== "bottom") return;
    const handle = dragHandleRef.current;
    if (!handle) return;

    const onTouchStart = (e: TouchEvent) => {
      dragState.current = {
        startY: e.touches[0].clientY,
        startTime: Date.now(),
        active: true,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragState.current.active) return;
      const delta = e.touches[0].clientY - dragState.current.startY;
      if (delta <= 0) return;
      e.preventDefault();
      currentDragY.current = delta;
      setDragY(delta);
      setIsDragging(true);
    };

    const onTouchEnd = () => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      setIsDragging(false);

      const dist = currentDragY.current;
      const elapsed = Math.max(1, Date.now() - dragState.current.startTime);
      const velocity = dist / elapsed;

      if (dist > 80 || (dist > 20 && velocity > 0.5)) {
        onClose();
      }
      currentDragY.current = 0;
      setDragY(0);
    };

    handle.addEventListener("touchstart", onTouchStart, { passive: true });
    handle.addEventListener("touchmove", onTouchMove, { passive: false });
    handle.addEventListener("touchend", onTouchEnd, { passive: true });
    handle.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      handle.removeEventListener("touchstart", onTouchStart);
      handle.removeEventListener("touchmove", onTouchMove);
      handle.removeEventListener("touchend", onTouchEnd);
      handle.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [open, position, onClose]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        style={{ opacity: isDragging ? Math.max(0.2, 1 - dragY / 300) : undefined }}
      />

      {/* Sheet / Modal */}
      <div
        className={`relative w-full max-h-[92vh] overflow-hidden bg-brand-surface-solid text-brand-text border-t sm:border border-brand-hairline shadow-2xl flex flex-col ${
          position === "bottom"
            ? "rounded-t-[24px] sm:rounded-[24px] sm:max-w-[480px] animate-in slide-in-from-bottom-6 duration-300"
            : "rounded-[24px] max-w-[540px] animate-in zoom-in-95 duration-200"
        }`}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Drag handle zone — pill + header, touch-initiated dismiss only from here */}
        <div ref={dragHandleRef} className="touch-none select-none">
          {position === "bottom" && (
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1.5 rounded-full bg-brand-text/10" />
            </div>
          )}

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
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <PortalContainerContext.Provider value={portalNode}>
            {children}
          </PortalContainerContext.Provider>
        </div>

        {/* Portal target for dropdowns */}
        <div ref={portalRefCb} className="absolute inset-0 pointer-events-none z-[101]" />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
