"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Whole-number qty field you can clear and type into. Avoids browser number
 * spinners, which force arrow clicks when a default like 1 is already filled.
 */
export const QuantityInput = React.forwardRef<
  HTMLInputElement,
  {
    value: number | undefined | null;
    onChange: (value: number | undefined) => void;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    name?: string;
    id?: string;
    className?: string;
    placeholder?: string;
    autoFocus?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
    "aria-invalid"?: boolean;
  }
>(function QuantityInput(
  {
    value,
    onChange,
    onBlur,
    name,
    id,
    className,
    placeholder = "Qty",
    autoFocus,
    onKeyDown,
    ...rest
  },
  ref,
) {
  return (
    <Input
      ref={ref}
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={cn("tabular", className)}
      value={value == null || Number.isNaN(value) ? "" : String(value)}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "");
        onChange(digits === "" ? undefined : Number(digits));
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      {...rest}
    />
  );
});
