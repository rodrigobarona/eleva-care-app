"use client";
import React from "react";
import { useState } from "react";
import { Button, ButtonProps } from "@/components/atoms/button";
import { Copy, CopyCheck, CopyX, Link2 } from "lucide-react";

type CopyState = "idle" | "copied" | "error";

export function CopyEventButton({
  eventSlug,
  username,
  ...buttonProps
}: Omit<ButtonProps, "children" | "onClick"> & {
  eventSlug: string;
  username: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const CopyIcon = getCopyIcon(copyState);
  const ariaLabel = copyState === "copied" 
    ? "Link copied to clipboard" 
    : copyState === "error" 
    ? "Failed to copy link" 
    : "Copy event link";

  return (
    <Button
      {...buttonProps}
      aria-label={ariaLabel}
      onClick={() => {
        navigator.clipboard
          .writeText(`${location.origin}/${username}/${eventSlug}`)
          .then(() => {
            setCopyState("copied");
            setTimeout(() => setCopyState("idle"), 2000);
          })
          .catch(() => {
            setCopyState("error");
            setTimeout(() => setCopyState("idle"), 2000);
          });
      }}
    >
      <CopyIcon className="h-4 w-4" />
    </Button>
  );
}

function getCopyIcon(copyState: CopyState) {
  switch (copyState) {
    case "idle":
      return Link2;
    case "copied":
      return CopyCheck;
    case "error":
      return CopyX;
  }
}
