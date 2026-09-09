import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({ label = "Password", value, onChange, autoComplete }: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-300">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete}
          value={value} onChange={(e) => onChange(e.target.value)}
          className="auth-input pr-12" placeholder="Enter your password" />
        <button type="button" onClick={() => setVisible((v) => !v)}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-gray-100">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
