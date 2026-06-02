"use client";
import { forwardRef } from "react";

type Variant = "gold" | "primary" | "dark" | "destructive";

interface Button3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  gold: "btn-3d btn-3d-gold",
  primary: "btn-3d btn-3d-primary",
  dark: "btn-3d btn-3d-dark",
  destructive: "btn-3d btn-3d-destructive",
};

export const Button3D = forwardRef<HTMLButtonElement, Button3DProps>(
  ({ variant = "primary", className = "", children, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`${variantClass[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button3D.displayName = "Button3D";
