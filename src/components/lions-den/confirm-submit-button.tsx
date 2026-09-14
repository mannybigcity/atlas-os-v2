"use client";

import type { ButtonHTMLAttributes } from "react";

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
};

/** Asks once in the browser before a destroy form posts. Atlas still contacts no one. */
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  onClick,
  type = "submit",
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <button
      {...props}
      type={type}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
