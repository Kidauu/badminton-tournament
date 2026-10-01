import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "danger-filled";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  iconOnly?: boolean;
  small?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  "danger-filled": "btn-danger-filled",
};

export function Button({ variant = "secondary", icon, iconOnly, small, className, children, ...rest }: ButtonProps) {
  const classes = ["btn", VARIANT_CLASS[variant]];
  if (iconOnly) classes.push("btn-icon");
  if (small) classes.push("btn-small");
  if (className) classes.push(className);

  return (
    <button className={classes.join(" ")} {...rest}>
      {icon}
      {!iconOnly && children}
    </button>
  );
}
