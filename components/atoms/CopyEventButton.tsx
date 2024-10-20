"user client";
import React from "react";
import { useState } from "react";
import { Button, ButtonProps } from "../ui/button";
import { Copy, CopyCheck, CopyX } from "lucide-react";

type CopyState = "ilde" | "copied" | "error";

export function CopyEventButton({
  eventId,
  clerkUserId,
  ...buttonProps
}: Omit<ButtonProps, "childern" | "onClick"> & {
  eventId: string;
  clerkUserId: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>("ilde");

  const CopyIcon = getCopyIcon(copyState);

  return (
    <Button
      {...buttonProps}
      onClick={() => {
        navigator.clipboard
          .writeText(`${location.origin}/book/${clerkUserId}/${event} `)
          .then(() => {
            setCopyState("copied");
            setTimeout(() => setCopyState("ilde"), 2000);
          })
          .catch(() => {
            setCopyState("error");
            setTimeout(() => setCopyState("ilde"), 2000);
          });
      }}
    >
      <CopyIcon className="size-4 mr-2" />
      {getChildern(copyState)}
    </Button>
  );
}

function getCopyIcon(copyState: CopyState) {
  switch (copyState) {
    case "ilde":
      return Copy;
    case "copied":
      return CopyCheck;
    case "error":
      return CopyX;
  }
}

function getChildern(copyState: CopyState) {
  switch (copyState) {
    case "ilde":
      return "Copy Link";
    case "copied":
      return "Copied!";
    case "error":
      return "Error";
  }
}
