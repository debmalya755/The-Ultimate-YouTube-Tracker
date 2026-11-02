import { useState } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: React.ReactNode;
}

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

/**
 * A fully custom select dropdown that escapes the unstyleable native OS menu.
 * Uses floating-ui to position the menu securely, even if the container scrolls.
 */
export default function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "— select —",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        id={id}
        type="button"
        className={`flex items-center justify-between text-left ${className}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={`ml-2 h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-bone" : "text-bone/40"
          }`}
          strokeWidth={1.5}
        />
      </button>

      <AnimatePresence>
        {open && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 100 }}
              {...getFloatingProps()}
              className="w-max min-w-[200px]"
            >
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -2, scale: 0.99, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="custom-select-scroll max-h-60 overflow-y-auto rounded border border-bone/15 bg-ash/95 p-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md"
              >
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-4 rounded-sm px-3 py-2.5 text-left font-mono text-sm transition-colors duration-200 ${
                      active
                        ? "bg-blood/15 text-bone"
                        : "text-bone/70 hover:bg-bone/10 hover:text-bone"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-blood" strokeWidth={2} />}
                  </button>
                );
              })}
            </motion.div>
            </div>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}
