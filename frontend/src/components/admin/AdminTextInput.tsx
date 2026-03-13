import type { InputHTMLAttributes } from "react";

type AdminTextInputProps = InputHTMLAttributes<HTMLInputElement>;

export default function AdminTextInput(props: AdminTextInputProps) {
  return <input className="admin-input" {...props} />;
}
