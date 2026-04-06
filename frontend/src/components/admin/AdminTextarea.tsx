import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type AdminTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function AdminTextarea({ className = "", value, ...props }: AdminTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const minHeight = className.includes("settings-textarea--compact-row") ? 52 : 96;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, minHeight)}px`;
  }, [minHeight, value]);

  const nextClassName = `settings-textarea settings-textarea--auto ${className}`.trim();

  return <textarea ref={ref} className={nextClassName} value={value} {...props} />;
}
