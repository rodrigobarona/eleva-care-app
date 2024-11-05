"use client";
import React from "react";
import { useState } from "react";
import { Button, ButtonProps } from "../ui/button";
import { Copy, CopyCheck, CopyX } from "lucide-react";

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

  return (
    <Button
      {...buttonProps}
      onClick={() => {
        navigator.clipboard
          .writeText(`${location.origin}/book/${username}/${eventSlug}`)
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
      <CopyIcon className="size-4 mr-2" />
      {getChildren(copyState)}
    </Button>
  );
}

function getCopyIcon(copyState: CopyState) {
  switch (copyState) {
    case "idle":
      return Copy;
    case "copied":
      return CopyCheck;
    case "error":
      return CopyX;
  }
}

function getChildren(copyState: CopyState) {
  switch (copyState) {
    case "idle":
      return "Copy Link";
    case "copied":
      return "Copied!";
    case "error":
      return "Error";
  }
}
